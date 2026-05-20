# ============================================================
# linear_model.py — Régression linéaire sur features temporelles
# ------------------------------------------------------------
# On transforme le temps en indice entier + mois/trimestre.
# Modèle simple, interprétable, souvent compétitif sur tendance.
# ============================================================
from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from metrics import compute_all

logger = logging.getLogger("forecast.linear")


def _build_features(df: pd.DataFrame) -> np.ndarray:
    """Matrice X : indice temporel, mois, trimestre."""
    if "t_idx" in df.columns:
        t = df["t_idx"].astype(float).values.reshape(-1, 1)
    else:
        t = np.arange(len(df), dtype=float).reshape(-1, 1)
    mois = df["mois"].values.reshape(-1, 1)
    trim = df["trimestre"].values.reshape(-1, 1)
    return np.hstack([t, mois, trim])


def fit_predict_linear(
    train_df: pd.DataFrame,
    future_df: pd.DataFrame,
    test_df: pd.DataFrame | None = None,
) -> tuple[np.ndarray, np.ndarray | None, LinearRegression]:
    X_train = _build_features(train_df)
    y_train = train_df["y"].values
    model = LinearRegression()
    model.fit(X_train, y_train)

    test_pred = None
    if test_df is not None and len(test_df) > 0:
        X_test = _build_features(test_df)
        test_pred = model.predict(X_test)

    X_future = _build_features(future_df)
    horizon_pred = model.predict(X_future)
    return horizon_pred, test_pred, model


def evaluate_linear(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    _, test_pred, _ = fit_predict_linear(train_df, test_df, test_df)
    if test_pred is None:
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan}
    return compute_all(test_df["y"].values, test_pred)
