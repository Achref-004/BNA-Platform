# ============================================================
# metrics.py — Métriques d'évaluation des modèles de prévision
# ------------------------------------------------------------
# MAE  : erreur absolue moyenne (même unité que la cible)
# RMSE : racine de l'erreur quadratique moyenne (pénalise les gros écarts)
# MAPE : erreur en pourcentage (comparable entre séries)
# ============================================================
from __future__ import annotations

import numpy as np


def mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Error — plus bas = mieux."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean(np.abs(y_true - y_pred)))


def rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Root Mean Squared Error — sensible aux valeurs extrêmes."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Mean Absolute Percentage Error (%).
    On évite la division par zéro en ignorant les y_true ≈ 0.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    mask = np.abs(y_true) > 1e-8
    if mask.sum() == 0:
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)


def compute_all(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    """Retourne un dictionnaire { mae, rmse, mape } pour un jeu de prédictions."""
    return {
        "mae": round(mae(y_true, y_pred), 4),
        "rmse": round(rmse(y_true, y_pred), 4),
        "mape": round(mape(y_true, y_pred), 4),
    }
