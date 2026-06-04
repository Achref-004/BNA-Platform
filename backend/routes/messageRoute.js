// ============================================================
// routes/messageRoute.js — Messagerie admin ↔ utilisateurs
// ------------------------------------------------------------
// Middlewares : jwt + blocage MCP (excepté aucune MCP sur route auth).
// Ordre des routes VOLONTAIREMENT statique avant toute wildcard.
// ============================================================
const express = require("express");
const router  = express.Router();

const ctrl = require("../controllers/messageController");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ensurePasswordChanged } = require("../middleware/ensurePasswordChanged");

const adminOnly = requireRole("Admin");

router.use(verifyToken, ensurePasswordChanged());

/* ─ Collaborateurs ─ */
router.post("/",                     ctrl.send);
router.get ("/my-threads",           ctrl.listMyThreads);
router.get ("/my-threads/:id",       ctrl.detailMyThread);

/* ─ Administration (routes explicites) ─ */
router.get ("/admin/threads",               adminOnly, ctrl.listAdminThreads);
router.delete("/admin/threads/:id",        adminOnly, ctrl.adminDeleteThread);
router.get ("/admin/threads/:id",           adminOnly, ctrl.detailAdminThread);
router.post ("/admin/threads/:id/reply",    adminOnly, ctrl.adminReply);

module.exports = router;
