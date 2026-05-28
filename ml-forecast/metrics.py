# metrics.py — RMSE + SMAPE (montants en dinars)

from __future__ import annotations



import numpy as np





def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:

    y_true = np.asarray(y_true, dtype=float)

    y_pred = np.asarray(y_pred, dtype=float)

    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))





def smape(y_true: np.ndarray, y_pred: np.ndarray, eps: float = 1e-8) -> float:

    y_true = np.asarray(y_true, dtype=float)

    y_pred = np.asarray(y_pred, dtype=float)

    denom = np.abs(y_true) + np.abs(y_pred) + eps

    return float(100.0 * np.mean(2.0 * np.abs(y_true - y_pred) / denom))





def compute_all(y_true: np.ndarray, y_pred: np.ndarray) -> dict:

    r, s = rmse(y_true, y_pred), smape(y_true, y_pred)

    return {

        "rmse": round(r, 4) if np.isfinite(r) else None,

        "smape": round(s, 4) if np.isfinite(s) else None,

    }





def inverse_log_amount(y_log: np.ndarray) -> np.ndarray:

    return np.expm1(np.asarray(y_log, dtype=float))

