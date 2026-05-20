// ============================================================
// controllers/messageController.js — Messagerie admin ↔ utilisateurs
// ------------------------------------------------------------
// Modèle données : MessageThreads (+ user_id propriétaire) + MessagePosts
// avec sender_role ∈ { user, admin } et suivis lecture
// (`read_by_admin_at` pour les posts utilisateurs, `read_by_user_at`
// pour les posts admin).
//
// Statuts fonctionnels utilisateur :
//   • envoyé → dernier mouvement côté user non lu par admin
//   • lu      → messages user vus admin, aucune réponse admin après
//   • répondu → au moins un message admin (réponse présente dans le fil)
//   + champ booléen has_unseen_admin_reply pour la pastille utilisateur.
//
// Toutes les routes sensibles suivent verifyToken + (pour non-MCP users)
// `ensurePasswordChanged` monté depuis messageRoute/chatRoute/server.
// ============================================================
const { mssql, getPool } = require("../config/db");
const { sendUserReplyReceivedEmail } = require("../services/emailService");

/** Rôles pouvant créer ou enrichir une conversation utilisateur→admin */
const SENDER_ROLES = ["Agence", "Direction regional", "Direction central"];

const SUBJECT_MAX = 200;
const BODY_MAX    = 8000;

/* ── Statut liste utilisateur ───────────────────────────────── */

/** @typedef {{last_sender:string, user_has_unread_admin:number|boolean, pending_user_seen_by_admin:number|boolean, thread_has_admin_reply:number|boolean}} ThreadAgg */

/** @returns {{ status_label:string, has_unseen_admin_reply:boolean }} */
function deriveUserStatuses(row) {
  const last = row.last_sender;
  const unreadAdminReply = Boolean(Number(row.user_has_unread_admin || 0));
  const pendingSeenByAdmin = Boolean(Number(row.pending_user_seen_by_admin || 0));
  const threadHasAdmin = Boolean(Number(row.thread_has_admin_reply || 0));

  if (!threadHasAdmin) {
    if (pendingSeenByAdmin)
      return { status_label: "envoye", has_unseen_admin_reply: false };

    /** Admin a tout lu mais n’a encore rien envoyé → « vu » pour l’utilisateur */
    return { status_label: "lu", has_unseen_admin_reply: false };
  }

  /** Il existe au moins une réponse admin dans le fil */
  if (last === "admin")
    return { status_label: "repondu", has_unseen_admin_reply: unreadAdminReply };

  /** Dernier message = utilisateur après qu’un admin se soit exprimé */
  return {
    status_label: pendingSeenByAdmin ? "envoye" : "lu",
    has_unseen_admin_reply: unreadAdminReply,
  };
}

/* ── POST nouveau message OU suite de conversation ─────────── */

async function send(req, res) {
  try {
    if (req.auth?.role === "Admin") {
      return res.status(403).json({ error: "Les administrateurs n’envoient pas de message via cette entrée ; utilisez la réponse depuis la boîte de réception." });
    }
    if (!SENDER_ROLES.includes(req.auth?.role)) {
      return res.status(403).json({ error: "Rôle non autorisé." });
    }

    const pool = await getPool();
    const uRes = await pool.request()
      .input("id", mssql.Int, req.auth.sub)
      .query("SELECT id, nom, prenom, email, role, statut FROM dbo.Users WHERE id = @id");
    const u = uRes.recordset[0];
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable." });
    if ((u.statut || "").toLowerCase() !== "actif") {
      return res.status(403).json({ error: "Compte désactivé." });
    }

    const { thread_id: threadIdRaw, sujet, message } = req.body || {};

    let threadId = threadIdRaw == null || threadIdRaw === ""
      ? null
      : parseInt(threadIdRaw, 10);

    if (threadId != null && !Number.isInteger(threadId)) {
      return res.status(400).json({ error: "thread_id invalide." });
    }

    const bodyTxt = typeof message === "string" ? message.trim() : "";

    /** Nouveau fil : sujet requis */
    if (threadId == null) {
      const sub = typeof sujet === "string" ? sujet.trim() : "";
      if (sub.length < 3 || sub.length > SUBJECT_MAX) {
        return res.status(400).json({ error: `Sujet requis (3 à ${SUBJECT_MAX} caractères).` });
      }
      if (bodyTxt.length < 2 || bodyTxt.length > BODY_MAX) {
        return res.status(400).json({ error: `Message requis (2 à ${BODY_MAX} caractères).` });
      }

      const insT = await pool.request()
        .input("uid", mssql.Int, u.id)
        .input("subject", mssql.NVarChar(200), sub)
        .query(`
          INSERT INTO dbo.MessageThreads (user_id, subject)
          OUTPUT inserted.id AS thread_id
          VALUES (@uid, @subject)
        `);
      threadId = insT.recordset[0].thread_id;
    } else {
      const own = await pool.request()
        .input("tid", mssql.Int, threadId)
        .input("uid", mssql.Int, u.id)
        .query("SELECT id FROM dbo.MessageThreads WHERE id = @tid AND user_id = @uid");
      if (!own.recordset[0])
        return res.status(403).json({ error: "Fil introuvable ou non autorisé." });

      if (bodyTxt.length < 2 || bodyTxt.length > BODY_MAX) {
        return res.status(400).json({ error: `Message requis (2 à ${BODY_MAX} caractères).` });
      }
    }

    const insP = await pool.request()
      .input("tid", mssql.Int, threadId)
      .input("body", mssql.NVarChar(mssql.MAX), bodyTxt)
      .query(`
        INSERT INTO dbo.MessagePosts (thread_id, sender_role, body)
        OUTPUT inserted.id AS post_id
        VALUES (@tid, N'user', @body)
      `);

    await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`UPDATE dbo.MessageThreads SET updated_at = SYSUTCDATETIME() WHERE id = @tid`);

    return res.status(201).json({
      ok: true,
      thread_id: threadId,
      post_id: insP.recordset[0]?.post_id ?? null,
    });
  } catch (err) {
    console.error("messageController.send:", err);
    return res.status(500).json({ error: "Erreur lors de l’envoi." });
  }
}

