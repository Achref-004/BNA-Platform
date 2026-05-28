# pipeline.py — SARIMA, Random Forest, XGBoost | Hold-out + TimeSeriesSplit

from __future__ import annotations



import json

import logging

import math

from datetime import datetime

from pathlib import Path



import numpy as np

import pandas as pd

from sklearn.model_selection import TimeSeriesSplit



from metrics import compute_all

from models import sarima_model as sarima

from models import tree_model as tree

from preprocessing import normalize_raw_dataframe, preprocess



logger = logging.getLogger("forecast.pipeline")



CV_SPLITS = 5

CV_MIN_TRAIN = 12

CV_LABEL = f"TimeSeriesSplit ({CV_SPLITS} plis)"





def json_safe(value):

    if isinstance(value, dict):

        return {k: json_safe(v) for k, v in value.items()}

    if isinstance(value, list):

        return [json_safe(v) for v in value]

    if isinstance(value, (float, np.floating)):

        v = float(value)

        return None if not math.isfinite(v) else v

    if isinstance(value, (np.integer,)):

        return int(value)

    return value





MODEL_REGISTRY = {

    "SARIMA": {

        "key": "sarima",

        "evaluate": sarima.evaluate,

        "predict_holdout": sarima.predict_holdout,

        "predict_horizon": sarima.predict_horizon,

    },

    "Random Forest": {

        "key": "random_forest",

        "evaluate": tree.rf_evaluate,

        "predict_holdout": tree.rf_predict_holdout,

        "predict_horizon": tree.rf_predict_horizon,

    },

    "XGBoost": {

        "key": "xgboost",

        "evaluate": tree.xgb_evaluate,

        "predict_holdout": tree.xgb_predict_holdout,

        "predict_horizon": tree.xgb_predict_horizon,

    },

}





def load_data_file(path: Path) -> pd.DataFrame:

    path = Path(path)

    if path.suffix.lower() in (".xlsx", ".xls"):

        return normalize_raw_dataframe(pd.read_excel(path))



    last_error = None

    for encoding in ("utf-8-sig", "utf-8", "cp1252", "latin-1"):

        try:

            preview = path.read_text(encoding=encoding)

            sep = "\t" if preview.count("\t") > preview.count(",") else ","

            df = pd.read_csv(path, sep=sep, engine="python", encoding=encoding)

            logger.info("Fichier CSV lu avec l'encodage : %s", encoding)

            return normalize_raw_dataframe(df)

        except UnicodeDecodeError as exc:

            last_error = exc



    raise ValueError(

        "Encodage non reconnu. Enregistrez en CSV UTF-8 ou réexportez depuis le DW. "

        f"Détail : {last_error}"

    )





def temporal_split(df: pd.DataFrame, test_ratio: float = 0.2):

    n = len(df)

    split_idx = int(n * (1 - test_ratio))

    if split_idx < 12:

        split_idx = max(12, n - max(3, int(n * test_ratio)))

    return df.iloc[:split_idx].copy(), df.iloc[split_idx:].copy()





def time_series_split_validation(df: pd.DataFrame, predict_fn, n_splits: int = CV_SPLITS) -> dict:

    """

    Validation croisée temporelle sklearn TimeSeriesSplit.

    Agrège toutes les prédictions OOS pour calculer RMSE / SMAPE globaux.

    """

    n = len(df)

    tscv = TimeSeriesSplit(n_splits=n_splits)

    y_true_all, y_pred_all = [], []



    for fold, (train_idx, test_idx) in enumerate(tscv.split(np.arange(n))):

        if len(train_idx) < CV_MIN_TRAIN or len(test_idx) == 0:

            continue

        train = df.iloc[train_idx].copy()

        test = df.iloc[test_idx].copy()

        try:

            y_pred = predict_fn(train, test)

            y_true = test["y"].astype(float).values

            if len(y_pred) != len(y_true):

                raise ValueError(f"Prédictions {len(y_pred)} vs attendu {len(y_true)}")

            y_true_all.extend(y_true)

            y_pred_all.extend(y_pred)

        except Exception as exc:

            logger.warning("TimeSeriesSplit pli %s : %s", fold, exc)



    if not y_true_all:

        return {"rmse": None, "smape": None}



    return compute_all(np.asarray(y_true_all), np.asarray(y_pred_all))





