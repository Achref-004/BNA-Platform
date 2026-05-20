// ============================================================
// middleware/ensurePasswordChanged.js
// ------------------------------------------------------------
// Refuse tout accès API sensible tant que dbo.Users.must_change_password=1,
// quel que soit l’état désynchronisé du JWT (priorité aux données vivantes DB).
//
// À monter SUR les routes suivant verifyToken (ex : /api/chat, /api/messages,
// création utilisateur hors scope — admins rarement MCP).
//
// La route POST /api/auth/change-password ne doit PAS activer ce middleware.
// ============================================================
const { mssql, getPool } = require("../config/db");

/** @returns {Express.RequestHandler} */
function ensurePasswordChanged() {
  return async function(req, res, next) {
    try {
      const pool = await getPool();
      const r = await pool.request()
        .input("id", mssql.Int, req.auth?.sub)
        .query(`
          SELECT must_change_password
          FROM dbo.Users WHERE id = @id
        `);
      const row = r.recordset[0];
      if (!row) return res.status(401).json({ error: "Utilisateur introuvable." });

      if (Number(row.must_change_password) === 1) {
        return res.status(403).json({
          error: "Vous devez changer votre mot de passe avant de continuer.",
          code: "MUST_CHANGE_PASSWORD",
        });
      }
      return next();
    } catch (err) {
      console.error("ensurePasswordChanged:", err);
      return res.status(500).json({ error: "Erreur serveur." });
    }
  };
}

module.exports = { ensurePasswordChanged };
