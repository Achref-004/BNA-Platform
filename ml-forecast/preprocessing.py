# ============================================================
# preprocessing.py — Nettoyage et enrichissement des séries temporelles
# ------------------------------------------------------------
# Étapes pédagogiques :
#   1. Détection des colonnes date / montant
#   2. Suppression des doublons
#   3. Conversion datetime + tri chronologique
#   4. Gestion des valeurs manquantes (interpolation)
#   5. Détection d'anomalies (IQR)
#   6. Vérification des montants négatifs
#   7. Création de features : année, mois, trimestre, jour
# ============================================================
from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger("forecast.preprocessing")

# Noms de colonnes acceptés (insensible à la casse)
DATE_CANDIDATES = ("date", "ds", "datetime", "jour", "periode", "period", "mois")
VALUE_CANDIDATES = ("montant", "amount", "y", "valeur", "value", "encours", "volume", "ca")


def _parse_as_date(series: pd.Series) -> pd.Series:
    """Tente de convertir une colonne en dates (plusieurs formats courants)."""
    return pd.to_datetime(series.astype(str).str.strip(), errors="coerce", dayfirst=False)


def _looks_like_date_value(val) -> bool:
    """True si une valeur ressemble à une date (ex. YYYY-MM-DD)."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return False
    return pd.notna(pd.to_datetime(str(val).strip(), errors="coerce"))


def _looks_like_amount_value(val) -> bool:
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return False
    try:
        float(str(val).replace(" ", "").replace(",", ""))
        return True
    except ValueError:
        return False


def normalize_raw_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Adapte les fichiers sans en-tête ou avec la 1ʳᵉ ligne prise comme noms de colonnes.

    Formats acceptés :
      • date,montant + ligne d'en-tête
      • YYYY-MM-DD,montant (sans en-tête)
      • deux colonnes quelconques si la 1ʳᵉ = dates et la 2ᵉ = nombres
    """
    if df is None or df.empty:
        return df

    out = df.copy()

    # Cas fréquent : pandas a utilisé la 1ʳᵉ ligne de données comme noms de colonnes
    if out.shape[1] == 2:
        c0, c1 = out.columns[0], out.columns[1]
        if _looks_like_date_value(c0) and _looks_like_amount_value(c1):
            header_row = pd.DataFrame([[c0, c1]], columns=out.columns)
            out = pd.concat([header_row, out], ignore_index=True)
            out.columns = ["date", "montant"]
            logger.info("En-tête absent détecté : 1ʳᵉ ligne réintégrée comme donnée.")
            return out

    # Deux colonnes sans noms reconnus : détecter date vs montant par le contenu
    if out.shape[1] >= 2:
        left, right = out.iloc[:, 0], out.iloc[:, 1]
        left_dates = _parse_as_date(left).notna().sum()
        right_dates = _parse_as_date(right).notna().sum()
        n = max(len(out), 1)

        if left_dates >= n * 0.7:
            out = out.iloc[:, :2].copy()
            out.columns = ["date", "montant"]
            return out
        if right_dates >= n * 0.7:
            out = out.iloc[:, :2].copy()
            out.columns = ["montant", "date"]
            out = out[["date", "montant"]]
            return out

    # Colonnes 0 / 1 (header=None)
    if list(out.columns[:2]) == [0, 1] or str(out.columns[0]) == "0":
        out = out.iloc[:, :2].copy()
        out.columns = ["date", "montant"]
        return out

    return out


def detect_columns(df: pd.DataFrame) -> Tuple[str, str]:
    """
    Trouve automatiquement la colonne date et la colonne montant.
    Lève ValueError si impossible (message explicite pour l'étudiant).
    """
    cols_lower = {c.lower().strip(): c for c in df.columns}

    date_col = None
    for cand in DATE_CANDIDATES:
        if cand in cols_lower:
            date_col = cols_lower[cand]
            break
    if date_col is None:
        for c in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[c]) or "date" in c.lower():
                date_col = c
                break

    value_col = None
    for cand in VALUE_CANDIDATES:
        if cand in cols_lower:
            value_col = cols_lower[cand]
            break
    if value_col is None:
        numeric = [c for c in df.columns if c != date_col and pd.api.types.is_numeric_dtype(df[c])]
        if numeric:
            value_col = numeric[0]

    if not date_col or not value_col:
        raise ValueError(
            "Colonnes introuvables. Fournissez au minimum : une colonne date "
            f"({', '.join(DATE_CANDIDATES)}) et une colonne montant "
            f"({', '.join(VALUE_CANDIDATES)})."
        )
    return date_col, value_col


