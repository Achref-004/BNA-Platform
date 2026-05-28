# ============================================================
# ml_features.py — Features communes Random Forest & XGBoost
# Variables DW + lags temporels sur log1p(MONTANT_TOTAL)
# ============================================================
from __future__ import annotations

import numpy as np
import pandas as pd

from metrics import inverse_log_amount

# Colonnes explicatives pour les modèles à arbres
FEATURE_COLS = [
    "mois",
    "trimestre",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_12",
    "rolling_mean_3",
    "rolling_mean_6",
    "taux_moyen_norm",
    "duree_moyenne_norm",
    "nb_placements_norm",
]


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    """Construit les retards et moyennes glissantes à partir de y_log."""
    out = df.copy()
    y = out["y_log"].astype(float)
    out["lag_1"] = y.shift(1)
    out["lag_2"] = y.shift(2)
    out["lag_3"] = y.shift(3)
    out["lag_12"] = y.shift(12)
    out["rolling_mean_3"] = y.shift(1).rolling(3, min_periods=1).mean()
    out["rolling_mean_6"] = y.shift(1).rolling(6, min_periods=1).mean()
    return out.dropna(subset=FEATURE_COLS + ["y_log"]).reset_index(drop=True)


def predict_holdout_tree(train_df: pd.DataFrame, test_df: pd.DataFrame, model) -> np.ndarray:
    """Prédiction hold-out : réentraînement implicite via historique réel mois par mois."""
    train_feat = build_feature_frame(train_df)
    if len(train_feat) < 6:
        raise ValueError("Pas assez de lignes après création des lags (min. 6).")

    model.fit(train_feat[FEATURE_COLS].values, train_feat["y_log"].values)

    preds_log = []
    for i in range(len(test_df)):
        history = pd.concat([train_df, test_df.iloc[:i]], ignore_index=True)
        row_feat = build_feature_frame(history)
        x = row_feat[FEATURE_COLS].iloc[-1:].values
        preds_log.append(float(model.predict(x)[0]))

    return inverse_log_amount(np.array(preds_log))


def predict_horizon_tree(df: pd.DataFrame, model, steps: int = 12) -> np.ndarray:
    """Prévision récursive des 12 mois de l'année suivante."""
    feat = build_feature_frame(df)
    if len(feat) < 6:
        raise ValueError("Pas assez de lignes après création des lags (min. 6).")

    model.fit(feat[FEATURE_COLS].values, feat["y_log"].values)

    history = df.copy()
    preds_log = []
    last_ds = df["ds"].max()

    for _ in range(steps):
        next_ds = last_ds + pd.DateOffset(months=len(preds_log) + 1)
        stub = {
            "ds": next_ds,
            "y": np.nan,
            "y_log": np.nan,
            "mois": next_ds.month,
            "trimestre": next_ds.quarter,
            "nb_placements": history["nb_placements"].iloc[-1],
            "taux_moyen": history["taux_moyen"].iloc[-1],
            "duree_moyenne": history["duree_moyenne"].iloc[-1],
            "nb_placements_norm": history["nb_placements_norm"].iloc[-1],
            "taux_moyen_norm": history["taux_moyen_norm"].iloc[-1],
            "duree_moyenne_norm": history["duree_moyenne_norm"].iloc[-1],
        }
        extended = pd.concat([history, pd.DataFrame([stub])], ignore_index=True)
        x = build_feature_frame(extended)[FEATURE_COLS].iloc[-1:].values
        pred_log = float(model.predict(x)[0])
        preds_log.append(pred_log)
        stub["y_log"] = pred_log
        stub["y"] = float(inverse_log_amount(np.array([pred_log]))[0])
        history = pd.concat([history, pd.DataFrame([stub])], ignore_index=True)

    return inverse_log_amount(np.array(preds_log))