/* ── Utilisateur : liste ses fils ──────────────────────────── */

async function listMyThreads(req, res) {
  try {
    const pool = await getPool();

    /** Agrégats par fil en une passe */
    const r = await pool.request()
      .input("uid", mssql.Int, req.auth.sub)
      .query(`
        SELECT t.id AS thread_id, t.subject, t.updated_at, t.created_at,
          ls.sender_role AS last_sender,
          (
            SELECT CAST(CASE WHEN EXISTS (
              SELECT 1 FROM dbo.MessagePosts px
              WHERE px.thread_id = t.id AND px.sender_role = N'admin'
            ) THEN 1 ELSE 0 END AS BIT)
          ) AS thread_has_admin_reply,
          (
            SELECT CAST(CASE WHEN EXISTS (
              SELECT 1 FROM dbo.MessagePosts pu
              WHERE pu.thread_id = t.id AND pu.sender_role = N'admin' AND pu.read_by_user_at IS NULL
            ) THEN 1 ELSE 0 END AS BIT)
          ) AS user_has_unread_admin,
          (
            SELECT CAST(CASE WHEN EXISTS (
              SELECT 1 FROM dbo.MessagePosts pus
              WHERE pus.thread_id = t.id AND pus.sender_role = N'user'
                AND pus.read_by_admin_at IS NULL
            ) THEN 1 ELSE 0 END AS BIT)
          ) AS pending_user_seen_by_admin
        FROM dbo.MessageThreads t
        OUTER APPLY (
          SELECT TOP 1 sender_role
          FROM dbo.MessagePosts p WHERE p.thread_id = t.id
          ORDER BY p.created_at DESC, p.id DESC
        ) AS ls(sender_role)
        WHERE t.user_id = @uid
        ORDER BY t.updated_at DESC, t.id DESC
      `);

    const items = r.recordset.map(row => {
      const { status_label, has_unseen_admin_reply } = deriveUserStatuses(row);
      return {
        thread_id:          row.thread_id,
        subject:            row.subject,
        updated_at:         row.updated_at,
        created_at:         row.created_at,
        last_sender:        row.last_sender,
        status_label,
        has_unseen_admin_reply,
      };
    });

    return res.json({ items, total: items.length });
  } catch (err) {
    console.error("messageController.listMyThreads:", err);
    return res.status(500).json({ error: "Erreur liste conversations." });
  }
}

