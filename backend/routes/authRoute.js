// ============================================================
// routes/authRoute.js
// ============================================================
const express = require("express");
const router  = express.Router();

const { login, changePassword, me } = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/login",           login);
router.post("/change-password", verifyToken, changePassword);
router.get ("/me",              verifyToken, me);

module.exports = router;
