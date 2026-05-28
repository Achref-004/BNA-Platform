// ============================================================
// controllers/forecastController.js — API Prévision AI (Forecasting)
// ------------------------------------------------------------
// Endpoints :
//   POST /api/forecast/upload      → dépose CSV/Excel
//   GET  /api/forecast/train       → SARIMA, Random Forest, XGBoost
//   GET  /api/forecast/results     → tableau comparatif + meilleur modèle
//   GET  /api/forecast/predict → prévisions (12 mois année suivante)
//   GET  /api/forecast/status      → état entraînement
// ============================================================
const path = require("path");
const fs = require("fs");
const {
  getPaths,
  ensureDirs,
  getTrainingState,
  readSummary,
  runPipeline,
} = require("../services/forecastRunner");

/** POST /api/forecast/upload */
async function upload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Fichier CSV ou Excel requis." });
    }
    return res.json({
      ok: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    });
  } catch (err) {
    console.error("forecastController.upload:", err);
    return res.status(500).json({ error: "Erreur lors de l'upload." });
  }
}

/** GET /api/forecast/train — entraîne sur le dernier fichier uploadé */
async function train(req, res) {
  try {
    const { uploadDir } = ensureDirs();
    const explicit = req.query.file;

    let inputPath;
    if (explicit) {
      inputPath = path.join(uploadDir, path.basename(explicit));
    } else {
      const files = fs.readdirSync(uploadDir)
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(uploadDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);
      if (!files.length) {
        return res.status(400).json({
          error: "Aucun fichier uploadé. Utilisez POST /api/forecast/upload d'abord.",
        });
      }
      inputPath = path.join(uploadDir, files[0].name);
    }

    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: "Fichier source introuvable." });
    }

    const summary = await runPipeline(inputPath);
    return res.json({ ok: true, summary });
  } catch (err) {
    console.error("forecastController.train:", err);
    const summary = readSummary();
    return res.status(500).json({
      error: err.message || "Échec de l'entraînement.",
      summary,
      state: getTrainingState(),
    });
  }
}

/** GET /api/forecast/results */
function results(req, res) {
  const summary = readSummary();
  if (!summary) {
    return res.status(404).json({
      error: "Aucun résultat. Lancez GET /api/forecast/train après un upload.",
    });
  }
  if (summary.status === "error") {
    return res.status(422).json({ error: summary.error, summary });
  }
  return res.json({
    comparison: summary.comparison || [],
    comparison_ranked: summary.comparison_ranked || summary.comparison || [],
    best_model: summary.best_model,
    preprocessing: summary.preprocessing,
    chart_data: summary.chart_data || null,
    generated_at: summary.generated_at,
    state: getTrainingState(),
  });
}

/** GET /api/forecast/predict — aperçu prévisions (année suivant l'historique) */
function predict(req, res) {
  const { outputDir } = getPaths();
  const csvPath = path.join(outputDir, "forecast_horizon.csv");
  const summary = readSummary();

  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({
      error: "Prévisions absentes. Lancez l'entraînement d'abord.",
    });
  }

  const preview = summary?.forecast_preview || [];

  return res.json({
    best_model: summary?.best_model,
    preview,
    chart_data: summary?.chart_data || null,
    forecast_target_year: summary?.forecast_target_year ?? null,
  });
}

/** GET /api/forecast/status */
function status(req, res) {
  const state = getTrainingState();
  const summary = readSummary();
  return res.json({ state, has_results: Boolean(summary?.status === "success") });
}

module.exports = {
  upload,
  train,
  results,
  predict,
  status,
};