async function detailMyThread(req, res) {
  try {
    const threadId = parseInt(req.params.id, 10);
    if (!Number.isInteger(threadId)) return res.status(400).json({ error: "ID invalide." });

    const pool = await getPool();

    const tRow = await pool.request()
      .input("tid", mssql.Int, threadId)
      .input("uid", mssql.Int, req.auth.sub)
      .query("SELECT * FROM dbo.MessageThreads WHERE id=@tid AND user_id=@uid");
    const th = tRow.recordset[0];
    if (!th) return res.status(404).json({ error: "Fil introuvable." });

    /** Marquer toutes réponses admin comme lues côté user */
    await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        UPDATE dbo.MessagePosts
        SET read_by_user_at = SYSUTCDATETIME()
        WHERE thread_id = @tid AND sender_role = N'admin' AND read_by_user_at IS NULL
      `);

    const postsRes = await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        SELECT id, sender_role AS sender, body, created_at,
          read_by_admin_at, read_by_user_at
        FROM dbo.MessagePosts
        WHERE thread_id = @tid
        ORDER BY created_at ASC, id ASC
      `);

    return res.json({
      thread: {
        id:       th.id,
        subject:  th.subject,
        created_at: th.created_at,
        updated_at: th.updated_at,
      },
      posts: postsRes.recordset,
    });
  } catch (err) {
    console.error("messageController.detailMyThread:", err);
    return res.status(500).json({ error: "Erreur détail conversation." });
  }
}

/* ── Admin : inbox ─────────────────────────────────────────── */

async function adminUnreadThreadsCount(req, res) {
  try {
    const pool = await getPool();
    const row = await pool.request().query(`
      SELECT CAST(COUNT(DISTINCT p.thread_id) AS INT) AS unread
      FROM dbo.MessagePosts p
      WHERE p.sender_role = N'user' AND p.read_by_admin_at IS NULL
    `);
    return res.json({ unread: row.recordset[0]?.unread || 0 });
  } catch (err) {
    console.error("messageController.adminUnreadThreadsCount:", err);
    return res.status(500).json({ error: "Erreur." });
  }
}

async function listAdminThreads(req, res) {
  try {
    const {
      search = "", role = "", page = 1, pageSize = 12, sort = "updated_desc",
    } = req.query;

    const p   = Math.max(parseInt(page, 10) || 1, 1);
    const ps  = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 80);
    const off = (p - 1) * ps;

    const orderClause = sort === "updated_asc"
      ? "t.updated_at ASC, t.id ASC"
      : "t.updated_at DESC, t.id DESC";

    const pool = await getPool();
    const request = pool.request()
      .input("search", mssql.NVarChar(200), `%${search}%`)
      .input("role", mssql.VarChar(50), role || null)
      .input("off", mssql.Int, off)
      .input("ps", mssql.Int, ps);

    const whereExtra = `
      AND (@search = N'%' OR t.subject LIKE @search OR u.email LIKE @search OR u.nom LIKE @search OR u.prenom LIKE @search)
      AND (@role IS NULL OR u.role = @role)
    `;

    const countRes = await request.query(`
      SELECT COUNT(*) AS total
      FROM dbo.MessageThreads t
      INNER JOIN dbo.Users u ON u.id = t.user_id
      WHERE 1=1 ${whereExtra}
    `);
    const total = countRes.recordset[0].total;

    const dataRes = await pool.request()
      .input("search", mssql.NVarChar(200), `%${search}%`)
      .input("role", mssql.VarChar(50), role || null)
      .input("off", mssql.Int, off)
      .input("ps", mssql.Int, ps)
      .query(`
        SELECT t.id AS thread_id, t.subject, t.updated_at,
          u.id AS user_id, u.email, u.role, u.nom, u.prenom,
          ls.sender_role AS last_sender,
          (
            SELECT CAST(CASE WHEN EXISTS (
              SELECT 1 FROM dbo.MessagePosts pu
              WHERE pu.thread_id = t.id AND pu.sender_role = N'user' AND pu.read_by_admin_at IS NULL
            ) THEN 1 ELSE 0 END AS BIT)
          ) AS needs_attention
        FROM dbo.MessageThreads t
        INNER JOIN dbo.Users u ON u.id = t.user_id
        OUTER APPLY (
          SELECT TOP 1 sender_role
          FROM dbo.MessagePosts p WHERE p.thread_id = t.id
          ORDER BY p.created_at DESC, p.id DESC
        ) AS ls(sender_role)
        WHERE 1=1 ${whereExtra}
        ORDER BY ${orderClause}
        OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY
      `);

    return res.json({
      total,
      page: p,
      pageSize: ps,
      pages: Math.ceil(total / ps) || 1,
      items: dataRes.recordset.map(row => ({
        thread_id:   row.thread_id,
        subject:     row.subject,
        updated_at:  row.updated_at,
        needs_attention: Number(row.needs_attention) === 1,
        participant: {
          id: row.user_id,
          nom: row.nom,
          prenom: row.prenom,
          email: row.email,
          role: row.role,
        },
        last_sender: row.last_sender,
      })),
    });
  } catch (err) {
    console.error("messageController.listAdminThreads:", err);
    return res.status(500).json({ error: "Erreur boîte de réception." });
  }
}

