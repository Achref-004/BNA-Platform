# sarima_model.py — SARIMA avec auto_arima (pmdarima)
from __future__ import annotations

import logging
import warnings

import numpy as np
import pandas as pd

from metrics import compute_all, inverse_log_amount

logger = logging.getLogger("forecast.sarima")
warnings.filterwarnings("ignore")


def _fit_auto_arima(train_log: np.ndarray):
    import pmdarima as pm

    try:
        model = pm.auto_arima(
            train_log,
            seasonal=True,
            m=12,
            start_p=1,
            start_q=1,
            max_p=3,
            max_q=3,
            start_P=1,
            start_Q=1,
            max_P=2,
            max_Q=2,
            d=None,
            D=None,
            stepwise=True,
            suppress_warnings=True,
            error_action="ignore",
            trace=False,
        )
        return model
    except Exception as exc:
        logger.warning("auto_arima échoué (%s) — fallback SARIMA(1,1,1)(1,1,0,12)", exc)
        return pm.ARIMA(order=(1, 1, 1), seasonal_order=(1, 1, 0, 12)).fit(train_log)


def _forecast_log(model, steps: int) -> np.ndarray:
    fc = model.predict(n_periods=steps, return_conf_int=False)
    return np.asarray(fc, dtype=float).ravel()


def predict_holdout(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    train_log = train_df["y_log"].astype(float).values
    model = _fit_auto_arima(train_log)
    fc_log = _forecast_log(model, len(test_df))
    return inverse_log_amount(fc_log)


def predict_horizon(df: pd.DataFrame, steps: int = 12) -> np.ndarray:
    train_log = df["y_log"].astype(float).values
    model = _fit_auto_arima(train_log)
    fc_log = _forecast_log(model, steps)
    return inverse_log_amount(fc_log)


def evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    y_pred = predict_holdout(train_df, test_df)
    y_true = test_df["y"].astype(float).values
    return compute_all(y_true, y_pred)

