# preprocessing.py — Nettoyage données DW mensuelles BNA

from __future__ import annotations



import logging

from typing import Tuple



import numpy as np

import pandas as pd

from sklearn.preprocessing import StandardScaler



logger = logging.getLogger("forecast.preprocessing")



DATE_CANDIDATES = ("date_mois", "date", "ds", "datetime", "periode", "period")

MOIS_NUM_CANDIDATES = ("mois", "month", "num_mois")

TRIMESTRE_CANDIDATES = ("trimestre", "quarter", "trim")

AMOUNT_CANDIDATES = ("montant_total", "montant", "amount", "y", "valeur", "volume")

NB_CANDIDATES = ("nb_placements", "nb_placement", "nombre_placements", "nb")

TAUX_CANDIDATES = ("taux_moyen", "taux", "taux_moy", "v_taux")

DUREE_CANDIDATES = ("duree_moyenne", "duree", "duree_moy", "nb_jours")





def _find_col(df: pd.DataFrame, candidates: tuple[str, ...]) -> str | None:

    cols_lower = {str(c).lower().strip(): c for c in df.columns}

    for cand in candidates:

        if cand in cols_lower:

            return cols_lower[cand]

    return None





def normalize_raw_dataframe(df: pd.DataFrame) -> pd.DataFrame:

    if df is None or df.empty:

        return df

    out = df.copy()

    out.columns = [str(c).strip().lower().replace(" ", "_") for c in out.columns]

    return out





def detect_dw_columns(df: pd.DataFrame) -> dict:

    date_col = _find_col(df, DATE_CANDIDATES)

    amount_col = _find_col(df, AMOUNT_CANDIDATES)

    if not date_col or not amount_col:

        raise ValueError(

            "Colonnes obligatoires : DATE_MOIS (ou date) et MONTANT_TOTAL (ou montant)."

        )

    return {

        "date": date_col,

        "montant": amount_col,

        "nb": _find_col(df, NB_CANDIDATES),

        "taux": _find_col(df, TAUX_CANDIDATES),

        "duree": _find_col(df, DUREE_CANDIDATES),

        "annee": _find_col(df, ("annee", "year")),

        "mois_num": _find_col(df, MOIS_NUM_CANDIDATES),

        "trimestre": _find_col(df, TRIMESTRE_CANDIDATES),

    }





def _treat_outliers_iqr(series: pd.Series) -> tuple[pd.Series, int]:

    q1, q3 = series.quantile(0.25), series.quantile(0.75)

    iqr = q3 - q1

    if iqr <= 0:

        return series, 0

    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr

    mask = (series < lower) | (series > upper)

    n = int(mask.sum())

    if n:

        series = series.copy()

        series.loc[mask] = series.median()

    return series, n





def preprocess(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, dict]:

    report: dict = {"steps": [], "warnings": []}

    df = normalize_raw_dataframe(df_raw)

    cols = detect_dw_columns(df)



    keep = [cols["date"], cols["montant"]]

    rename = {cols["date"]: "ds", cols["montant"]: "y"}

    for key, std_name in [("nb", "nb_placements"), ("taux", "taux_moyen"), ("duree", "duree_moyenne")]:

        if cols[key]:

            keep.append(cols[key])

            rename[cols[key]] = std_name

        else:

            report["warnings"].append(f"Colonne optionnelle absente : {std_name}")



    calendar_rename = {}

    if cols["annee"]:

        keep.append(cols["annee"])

        calendar_rename[cols["annee"]] = "annee"

    if cols["mois_num"] and cols["mois_num"] != cols["date"]:

        keep.append(cols["mois_num"])

        calendar_rename[cols["mois_num"]] = "mois_cal"

    if cols["trimestre"]:

        keep.append(cols["trimestre"])

        calendar_rename[cols["trimestre"]] = "trimestre_dw"



    df = df[keep].rename(columns={**rename, **calendar_rename})

    report["steps"].append("Colonnes DW normalisées")



    if "annee" in df.columns and "mois_cal" in df.columns:

        an = pd.to_numeric(df["annee"], errors="coerce").astype("Int64")

        mo = pd.to_numeric(df["mois_cal"], errors="coerce").astype("Int64")

        df["ds"] = pd.to_datetime(

            an.astype(str) + "-" + mo.astype(str).str.zfill(2) + "-01",

            errors="coerce",

        )

    else:

        df["ds"] = pd.to_datetime(df["ds"], errors="coerce", dayfirst=False)

        df["ds"] = df["ds"].dt.to_period("M").dt.to_timestamp()



    df = df.dropna(subset=["ds"]).drop_duplicates(subset=["ds"], keep="last").sort_values("ds")

    df = df.reset_index(drop=True)



    for c in ["y", "nb_placements", "taux_moyen", "duree_moyenne"]:

        if c in df.columns:

            df[c] = pd.to_numeric(df[c], errors="coerce")

    for c in ("nb_placements", "taux_moyen", "duree_moyenne"):

        if c not in df.columns:

            df[c] = np.nan



    numeric_cols = [c for c in ("y", "nb_placements", "taux_moyen", "duree_moyenne") if c in df.columns]

    full_idx = pd.date_range(df["ds"].min(), df["ds"].max(), freq="MS")

    df = df.set_index("ds").sort_index().reindex(full_idx)

    missing = int(df["y"].isna().sum()) if "y" in df.columns else 0



    if numeric_cols:

        df[numeric_cols] = (

            df[numeric_cols]

            .apply(pd.to_numeric, errors="coerce")

            .interpolate(method="linear", limit_direction="both")

            .bfill()

            .ffill()

        )

    for col in ("annee", "mois_cal", "trimestre_dw"):

        if col in df.columns:

            df[col] = pd.to_numeric(df[col], errors="coerce").ffill().bfill()



    df = df.reset_index().rename(columns={"index": "ds"})

    if missing:

        report["steps"].append(f"Mois manquants comblés : {missing}")



    df["y"], n_out = _treat_outliers_iqr(df["y"])

    if n_out:

        report["warnings"].append(f"{n_out} outliers sur MONTANT_TOTAL (IQR)")

    df["y"] = df["y"].clip(lower=0)



    for feat in ("nb_placements", "taux_moyen", "duree_moyenne"):

        if df[feat].notna().sum() >= 4:

            df[feat], _ = _treat_outliers_iqr(df[feat])



    df["y_log"] = np.log1p(df["y"])

    if "mois_cal" in df.columns:

        df["mois"] = pd.to_numeric(df["mois_cal"], errors="coerce").fillna(df["ds"].dt.month).astype(int)

    else:

        df["mois"] = df["ds"].dt.month

    if "trimestre_dw" in df.columns:

        df["trimestre"] = pd.to_numeric(df["trimestre_dw"], errors="coerce").fillna(df["ds"].dt.quarter).astype(int)

    else:

        df["trimestre"] = df["ds"].dt.quarter



    exog = ["nb_placements", "taux_moyen", "duree_moyenne"]

    scaled = StandardScaler().fit_transform(df[exog].astype(float))

    for i, col in enumerate(exog):

        df[f"{col}_norm"] = scaled[:, i]



    report["rows_final"] = len(df)

    report["period_start"] = str(df["ds"].min().date()) if len(df) else None

    report["period_end"] = str(df["ds"].max().date()) if len(df) else None



    if len(df) < 18:

        raise ValueError(f"Série trop courte ({len(df)} mois). Minimum : 18 mois.")



    logger.info("Preprocessing OK — %s mois", len(df))

    return df, report

