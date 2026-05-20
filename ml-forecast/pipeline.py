# ============================================================
# pipeline.py — Orchestration ML : entraînement, comparaison, prévision année suivante
# ------------------------------------------------------------
# Flux :
#   1. Charger CSV/Excel
#   2. preprocess()
#   3. Split temporel 80/20
#   4. TimeSeriesSplit (validation croisée)
#   5. Entraîner Prophet, ARIMA, Régression linéaire
#   6. Tableau comparatif MAE / RMSE / MAPE
#   7. Sélection automatique du meilleur modèle
#   8. Prédiction mensuelle (12 mois de l'année suivante)
#   9. Export CSV + Excel + JSON
# ============================================================
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit

from metrics import compute_all
from models.arima_model import evaluate_arima, fit_predict_arima
from models.linear_model import evaluate_linear, fit_predict_linear
from models.prophet_model import evaluate_prophet, fit_predict_prophet
from preprocessing import normalize_raw_dataframe, preprocess
logger = logging.getLogger("forecast.pipeline")

MODEL_NAMES = ("Prophet", "ARIMA", "Régression Linéaire")


def load_data_file(path: Path) -> pd.DataFrame:
    """
    Charge un fichier CSV ou Excel.
    Gère les CSV sans ligne d'en-tête (date,montant sur chaque ligne).
    """
    path = Path(path)
    if path.suffix.lower() in (".xlsx", ".xls"):
        df = pd.read_excel(path)
        return normalize_raw_dataframe(df)

    # Essai 1 : avec en-tête
    df = pd.read_csv(path, sep=None, engine="python")
    df = normalize_raw_dataframe(df)
    try:
        from preprocessing import detect_columns
        detect_columns(df)
        return df
    except ValueError:
        pass

    # Essai 2 : sans en-tête (deux colonnes date + montant)
    df = pd.read_csv(path, header=None, names=["date", "montant"], sep=None, engine="python")
    return normalize_raw_dataframe(df)


def temporal_split(df: pd.DataFrame, test_ratio: float = 0.2):
    """Split 80/20 sans mélange aléatoire (respect de l'ordre temporel)."""
    n = len(df)
    split_idx = int(n * (1 - test_ratio))
    if split_idx < 6:
        split_idx = max(6, n - 3)
    train = df.iloc[:split_idx].copy()
    test = df.iloc[split_idx:].copy()
    return train, test


