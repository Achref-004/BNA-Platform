# Module AI Forecasting BNA — Documentation complète

## Architecture

```
mon-dashboard/
├── ml-forecast/                 # Python — ML pipeline
│   ├── train_and_predict.py     # CLI (appelé par Node)
│   ├── pipeline.py              # Orchestration
│   ├── preprocessing.py         # Nettoyage + features
│   ├── metrics.py               # RMSE + SMAPE
│   ├── models/
│   │   ├── sarima_model.py
│   │   ├── tree_model.py        # Random Forest + XGBoost
│   │   └── ml_features.py
│   ├── outputs/                 # (gitignored — généré en dev)
│   ├── data/sample_placements.csv
│   └── requirements.txt
├── backend/
│   ├── routes/forecastRoute.js
│   ├── controllers/forecastController.js
│   ├── services/forecastRunner.js
│   └── data/forecast/
│       ├── uploads/             # Fichiers déposés
│       └── outputs/             # CSV, Excel, JSON
└── frontend/
    └── src/components/Forecast.jsx
```

## Flux de données

1. L'utilisateur upload un **CSV/Excel** (`date`, `montant`) via React.
2. Node enregistre le fichier dans `backend/data/forecast/uploads/`.
3. Node lance `python ml-forecast/train_and_predict.py`.
4. Python : preprocessing → 3 modèles (SARIMA, RF, XGB) → comparaison RMSE/SMAPE → prévision 12 mois → exports.
5. React affiche le tableau comparatif, les graphiques et l’aperçu des prévisions.

## Modèles

| Modèle | Idée | Forces |
|--------|------|--------|
| **SARIMA** | Série temporelle saisonnière (auto_arima) | Standard banque / économétrie |
| **Random Forest** | Arbres + variables DW + lags | Non-linéaire, robuste |
| **XGBoost** | Boosting + variables DW + lags | Souvent le meilleur sur données tabulaires |

## Métriques

- **RMSE** : erreur en TND — utilisée pour **classer** les modèles (plus bas = meilleur).
- **SMAPE** : erreur relative en % (plus bas = mieux) — affichée en complément.

Validation :
- **Hold-out 80/20** temporel (pas de mélange aléatoire).
- **TimeSeriesSplit** (sklearn) : 5 plis, fenêtre d’entraînement croissante.

Le modèle retenu est celui avec le **plus petit RMSE** entre hold-out et TimeSeriesSplit.

## Installation

### 1. Python

```bash
cd ml-forecast
python -m venv venv
# Windows
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Backend Node

```bash
cd backend
npm install
```

Dans `backend/.env` :

```env
PYTHON_PATH=C:\chemin\vers\venv\Scripts\python.exe
PORT=5000
```

### 3. Frontend

```bash
cd frontend
npm install
```

## Exécution

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm start
```

Ouvrir **http://localhost:3000/prevision** → onglet **Pipeline ML** → uploader le fichier exemple → **Lancer l'entraînement**.

### Test CLI Python seul

```bash
python ml-forecast/train_and_predict.py ^
  --input ml-forecast/data/sample_placements.csv ^
  --output-dir backend/data/forecast/outputs
```

## API REST (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/forecast/upload` | Upload `file` (multipart) |
| GET | `/api/forecast/train` | Lance le pipeline sur le dernier upload |
| GET | `/api/forecast/results` | Tableau comparatif + meilleur modèle |
| GET | `/api/forecast/predict` | Aperçu prévisions (année suivant l’historique) |
| GET | `/api/forecast/status` | État entraînement |

Les fichiers CSV/Excel sont toujours générés côté serveur dans `backend/data/forecast/outputs/` (usage interne du pipeline), sans téléchargement via l’API web.

## Format des données

| Colonne | Exemple | Obligatoire |
|---------|---------|-------------|
| date | YYYY-MM-DD (mensuel) | Oui |
| montant | 1250000 | Oui |

Alias acceptés : `ds`, `amount`, `y`, `valeur`, etc.

## Visualisations

L’onglet **Visualisations** affiche les graphiques (comparaison RMSE, historique + prévision) à partir de `chart_data` dans `results_summary.json`.

L’année prévue est calculée automatiquement : **dernière année des données + 1**.
