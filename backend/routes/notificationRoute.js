// ============================================================
// routes/notificationRoute.js — compteurs de messagerie
// ------------------------------------------------------------
const express = require("express");
const router  = express.Router();

const { summary } = require("../controllers/notificationsController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/summary", verifyToken, summary);

module.exports = router;
