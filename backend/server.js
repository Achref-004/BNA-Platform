// ============================================================
// backend/server.js
// ------------------------------------------------------------
// Point d'entrée du serveur Express.
//
//   • monte CORS pour le front (http://localhost:3000)
//   • parse les requêtes JSON (≤ 1 MB)
//   • expose les groupes de routes :
//       /api/auth     → login, fetch me
//       /api/users    → CRUD utilisateurs (Admin)
//       /api/chat     → chatbot IA
//       /api/messages      → messagerie admin/utilisateurs
//       /api/notifications → résumés (pastilles polling)
//   • catch-all 404 + handler d'erreurs global
//
// Lancez le serveur avec :   npm run dev    (ou npm start)
// ============================================================
const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const authRoute          = require("./routes/authRoute");
const userRoute          = require("./routes/userRoute");
const chatRoute          = require("./routes/chatRoute");
const messageRoute       = require("./routes/messageRoute");
const notificationRoute  = require("./routes/notificationRoute");
const forecastRoute      = require("./routes/forecastRoute");
const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares globaux ──────────────────────────────────────
const CORS_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
app.use(cors({
  origin(origin, callback) {
    if (!origin || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origine CORS non autorisée"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

// Healthcheck pratique pour vérifier que l'API tourne
app.get("/api/health", (req, res) => res.json({ ok: true, service: "BNA API" }));

// ── Routes métier ────────────────────────────────────────────
app.use("/api/auth",     authRoute);
app.use("/api/users",    userRoute);
app.use("/api/chat",     chatRoute);
app.use("/api/messages",      messageRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/forecast",      forecastRoute);

// 404 (toute route non matchée)
app.use((req, res) => res.status(404).json({ error: "Route introuvable." }));

// Handler d'erreurs global : tout `next(err)` ou throw async termine ici.
app.use((err, req, res, _next) => {
  console.error("❌ Erreur non gérée:", err);
  res.status(500).json({ error: "Erreur serveur." });
});

app.listen(PORT, () => console.log(`✅ Serveur BNA démarré sur http://localhost:${PORT}`));
