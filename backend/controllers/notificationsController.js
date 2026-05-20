// ============================================================
// controllers/notificationsController.js
// ------------------------------------------------------------
// Compteurs légers pour la pastille utilisateur/admin (polling SSE
// évité volontairement : EventSource sans en-tête Authorization).
//
// Réponse commune :
// {
//    pendingAdminThreads: number,       // nouveau fil / message user vu par quel admin ?
//                                      // utilisé UNIQUEMENT par rôle Admin
//    unseenAdminReplies: number          // utilisé par collaborateurs hors Admin
// }
// ============================================================
const { mssql, getPool } = require("../config/db");

/** GET /api/notifications/summary (JWT requis ; pas de MCP bloquante ici) */
async function summary(req, res) {
  try {
    const pool    = await getPool();
    const role    = req.auth?.role;
    const pending = {
      unseenAdminReplies: 0,
      pendingAdminThreads: 0,
    };

    if (role === "Admin") {
      const a = await pool.request().query(`
        SELECT CAST(COUNT(DISTINCT p.thread_id) AS INT) AS c
        FROM dbo.MessagePosts p
        WHERE p.sender_role = N'user' AND p.read_by_admin_at IS NULL
      `);
      pending.pendingAdminThreads = a.recordset[0]?.c ?? 0;
    } else {
      const collaborators = ["Agence", "Direction regional", "Direction central"];
      if (collaborators.includes(role)) {
        const u = await pool.request()
          .input("uid", mssql.Int, req.auth.sub)
          .query(`
            SELECT CAST(COUNT(DISTINCT p.thread_id) AS INT) AS c
            FROM dbo.MessagePosts p
            INNER JOIN dbo.MessageThreads t ON t.id = p.thread_id
            WHERE t.user_id = @uid
              AND p.sender_role = N'admin'
              AND p.read_by_user_at IS NULL
          `);
        pending.unseenAdminReplies = u.recordset[0]?.c ?? 0;
      }
    }

    return res.json(pending);
  } catch (err) {
    console.error("notificationsController.summary:", err);
    /** Table absente avant migration SQL : ne pas planter le front entier */
    return res.status(503).json({ error: "Service notification indisponible." });
  }
}

module.exports = { summary };