async function detailAdminThread(req, res) {
  try {
    const threadId = parseInt(req.params.id, 10);
    if (!Number.isInteger(threadId)) return res.status(400).json({ error: "ID invalide." });

    const pool = await getPool();

    const tRow = await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        SELECT t.*, u.email, u.role, u.nom, u.prenom
        FROM dbo.MessageThreads t
        INNER JOIN dbo.Users u ON u.id = t.user_id
        WHERE t.id = @tid
      `);
    const th = tRow.recordset[0];
    if (!th) return res.status(404).json({ error: "Fil introuvable." });

    await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        UPDATE dbo.MessagePosts SET read_by_admin_at = SYSUTCDATETIME()
        WHERE thread_id = @tid AND sender_role = N'user' AND read_by_admin_at IS NULL
      `);

    const postsRes = await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        SELECT id, sender_role AS sender, body, created_at,
               read_by_admin_at, read_by_user_at
        FROM dbo.MessagePosts WHERE thread_id = @tid
        ORDER BY created_at ASC, id ASC
      `);

    return res.json({
      thread: {
        id: th.id,
        subject: th.subject,
        user: {
          id: th.user_id,
          nom: th.nom,
          prenom: th.prenom,
          email: th.email,
          role: th.role,
        },
        created_at: th.created_at,
        updated_at: th.updated_at,
      },
      posts: postsRes.recordset,
    });
  } catch (err) {
    console.error("messageController.detailAdminThread:", err);
    return res.status(500).json({ error: "Erreur détail fil." });
  }
}

async function adminReply(req, res) {
  try {
    const threadId = parseInt(req.params.id, 10);
    if (!Number.isInteger(threadId)) return res.status(400).json({ error: "ID invalide." });

    const { message } = req.body || {};
    const bodyTxt = typeof message === "string" ? message.trim() : "";
    if (bodyTxt.length < 2 || bodyTxt.length > BODY_MAX) {
      return res.status(400).json({ error: `Réponse requise (2 à ${BODY_MAX} caractères).` });
    }

    const pool = await getPool();

    const tRow = await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        SELECT t.id, t.subject, t.user_id, u.email, u.prenom
        FROM dbo.MessageThreads t
        INNER JOIN dbo.Users u ON u.id = t.user_id
        WHERE t.id=@tid
      `);
    const th = tRow.recordset[0];
    if (!th) return res.status(404).json({ error: "Fil introuvable." });

    await pool.request()
      .input("tid", mssql.Int, threadId)
      .input("body", mssql.NVarChar(mssql.MAX), bodyTxt)
      .query(`
        INSERT INTO dbo.MessagePosts (thread_id, sender_role, body)
        VALUES (@tid, N'admin', @body)

        UPDATE dbo.MessageThreads SET updated_at = SYSUTCDATETIME() WHERE id = @tid
      `);

    /** Email asynchrone (ne bloque pas la réponse HTTP) */
    setImmediate(async () => {
      try {
        await sendUserReplyReceivedEmail({
          toEmail: th.email,
          recipientPrenom: th.prenom,
          threadSubject: th.subject,
          replyPreview: bodyTxt,
          messagesUrlOverride: `${(process.env.FRONTEND_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")}/messagerie`,
        });
      } catch (e) {
        console.warn("email reply notify:", e?.message || e);
      }
    });

    const lastPost = await pool.request()
      .input("tid", mssql.Int, threadId)
      .query(`
        SELECT TOP 1 id, sender_role AS sender, body, created_at
        FROM dbo.MessagePosts WHERE thread_id=@tid
        ORDER BY id DESC
      `);

    return res.status(201).json({ post: lastPost.recordset[0] });
  } catch (err) {
    console.error("messageController.adminReply:", err);
    return res.status(500).json({ error: "Erreur envoi réponse." });
  }
}

async function adminDeleteThread(req, res) {
  try {
    const threadId = parseInt(req.params.id, 10);
    if (!Number.isInteger(threadId)) return res.status(400).json({ error: "ID invalide." });

    const pool = await getPool();
    const r = await pool.request()
      .input("tid", mssql.Int, threadId)
      .query("DELETE FROM dbo.MessageThreads WHERE id = @tid");
    if (r.rowsAffected[0] === 0) return res.status(404).json({ error: "Fil introuvable." });

    return res.json({ ok: true });
  } catch (err) {
    console.error("messageController.adminDeleteThread:", err);
    return res.status(500).json({ error: "Erreur suppression." });
  }
}

module.exports = {
  send,
  listMyThreads,
  detailMyThread,
  adminUnreadThreadsCount,
  listAdminThreads,
  detailAdminThread,
  adminReply,
  adminDeleteThread,
  SENDER_ROLES,
};