def _finite(v) -> float:

    try:

        f = float(v)

        return f if np.isfinite(f) else float("nan")

    except (TypeError, ValueError):

        return float("nan")





def pick_best_rmse_for_row(row: dict) -> tuple[float, str, float | None]:

    candidates = []

    rmse_h = _finite(row.get("rmse"))

    if not np.isnan(rmse_h):

        candidates.append((rmse_h, "Hold-out 80/20", _finite(row.get("smape"))))

    rmse_cv = _finite(row.get("rmse_cv"))

    if not np.isnan(rmse_cv):

        candidates.append((rmse_cv, CV_LABEL, _finite(row.get("smape_cv"))))

    if not candidates:

        return float("nan"), "", None

    best = min(candidates, key=lambda x: x[0])

    sm = None if np.isnan(best[2]) else round(best[2], 4)

    return best[0], best[1], sm





def rank_models(comparison_rows: list[dict]) -> list[dict]:

    valid = []

    for row in comparison_rows:

        best_rmse, method, sel_smape = pick_best_rmse_for_row(row)

        if np.isnan(best_rmse):

            continue

        enriched = {**row, "best_rmse": round(best_rmse, 4), "selection_method": method, "selected_smape": sel_smape}

        valid.append(enriched)

    valid.sort(key=lambda x: x["best_rmse"])

    for i, row in enumerate(valid, start=1):

        row["rang"] = i

    return valid





def forecast_next_year(df: pd.DataFrame, best_key: str) -> pd.DataFrame:

    last_year = int(df["ds"].max().year)

    target_year = last_year + 1

    horizon = pd.date_range(f"{target_year}-01-01", f"{target_year}-12-01", freq="MS")



    preds = None

    for cfg in MODEL_REGISTRY.values():

        if cfg["key"] == best_key:

            preds = cfg["predict_horizon"](df, 12)

            break

    if preds is None:

        raise ValueError(f"Modèle inconnu : {best_key}")



    out = pd.DataFrame({"ds": horizon, "montant_prevu": np.maximum(preds, 0.0)})

    out["modele"] = best_key

    out["annee"] = target_year

    return out





