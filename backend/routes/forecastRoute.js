// ============================================================
// routes/forecastRoute.js — Routes /api/forecast/*
// ------------------------------------------------------------
// Protégées par JWT + changement de mot de passe obligatoire.
// Upload limité à 15 Mo (CSV / Excel).
// ============================================================
const express = require("express");
const multer = require("multer");
const path = require("path");
const { verifyToken } = require("../middleware/authMiddleware");
const { ensurePasswordChanged } = require("../middleware/ensurePasswordChanged");
const forecastController = require("../controllers/forecastController");
const { ensureDirs } = require("../services/forecastRunner");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const { uploadDir } = ensureDirs();
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (!ok) return cb(new Error("Format accepté : .csv, .xlsx, .xls"));
    cb(null, true);
  },
});

router.use(verifyToken, ensurePasswordChanged());

router.post("/upload", upload.single("file"), forecastController.upload);
router.get("/train", forecastController.train);
router.get("/results", forecastController.results);
router.get("/predict", forecastController.predict);
router.get("/status", forecastController.status);

module.exports = router;
