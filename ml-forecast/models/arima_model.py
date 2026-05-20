# ============================================================
# arima_model.py — Prévision ARIMA (statsmodels)
# ------------------------------------------------------------
# ARIMA(p,d,q) : modèle classique pour séries stationnaires /
# différenciées. Bon baseline sur données mensuelles régulières.
# ============================================================
from __future__ import annotations

import logging
import warnings

import numpy as np
import pandas as pd

from metrics import compute_all

logger = logging.getLogger("forecast.arima")
warnings.filterwarnings("ignore")


def fit_predict_arima(
    train_df: pd.DataFrame,
    n_forecast: int,
    test_df: pd.DataFrame | None = None,
) -> tuple[np.ndarray, np.ndarray | None, object]:
    """
    Ajuste ARIMA(1,1,1) par défaut (simple et pédagogique).
    n_forecast : nombre de pas à prédire (horizon ou longueur test).
    """
    from statsmodels.tsa.arima.model import ARIMA

    y_train = train_df["y"].astype(float).values
    model = ARIMA(y_train, order=(1, 1, 1))
    fitted = model.fit()

    test_pred = None
    if test_df is not None and len(test_df) > 0:
        # Prévision multi-pas depuis la fin du train
        fc = fitted.forecast(steps=len(test_df))
        test_pred = np.asarray(fc)

    horizon_pred = np.asarray(fitted.forecast(steps=n_forecast))
    return horizon_pred, test_pred, fitted


def evaluate_arima(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    _, test_pred, _ = fit_predict_arima(train_df, len(test_df), test_df)
    if test_pred is None:
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan}
    return compute_all(test_df["y"].values, test_pred)