def run_full_pipeline(input_path: Path, output_dir: Path) -> dict:

    output_dir = Path(output_dir)

    output_dir.mkdir(parents=True, exist_ok=True)

    log_lines = []



    def log(msg: str):

        logger.info(msg)

        log_lines.append(f"{datetime.utcnow().isoformat()}Z | {msg}")



    log(f"Chargement : {input_path}")

    df, prep_report = preprocess(load_data_file(input_path))

    log(f"Preprocessing OK — {prep_report['rows_final']} mois")



    train_df, test_df = temporal_split(df, 0.2)

    log(

        f"Hold-out 80/20 — train={len(train_df)} ({train_df['ds'].min().date()} → {train_df['ds'].max().date()}), "

        f"test={len(test_df)} ({test_df['ds'].min().date()} → {test_df['ds'].max().date()})"

    )

    log(f"Validation croisée : {CV_LABEL}")



    results = []

    for label, cfg in MODEL_REGISTRY.items():

        log(f"Entraînement / évaluation : {label}")

        try:

            holdout = cfg["evaluate"](train_df, test_df)

            cv = time_series_split_validation(df, cfg["predict_holdout"], n_splits=CV_SPLITS)

            results.append({

                "modele": label,

                "validation": f"Hold-out 80/20 + {CV_LABEL}",

                "rmse": holdout["rmse"],

                "smape": holdout["smape"],

                "rmse_cv": cv["rmse"],

                "smape_cv": cv["smape"],

                "_key": cfg["key"],

            })

        except Exception as exc:

            log(f"ERREUR {label}: {exc}")

            results.append({

                "modele": label,

                "validation": "Échec",

                "rmse": None,

                "smape": None,

                "rmse_cv": None,

                "smape_cv": None,

                "_key": cfg["key"],

                "error": str(exc),

            })



    ranked = rank_models(results)

    best = ranked[0] if ranked else None

    best_key = best["_key"] if best else "xgboost"

    if best:

        log(f"Meilleur modèle : {best['modele']} (RMSE {best['best_rmse']:,.0f} via {best['selection_method']})")



    log("Réentraînement 100 % + prévision 12 mois")

    forecast_df = forecast_next_year(df, best_key)

    target_year = int(forecast_df["annee"].iloc[0]) if len(forecast_df) else None



    comparison_df = pd.DataFrame([

        {

            "Rang": r.get("rang"),

            "Modèle": r["modele"],

            "RMSE_retenu": r.get("best_rmse"),

            "Methode_min": r.get("selection_method"),

            "RMSE_holdout": r.get("rmse"),

            "SMAPE_holdout": r.get("smape"),

            "RMSE_TimeSeriesSplit": r.get("rmse_cv"),

            "SMAPE_TimeSeriesSplit": r.get("smape_cv"),

        }

        for r in ranked

    ])



    comparison_df.to_csv(output_dir / "model_comparison.csv", index=False, encoding="utf-8-sig")

    forecast_df.to_csv(output_dir / "forecast_horizon.csv", index=False, encoding="utf-8-sig")



    with pd.ExcelWriter(output_dir / "forecast_outputs.xlsx", engine="openpyxl") as writer:

        comparison_df.to_excel(writer, sheet_name="Comparaison_Modeles", index=False)

        forecast_df.to_excel(writer, sheet_name="Prevision_horizon", index=False)

        hist = df[["ds", "y", "nb_placements", "taux_moyen", "duree_moyenne"]].rename(columns={"y": "montant_total"})

        hist.to_excel(writer, sheet_name="Historique_Nettoye", index=False)



    summary = {

        "status": "success",

        "generated_at": datetime.utcnow().isoformat() + "Z",

        "preprocessing": prep_report,

        "comparison": [{k: v for k, v in r.items() if not k.startswith("_")} for r in results],

        "comparison_ranked": [{k: v for k, v in r.items() if not k.startswith("_")} for r in ranked],

        "best_model": {

            "name": best["modele"] if best else None,

            "key": best_key,

            "rmse": best["best_rmse"] if best else None,

            "smape": best.get("selected_smape") if best else None,

            "selection_method": best.get("selection_method") if best else None,

        },

        "forecast_target_year": target_year,

        "forecast_preview": forecast_df.assign(ds=forecast_df["ds"].dt.strftime("%Y-%m-%d")).to_dict(orient="records"),

        "chart_data": {

            "history": [

                {"date": row["ds"].strftime("%Y-%m-%d"), "montant": float(row["y"])}

                for _, row in df.iterrows()

            ],

            "forecast": [

                {"date": row["ds"].strftime("%Y-%m-%d"), "montant": float(row["montant_prevu"])}

                for _, row in forecast_df.iterrows()

            ],

            "model_metrics": [

                {

                    "modele": r["modele"],

                    "rmse_holdout": r.get("rmse"),

                    "rmse_timeseries_split": r.get("rmse_cv"),

                    "rmse_best": r.get("best_rmse"),

                    "smape_holdout": r.get("smape"),

                    "smape_timeseries_split": r.get("smape_cv"),

                }

                for r in ranked

            ],

        },

        "files": {

            "model_comparison_csv": "model_comparison.csv",

            "forecast_horizon_csv": "forecast_horizon.csv",

            "forecast_excel": "forecast_outputs.xlsx",

        },

    }



    (output_dir / "results_summary.json").write_text(

        json.dumps(json_safe(summary), ensure_ascii=False, indent=2),

        encoding="utf-8",

    )

    (output_dir / "training_log.txt").write_text("\n".join(log_lines), encoding="utf-8")

    log("Pipeline terminé avec succès")

    return summary

