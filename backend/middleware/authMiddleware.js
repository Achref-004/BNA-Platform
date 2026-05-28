// ============================================================
// middleware/authMiddleware.js
// ------------------------------------------------------------
// Vérifie qu'une requête HTTP contient un JWT valide.
// Le token doit être passé dans l'en-tête :
//     Authorization: Bearer <token>
// Si OK, on attache le payload décodé à `req.auth` pour les
// middlewares/contrôleurs suivants. Sinon on renvoie 401.
// ============================================================
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "bna-dev-secret-change-me";

/**
 * Middleware Express. Vérifie le JWT dans Authorization.
 * Réponses possibles :
 *   401 "Token manquant"     si l'en-tête est absent
 *   401 "Session expirée"    si le token est expiré
 *   401 "Token invalide"     pour toute autre erreur de signature
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Token manquant." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload; // { sub, email, role, code_structure, iat, exp } Passer des information a autheControllers
    return next();
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });
    }
    return res.status(401).json({ error: "Token invalide." });
  }
}

module.exports = { verifyToken };