def preprocess(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, dict]:
    """
    Pipeline complet de préparation.
    Retourne (df_propre, rapport_dict) pour traçabilité dans les logs JSON.
    """
    report = {"steps": [], "warnings": []}
    df = normalize_raw_dataframe(df_raw.copy())
    date_col, value_col = detect_columns(df)
    report["date_column"] = date_col
    report["value_column"] = value_col

    # ── 1. Ne garder que date + montant ───────────────────────
    df = df[[date_col, value_col]].rename(columns={date_col: "ds", value_col: "y"})
    report["steps"].append("Sélection colonnes date (ds) et montant (y)")

    # ── 2. Suppression des doublons ───────────────────────────
    n_before = len(df)
    df = df.drop_duplicates(subset=["ds"], keep="last")
    report["steps"].append(f"Doublons supprimés : {n_before - len(df)}")

    # ── 3. Conversion datetime ────────────────────────────────
    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    invalid_dates = df["ds"].isna().sum()
    if invalid_dates:
        report["warnings"].append(f"{invalid_dates} dates invalides supprimées")
        df = df.dropna(subset=["ds"])
    report["steps"].append("Conversion datetime (ds)")

    # ── 4. Tri chronologique ──────────────────────────────────
    df = df.sort_values("ds").reset_index(drop=True)
    report["steps"].append("Tri chronologique ascendant")

    # ── 5. Montant numérique + valeurs manquantes ─────────────
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    missing_y = df["y"].isna().sum()
    if missing_y:
        df["y"] = df["y"].interpolate(method="linear").bfill().ffill()
        report["steps"].append(f"Valeurs manquantes interpolées : {missing_y}")
    else:
        report["steps"].append("Aucune valeur manquante sur y")

    # ── 6. Agrégation mensuelle ───────────────────────────────
    df = df.set_index("ds").resample("MS")["y"].sum().reset_index()
    report["steps"].append("Agrégation mensuelle (somme par mois)")

    # ── 7. Détection d'anomalies (IQR sur y) ──────────────────
    q1, q3 = df["y"].quantile(0.25), df["y"].quantile(0.75)
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    outliers = (df["y"] < lower) | (df["y"] > upper)
    n_out = int(outliers.sum())
    if n_out:
        median = df["y"].median()
        df.loc[outliers, "y"] = median
        report["warnings"].append(f"{n_out} anomalies remplacées par la médiane")
    report["steps"].append("Détection anomalies (méthode IQR)")

    # ── 8. Valeurs négatives ──────────────────────────────────
    neg = (df["y"] < 0).sum()
    if neg:
        report["warnings"].append(f"{neg} montants négatifs détectés → valeur absolue")
        df["y"] = df["y"].abs()
    report["steps"].append("Vérification montants négatifs")

    # ── 9. Features temporelles ───────────────────────────────
    df["annee"] = df["ds"].dt.year
    df["mois"] = df["ds"].dt.month
    df["trimestre"] = df["ds"].dt.quarter
    df["jour"] = df["ds"].dt.day
    report["steps"].append("Features créées : annee, mois, trimestre, jour")

    report["rows_final"] = len(df)
    report["period_start"] = str(df["ds"].min().date()) if len(df) else None
    report["period_end"] = str(df["ds"].max().date()) if len(df) else None

    if len(df) < 12:
        raise ValueError(
            f"Série trop courte après nettoyage ({len(df)} mois). "
            "Fournissez au moins 12 mois de données historiques."
        )

    logger.info("Preprocessing terminé : %s lignes", len(df))
    return df, report