def cross_validate_metrics(train_df: pd.DataFrame, model_key: str, n_splits: int = 3) -> dict:
    """
    TimeSeriesSplit sur la partie train uniquement.
    Retourne la moyenne MAE/RMSE/MAPE sur les plis.
    """
    tscv = TimeSeriesSplit(n_splits=min(n_splits, max(2, len(train_df) // 4)))
    fold_metrics = []

    for train_idx, val_idx in tscv.split(train_df):
        tr = train_df.iloc[train_idx]
        val = train_df.iloc[val_idx]
        if len(val) < 2:
            continue
        try:
            if model_key == "prophet":
                m = evaluate_prophet(tr, val)
            elif model_key == "arima":
                m = evaluate_arima(tr, val)
            else:
                m = evaluate_linear(tr, val)
            fold_metrics.append(m)
        except Exception as exc:
            logger.warning("CV fold failed %s: %s", model_key, exc)

    if not fold_metrics:
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan}

    return {
        "mae": round(float(np.nanmean([f["mae"] for f in fold_metrics])), 4),
        "rmse": round(float(np.nanmean([f["rmse"] for f in fold_metrics])), 4),
        "mape": round(float(np.nanmean([f["mape"] for f in fold_metrics])), 4),
    }


def _finite_metric(v) -> float:
    if v is None:
        return float("nan")
    try:
        f = float(v)
        return f if np.isfinite(f) else float("nan")
    except (TypeError, ValueError):
        return float("nan")


def pick_best_mape_for_row(row: dict) -> tuple[float, str, float, float]:
    """
    Pour un modèle, retient le MAPE minimal entre hold-out et TimeSeriesSplit.
    Retourne (best_mape, méthode_retenue, mae_associe, rmse_associe).
    """
    candidates = []
    mape_h = _finite_metric(row.get("mape"))
    if not np.isnan(mape_h):
        candidates.append((
            mape_h,
            "Hold-out 80/20",
            _finite_metric(row.get("mae")),
            _finite_metric(row.get("rmse")),
        ))
    mape_cv = _finite_metric(row.get("mape_cv"))
    if not np.isnan(mape_cv):
        candidates.append((
            mape_cv,
            "TimeSeriesSplit",
            _finite_metric(row.get("mae_cv")),
            _finite_metric(row.get("rmse_cv")),
        ))
    if not candidates:
        return float("nan"), "", float("nan"), float("nan")
    best = min(candidates, key=lambda x: x[0])
    return best[0], best[1], best[2], best[3]


def rank_models(comparison_rows: list[dict]) -> list[dict]:
    """
    Classe les modèles par le plus petit MAPE parmi hold-out ET TimeSeriesSplit.
    Chaque modèle est jugé sur son meilleur score des deux méthodes.
    """
    valid = []
    for row in comparison_rows:
        best_mape, method, sel_mae, sel_rmse = pick_best_mape_for_row(row)
        if np.isnan(best_mape):
            continue
        enriched = {**row}
        enriched["best_mape"] = round(best_mape, 4)
        enriched["selection_method"] = method
        enriched["selected_mae"] = None if np.isnan(sel_mae) else round(sel_mae, 4)
        enriched["selected_rmse"] = None if np.isnan(sel_rmse) else round(sel_rmse, 4)
        valid.append(enriched)
    valid.sort(key=lambda x: (x["best_mape"], x.get("selected_mae") or 0))
    for i, row in enumerate(valid, start=1):
        row["rang"] = i
    return valid


def explain_best(best: dict, ranked: list[dict]) -> str:
    """Texte pédagogique : choix du modèle au MAPE minimal (hold-out ou CV)."""
    if not best:
        return "Aucun modèle n'a pu être évalué correctement."
    others = [r for r in ranked if r["modele"] != best["modele"]]
    method = best.get("selection_method", "—")
    parts = [
        f"Le modèle « {best['modele']} » est retenu car il affiche le MAPE le plus faible "
        f"({best['best_mape']} %), obtenu avec la validation « {method} » "
        f"(meilleur score entre hold-out 80/20 et TimeSeriesSplit).",
    ]
    if best.get("selected_mae") is not None:
        parts.append(f"Pour cette méthode : MAE = {best['selected_mae']}, RMSE = {best['selected_rmse']}.")
    if others:
        delta = round(others[0]["best_mape"] - best["best_mape"], 2)
        parts.append(
            f"Il devance « {others[0]['modele']} » d'environ {delta} points de MAPE (critère retenu)."
        )
    return " ".join(parts)


def forecast_next_year(df: pd.DataFrame, best_key: str) -> pd.DataFrame:
    """Prédit les 12 mois de l'année calendaire suivant la dernière date historique."""
    last_year = int(df["ds"].max().year)
    target_year = last_year + 1
    horizon = pd.date_range(f"{target_year}-01-01", f"{target_year}-12-01", freq="MS")
    future_feat = pd.DataFrame({"ds": horizon})
    future_feat["annee"] = future_feat["ds"].dt.year
    future_feat["mois"] = future_feat["ds"].dt.month
    future_feat["trimestre"] = future_feat["ds"].dt.quarter
    future_feat["jour"] = future_feat["ds"].dt.day

    if best_key == "prophet":
        preds, _, _ = fit_predict_prophet(df, horizon, None)
    elif best_key == "arima":
        preds, _, _ = fit_predict_arima(df, 12, None)
    else:
        combined = pd.concat([
            df[["ds", "y", "mois", "trimestre", "jour"]],
            future_feat.assign(y=np.nan),
        ], ignore_index=True)
        combined["t_idx"] = np.arange(len(combined))
        train_part = combined.iloc[: len(df)].copy()
        future_part = combined.iloc[len(df) :].copy()
        preds, _, _ = fit_predict_linear(train_part, future_part, None)

    out = future_feat.copy()
    out["montant_prevu"] = np.maximum(np.asarray(preds, dtype=float), 0.0)
    out["modele"] = best_key
    out["annee"] = target_year
    return out


def run_full_pipeline(input_path: Path, output_dir: Path) -> dict:
    """
    Point d'entrée principal du pipeline ML.
    Écrit tous les fichiers dans output_dir et retourne le résumé JSON.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    log_lines = []
    def log(msg: str):
        logger.info(msg)
        log_lines.append(f"{datetime.utcnow().isoformat()}Z | {msg}")

    log(f"Chargement : {input_path}")
    df_raw = load_data_file(input_path)
    df, prep_report = preprocess(df_raw)

    log(f"Preprocessing OK — {prep_report['rows_final']} mois")

    train_df, test_df = temporal_split(df, 0.2)
    log(f"Split 80/20 — train={len(train_df)}, test={len(test_df)}")

    # ── Évaluation hold-out 80/20 ─────────────────────────────
    results = []
    model_keys = {
        "Prophet": "prophet",
        "ARIMA": "arima",
        "Régression Linéaire": "linear",
    }

    for label, key in model_keys.items():
        log(f"Entraînement / évaluation : {label}")
        try:
            if key == "prophet":
                holdout = evaluate_prophet(train_df, test_df)
            elif key == "arima":
                holdout = evaluate_arima(train_df, test_df)
            else:
                holdout = evaluate_linear(train_df, test_df)
            cv = cross_validate_metrics(train_df, key)
            results.append({
                "modele": label,
                "validation": "Hold-out 80/20 + TimeSeriesSplit",
                "mae": holdout["mae"],
                "rmse": holdout["rmse"],
                "mape": holdout["mape"],
                "mae_cv": cv["mae"],
                "rmse_cv": cv["rmse"],
                "mape_cv": cv["mape"],
                "_key": key,
            })
        except Exception as exc:
            log(f"ERREUR {label}: {exc}")
            results.append({
                "modele": label,
                "validation": "Échec",
                "mae": None,
                "rmse": None,
                "mape": None,
                "_key": key,
                "error": str(exc),
            })

    ranked = rank_models(results)
    best = ranked[0] if ranked else None
    best_key = best["_key"] if best else "linear"
    explanation = explain_best(best, ranked)

    log(
        f"Meilleur modèle : {best['modele'] if best else 'N/A'}"
        + (f" (MAPE {best['best_mape']}% via {best['selection_method']})" if best else "")
    )

    # ── Prévision année suivante (12 mois) ────────────────────
    forecast_df = forecast_next_year(df, best_key)
    target_year = int(forecast_df["annee"].iloc[0]) if len(forecast_df) else None
    log(f"Prévision générée — 12 mois (année cible : {target_year})")

    # ── Exports ───────────────────────────────────────────────
    comparison_df = pd.DataFrame([
        {
            "Rang": r.get("rang"),
            "Modèle": r["modele"],
            "MAPE_retenu": r.get("best_mape"),
            "Methode_MAPE_min": r.get("selection_method"),
            "MAE_holdout_80_20": r.get("mae"),
            "RMSE_holdout_80_20": r.get("rmse"),
            "MAPE_holdout_80_20": r.get("mape"),
            "MAE_TimeSeriesSplit": r.get("mae_cv"),
            "RMSE_TimeSeriesSplit": r.get("rmse_cv"),
            "MAPE_TimeSeriesSplit": r.get("mape_cv"),
        }
        for r in ranked
    ])

    comparison_df.to_csv(output_dir / "model_comparison.csv", index=False, encoding="utf-8-sig")
    forecast_df.to_csv(output_dir / "forecast_horizon.csv", index=False, encoding="utf-8-sig")

    excel_path = output_dir / "forecast_outputs.xlsx"
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        comparison_df.to_excel(writer, sheet_name="Comparaison_Modeles", index=False)
        forecast_df.to_excel(writer, sheet_name="Prevision_horizon", index=False)
        export_hist = df[["ds", "y"]].copy()
        export_hist = export_hist.rename(columns={"y": "montant"})
        export_hist.to_excel(writer, sheet_name="Historique_Nettoye", index=False)

    summary = {
        "status": "success",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "preprocessing": prep_report,
        # Tous les modèles (y compris échecs) pour l'UI ; le classement reste sur ranked
        "comparison": [
            {k: v for k, v in r.items() if not k.startswith("_")}
            for r in results
        ],
        "comparison_ranked": [
            {k: v for k, v in r.items() if not k.startswith("_")}
            for r in ranked
        ],
        "best_model": {
            "name": best["modele"] if best else None,
            "key": best_key,
            "mape": best["best_mape"] if best else None,
            "mae": best.get("selected_mae") if best else None,
            "rmse": best.get("selected_rmse") if best else None,
            "selection_method": best.get("selection_method") if best else None,
        },
        "explanation": explanation,
        "forecast_target_year": target_year,
        "forecast_preview": forecast_df.head(12).assign(
            ds=forecast_df["ds"].dt.strftime("%Y-%m-%d")
        ).to_dict(orient="records"),
        "chart_data": {
            "history": [
                {"date": row["ds"].strftime("%Y-%m-%d"), "montant": float(row["y"])}
                for _, row in df.iterrows()
            ],
            "forecast": [
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "montant": float(row["montant_prevu"]),
                }
                for _, row in forecast_df.iterrows()
            ],
            "model_mape": [
                {
                    "modele": r["modele"],
                    "mape_holdout": r.get("mape"),
                    "mape_cv": r.get("mape_cv"),
                    "mape_best": r.get("best_mape"),
                }
                for r in ranked
            ],
        },
        "files": {
            "model_comparison_csv": "model_comparison.csv",
            "forecast_horizon_csv": "forecast_horizon.csv",
            "forecast_excel": "forecast_outputs.xlsx",
        },
        "training_log": log_lines,
    }

    (output_dir / "results_summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "training_log.txt").write_text("\n".join(log_lines), encoding="utf-8")

    log("Pipeline terminé avec succès")
    return summary
