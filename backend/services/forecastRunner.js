// ============================================================
// services/forecastRunner.js — Lance le pipeline Python depuis Node.js
// ------------------------------------------------------------
// Utilise child_process.spawn pour exécuter train_and_predict.py.
// Variables d'environnement :
//   PYTHON_PATH  → exécutable Python (défaut: python)
// ============================================================
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ML_ROOT = path.join(__dirname, "..", "..", "ml-forecast");
const SCRIPT = path.join(ML_ROOT, "train_and_predict.py");
const DEFAULT_OUTPUT = path.join(__dirname, "..", "data", "forecast", "outputs");
const DEFAULT_UPLOAD = path.join(__dirname, "..", "data", "forecast", "uploads");

/** État global simple (un entraînement à la fois par instance serveur). */
let trainingState = {
  status: "idle", // idle | running | success | error
  startedAt: null,
  finishedAt: null,
  message: "",
  lastInput: null,
};

function getPaths() {
  return {
    outputDir: process.env.FORECAST_OUTPUT_DIR || DEFAULT_OUTPUT,
    uploadDir: process.env.FORECAST_UPLOAD_DIR || DEFAULT_UPLOAD,
  };
}

function ensureDirs() {
  const { outputDir, uploadDir } = getPaths();
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  return { outputDir, uploadDir };
}

function getTrainingState() {
  return { ...trainingState };
}

function readSummary() {
  const { outputDir } = getPaths();
  const summaryPath = path.join(outputDir, "results_summary.json");
  if (!fs.existsSync(summaryPath)) return null;
  try {
    const raw = fs.readFileSync(summaryPath, "utf8");
    // Python peut écrire NaN (JSON invalide pour Node) — normaliser en null
    const fixed = raw.replace(/\bNaN\b/g, "null").replace(/\b-Infinity\b/g, "null").replace(/\bInfinity\b/g, "null");
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Exécute le pipeline ML complet.
 * @param {string} inputPath — chemin absolu du CSV/Excel uploadé
 * @returns {Promise<object>}
 */
function runPipeline(inputPath) {
  return new Promise((resolve, reject) => {
    if (trainingState.status === "running") {
      return reject(new Error("Un entraînement est déjà en cours."));
    }

    const pythonBin = process.env.PYTHON_PATH ;
    const { outputDir } = ensureDirs();

    trainingState = {
      status: "running",
      startedAt: new Date().toISOString(),
      finishedAt: null,
      message: "Entraînement des modèles en cours…",
      lastInput: inputPath,
    };

    const args = [
      SCRIPT,
      "--input", path.resolve(inputPath),
      "--output-dir", path.resolve(outputDir),
    ];

    console.log("🐍 Forecast pipeline:", pythonBin, args.join(" "));
//Node excuter la commande dans le CMD :
    const proc = spawn(pythonBin, args, {
      cwd: ML_ROOT,
      env: { ...process.env, PYTHONUTF8: "1" },
    });

    let stderr = "";
    let stdout = "";
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      console.log("[forecast]", text.trim());
    });

    //"close" Python a démarré, puis s'est terminé (bien ou mal)
    proc.on("close", (code) => {
      trainingState.finishedAt = new Date().toISOString();
      const summary = readSummary();
      const ok =
        code === 0
        && (summary?.status === "success" || summary?.best_model?.name);

      if (ok) {
        trainingState.status = "success";
        trainingState.message = "Entraînement terminé.";
        return resolve(summary);
      }

      trainingState.status = "error";
      const stderrTail = stderr.trim().split("\n").slice(-5).join("\n");
      trainingState.message =
        summary?.error
        || (code !== 0 && stderrTail)
        || `Pipeline Python code ${code}`;
      return reject(new Error(trainingState.message));
    });


    //"error" Python n'a pas pu démarrer du tout
    proc.on("error", (err) => {
      trainingState.status = "error";
      trainingState.finishedAt = new Date().toISOString();
      trainingState.message = err.message;
      reject(err);
    });
  });
}

module.exports = {
  getPaths,
  ensureDirs,
  getTrainingState,
  readSummary,
  runPipeline,
  ML_ROOT,
  SCRIPT,
};


//spawn(python, args)
 //      │
 //      ├── proc.stdout → logs en temps réel dans la console
  //     ├── proc.stderr → erreurs accumulées dans stderr
   //    │
    //   ├── proc.on("error") → Python n'a pas démarré 
     //  │        └── reject(err)
     //  │
      //c.on("close", code)
          //      ├── code=0 + summary ok → resolve(summary) 
            //    └── sinon → reject(new Error(...)) 