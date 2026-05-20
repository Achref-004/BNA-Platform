# ============================================================
# prophet_model.py — Prévision avec Facebook Prophet
# ------------------------------------------------------------
# Prophet modélise tendance + saisonnalité. Adapté aux séries
# mensuelles bancaires avec historique mensuel court.
# ============================================================
from __future__ import annotations

import logging
import warnings

import numpy as np
import pandas as pd

from metrics import compute_all

logger = logging.getLogger("forecast.prophet")
warnings.filterwarnings("ignore", category=FutureWarning)


def _naive_datetime(series_or_index) -> pd.Series:
    """Dates sans fuseau horaire (exigence Prophet)."""
    s = pd.to_datetime(series_or_index)
    if isinstance(s, pd.DatetimeIndex):
        return s.tz_localize(None) if s.tz is not None else s
    if getattr(s.dt, "tz", None) is not None:
        return s.dt.tz_localize(None)
    return s


def fit_predict_prophet(
    train_df: pd.DataFrame,
    horizon_dates: pd.DatetimeIndex,
    test_df: pd.DataFrame | None = None,
) -> tuple[np.ndarray, np.ndarray | None, object]:
    """
    Entraîne Prophet sur train_df (colonnes ds, y).
    Si test_df fourni : retourne prédictions sur la période test.
    Retourne (forecast_horizon, test_predictions, model).
    """
    from prophet import Prophet

    # Prophet exige des noms ds / y sans timezone
    train = train_df[["ds", "y"]].copy()
    train["ds"] = _naive_datetime(train["ds"])
    train = train.sort_values("ds").reset_index(drop=True)

    # Au moins ~2 ans de points mensuels pour une saisonnalité annuelle stable
    n_months = len(train)
    use_yearly = n_months >= 24

    model = Prophet(
        yearly_seasonality=use_yearly,
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="multiplicative",
    )
    model.fit(train)

    test_pred = None
    if test_df is not None and len(test_df) > 0:
        future_test = pd.DataFrame({"ds": _naive_datetime(test_df["ds"])})
        fc_test = model.predict(future_test)
        test_pred = fc_test["yhat"].values

    horizon_pred = np.array([])
    if horizon_dates is not None and len(horizon_dates) > 0:
        future_h = pd.DataFrame({"ds": _naive_datetime(horizon_dates)})
        fc_h = model.predict(future_h)
        horizon_pred = fc_h["yhat"].values

    return horizon_pred, test_pred, model


def evaluate_prophet(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    """Évalue Prophet sur le jeu test (split 80/20)."""
    _, test_pred, _ = fit_predict_prophet(train_df, [], test_df)
    if test_pred is None:
        return {"mae": np.nan, "rmse": np.nan, "mape": np.nan}
    return compute_all(test_df["y"].values, test_pred)
