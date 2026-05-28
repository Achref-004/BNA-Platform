# ============================================================
# tree_model.py — Random Forest & XGBoost (features DW + lags)
# ============================================================
from __future__ import annotations

import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

from metrics import compute_all
from models.ml_features import predict_holdout_tree, predict_horizon_tree

warnings.filterwarnings("ignore")


def _random_forest() -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )


def _xgboost() -> XGBRegressor:
    return XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        objective="reg:squarederror",
        random_state=42,
    )


def _evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame, factory) -> dict:
    y_pred = predict_holdout_tree(train_df, test_df, factory())
    return compute_all(test_df["y"].astype(float).values, y_pred)


# --- Random Forest ---

def rf_predict_holdout(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    return predict_holdout_tree(train_df, test_df, _random_forest())


def rf_predict_horizon(df: pd.DataFrame, steps: int = 12) -> np.ndarray:
    return predict_horizon_tree(df, _random_forest(), steps)


def rf_evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    return _evaluate(train_df, test_df, _random_forest)


# --- XGBoost ---

def xgb_predict_holdout(train_df: pd.DataFrame, test_df: pd.DataFrame) -> np.ndarray:
    return predict_holdout_tree(train_df, test_df, _xgboost())


def xgb_predict_horizon(df: pd.DataFrame, steps: int = 12) -> np.ndarray:
    return predict_horizon_tree(df, _xgboost(), steps)


def xgb_evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    return _evaluate(train_df, test_df, _xgboost)

