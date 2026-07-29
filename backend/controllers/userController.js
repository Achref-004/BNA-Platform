// ============================================================
// controllers/userController.js
// ------------------------------------------------------------
// CRUD complet de la table BNA.dbo.Users.
// Toutes les routes sont protégées par verifyToken + Admin.
// Les mots de passe sont stockés sous forme de hash bcrypt.
//
// 🔒 RÈGLE FONCTIONNELLE — UN SEUL ADMIN
// ----------------------------------------------------------
// Le système ne fonctionne qu'avec UN admin principal unique
// (le compte technique `admin@bna.tn`).
// Conséquences :
//   • CREATE → on refuse tout payload avec role === "Admin"
//   • UPDATE → on refuse toute promotion vers le rôle "Admin"
//             (le compte admin principal reste protégé)
//   • Le compte admin@bna.tn ne peut être ni renommé en autre rôle,
//     ni désactivé, ni supprimé.
// ============================================================
const bcrypt = require("bcryptjs");
const { mssql, getPool } = require("../config/db");
const { publicUser } = require("./authController");
const { generateSecureTemporaryPassword } = require("../services/passwordUtils");
const { sendWelcomeCredentialsEmail, isEmailEnabled } = require("../services/emailService");

// Rôles assignables côté API (Admin volontairement EXCLU).
// La contrainte CHECK SQL accepte toujours "Admin" pour préserver
// le compte principal existant en base, mais on bloque toute
// création/modification d'un nouvel Admin dans cette couche.
const ASSIGNABLE_ROLES = ["Agence", "Direction regional", "Direction central"];
const ALL_ROLES        = ["Admin", ...ASSIGNABLE_ROLES]; // utilisé uniquement pour lire/valider l'existant
const STATUTS          = ["Actif", "Inactif"];

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Compte technique Admin unique : ne peut être ni supprimé, ni désactivé,
// ni changer de rôle. C'est le SEUL administrateur du système.
const PROTECTED_ADMIN_EMAIL = "admin@bna.tn";

/**
 * Valide le payload d'un POST / PUT user.
 *
 * @param {object} payload                  Body de la requête
 * @param {{requirePassword:boolean}} opts  En création, le mot de passe est requis
 * @returns {string[]}                      Liste des erreurs (vide si OK)
 *
 * NB : le rôle "Admin" est volontairement absent de la liste des rôles
 * acceptés — il est impossible de l'attribuer via l'API.
 */
function validatePayload({ nom, prenom, email, role, statut, code_structure, mot_de_passe }, { requirePassword }) {
  const errors = [];
  if (!nom    || typeof nom    !== "string" || nom.trim().length    < 2) errors.push("Nom requis (min 2 caractères).");
  if (!prenom || typeof prenom !== "string" || prenom.trim().length < 2) errors.push("Prénom requis (min 2 caractères).");
  if (!email  || typeof email  !== "string" || !EMAIL_RE.test(email.trim())) errors.push("Email invalide.");
  if (!role   || !ASSIGNABLE_ROLES.includes(role))
    errors.push(`Rôle invalide. Valeurs autorisées : ${ASSIGNABLE_ROLES.join(", ")}.`);
  if (statut && !STATUTS.includes(statut)) errors.push(`Statut invalide (${STATUTS.join(", ")}).`);
  if (code_structure && (typeof code_structure !== "string" || code_structure.length > 5)) {
    errors.push("Code structure invalide.");
  }
  if (requirePassword || (mot_de_passe !== undefined && mot_de_passe !== "")) {
    if (typeof mot_de_passe !== "string" || mot_de_passe.length < 6) {
      errors.push("Mot de passe requis (min 6 caractères).");
    }
  }
  return errors;
}

/**
 * GET /api/users
 * Liste paginée + filtres :
 *   ?search=...     (LIKE sur nom / prenom / email)
 *   ?role=...       (égal stricte)
 *   ?statut=...
 *   ?page=1 &pageSize=10
 * Retourne : { total, page, pageSize, pages, items: [...] }
 */
async function list(req, res) {
  try {
    const { search = "", role = "", statut = "", page = 1, pageSize = 10 } = req.query;
    const p   = Math.max(parseInt(page, 10) || 1, 1);
    const ps  = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
    const off = (p - 1) * ps;

    const pool = await getPool();
    const request = pool.request()
      .input("search", mssql.VarChar(150), `%${search}%`)
      .input("role",   mssql.VarChar(50),  role || null)
      .input("statut", mssql.VarChar(20),  statut || null)
      .input("off",    mssql.Int, off)
      .input("ps",     mssql.Int, ps);

    const where = `
      WHERE (@search = '%%' OR nom LIKE @search OR prenom LIKE @search OR email LIKE @search)
        AND (@role   IS NULL OR role   = @role)
        AND (@statut IS NULL OR statut = @statut)
    `;

    const countRes = await request.query(`SELECT COUNT(*) AS total FROM dbo.Users ${where}`);
    const total    = countRes.recordset[0].total;

    const dataRes = await request.query(`
      SELECT id, nom, prenom, email, role, code_structure, statut, date_creation, must_change_password
      FROM dbo.Users
      ${where}
      ORDER BY date_creation DESC, id DESC
      OFFSET @off ROWS FETCH NEXT @ps ROWS ONLY
    `);

    return res.json({
      total,
      page: p,
      pageSize: ps,
      pages: Math.ceil(total / ps) || 1,
      items: dataRes.recordset.map(publicUser),
    });
  } catch (err) {
    console.error("❌ userController.list:", err);
    return res.status(500).json({ error: "Erreur lors du chargement des utilisateurs." });
  }
}

/** GET /api/users/:id — Détail d'un utilisateur (404 si introuvable). */
async function getOne(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID invalide." });

    const pool = await getPool();
    const r = await pool.request()
      .input("id", mssql.Int, id)
      .query(`
        SELECT id, nom, prenom, email, role, code_structure, statut, date_creation, must_change_password
        FROM dbo.Users WHERE id = @id
      `);
    const u = r.recordset[0];
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable." });
    return res.json({ user: publicUser(u) });
  } catch (err) {
    console.error("❌ userController.getOne:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

/**
 * POST /api/users — Crée un collaborateur avec mot de passe temporaire envoyé par email (SMTP configuré).
 * Le mot de passe transmis depuis le frontend est IGNORÉ : seule la génération serveur garantit MCP=1 + traçabilité.
 */
async function create(req, res) {
  try {
    const body = req.body || {};

    // Garde-fou n°1 : interdiction explicite de créer un Admin
    if (body.role === "Admin") {
      return res.status(403).json({
        error: "Création d'un administrateur interdite. Le système n'admet qu'un seul Admin.",
      });
    }

    const errors = validatePayload(body, { requirePassword: false });
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const email = body.email.trim().toLowerCase();

    // Garde-fou n°2 : l'email réservé à l'admin principal est interdit
    if (email === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Cet email est réservé à l'administrateur principal." });
    }

    const pool = await getPool();

    const exists = await pool.request()
      .input("email", mssql.VarChar(150), email)
      .query("SELECT id FROM dbo.Users WHERE LOWER(email) = @email");
    if (exists.recordset.length) {
      return res.status(409).json({ error: "Cet email est déjà utilisé." });
    }

    /** Mot de passe aléatoire fort + contrainte changement MCP */
    const tempPlain = generateSecureTemporaryPassword();

    const hash = await bcrypt.hash(tempPlain, SALT_ROUNDS);

    const inserted = await pool.request()
      .input("nom",                mssql.VarChar(100), body.nom.trim())
      .input("prenom",             mssql.VarChar(100), body.prenom.trim())
      .input("email",              mssql.VarChar(150), email)
      .input("mot_de_passe",       mssql.VarChar(255), hash)
      .input("code_structure",    mssql.VarChar(50),  body.code_structure || null)
      .input("role",              mssql.VarChar(50),  body.role)
      .input("statut",            mssql.VarChar(20),  body.statut || "Actif")
      .input("must_change",       mssql.Bit,         1)
      .query(`
        INSERT INTO dbo.Users (nom, prenom, email, mot_de_passe, code_structure, role, statut, must_change_password)
        OUTPUT inserted.id, inserted.nom, inserted.prenom, inserted.email,
               inserted.role, inserted.code_structure, inserted.statut, inserted.date_creation, inserted.must_change_password
        VALUES (@nom, @prenom, @email, @mot_de_passe, @code_structure, @role, @statut, @must_change)
      `);

    const saved = inserted.recordset[0];

    /** Email en arrière-plan (ne doit pas retarder une réponse 201). */
    setImmediate(async () => {
      try {
        if (!isEmailEnabled()) {
          console.warn("⚠ SMTP désactivé : mot de passe temporaire non expédié pour", email);
          return;
        }
        await sendWelcomeCredentialsEmail({
          toEmail: email,
          nom: saved.nom,
          prenom: saved.prenom,
          email,
          role: saved.role,
          temporaryPassword: tempPlain,
        });
        console.log("📧 Credentials envoyés à", email);
      } catch (err) {
        console.error("❌ Erreur SMTP credentials :", err?.message || err);
      }
    });

    const responsePayload = {
      user: publicUser(saved),
      email_delivery: isEmailEnabled() ? "queued" : "disabled",
      /** Présent UNIQUEMENT si SMTP désactivé (debug / dev local) ou si équipe doit copier après échec */
      ...(isEmailEnabled() ? {} : { temporary_password_preview: tempPlain }),
    };

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error("❌ userController.create:", err);
    return res.status(500).json({ error: "Erreur lors de la création." });
  }
}

/**
 * PUT /api/users/:id — Met à jour un utilisateur existant.
 *
 * 🔒 Règles de sécurité :
 *   • Le mot de passe n'est mis à jour que s'il est fourni (non vide).
 *   • Aucun utilisateur ne peut être promu Admin (renvoyé en 403).
 *   • Le compte admin@bna.tn ne peut ni perdre son rôle ni être désactivé.
 */
async function update(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID invalide." });

    const body = req.body || {};

    // Garde-fou n°1 : refus catégorique de promotion vers Admin
    if (body.role === "Admin") {
      return res.status(403).json({
        error: "Promotion vers le rôle Admin interdite. Le système n'admet qu'un seul Admin.",
      });
    }

    const errors = validatePayload(body, { requirePassword: false });
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const pool = await getPool();

    const current = await pool.request()
      .input("id", mssql.Int, id)
      .query("SELECT id, email, role, statut FROM dbo.Users WHERE id = @id");
    const cur = current.recordset[0];
    if (!cur) return res.status(404).json({ error: "Utilisateur introuvable." });

    // Garde-fou n°2 : le compte Admin principal est totalement immuable côté rôle/statut.
    // Comme `validatePayload` n'accepte plus "Admin", on doit court-circuiter ici.
    if (cur.email.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({
        error: "Le compte administrateur principal ne peut pas être modifié via cette interface.",
      });
    }

    // Garde-fou n°3 : impossible de rétrograder un Admin existant (qui ne devrait être
    // que l'admin principal, mais on protège quoi qu'il arrive).
    if (cur.role === "Admin") {
      return res.status(403).json({ error: "Modification d'un compte Admin interdite." });
    }

    const newEmail = body.email.trim().toLowerCase();

    // Garde-fou n°4 : on n'autorise jamais de renommer un compte vers admin@bna.tn
    if (newEmail === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Cet email est réservé à l'administrateur principal." });
    }

    if (newEmail !== cur.email.toLowerCase()) {
      const dup = await pool.request()
        .input("email", mssql.VarChar(150), newEmail)
        .input("id",    mssql.Int, id)
        .query("SELECT id FROM dbo.Users WHERE LOWER(email) = @email AND id <> @id");
      if (dup.recordset.length) {
        return res.status(409).json({ error: "Cet email est déjà utilisé." });
      }
    }

    const updatePassword = typeof body.mot_de_passe === "string" && body.mot_de_passe.length > 0;
    const hash = updatePassword ? await bcrypt.hash(body.mot_de_passe, SALT_ROUNDS) : null;

    const sql = `
      UPDATE dbo.Users
      SET nom            = @nom,
          prenom         = @prenom,
          email          = @email,
          code_structure = @code_structure,
          role           = @role,
          statut         = @statut
          ${updatePassword ? ", mot_de_passe = @mot_de_passe, must_change_password = 0" : ""}
      OUTPUT inserted.id, inserted.nom, inserted.prenom, inserted.email,
             inserted.role, inserted.code_structure, inserted.statut,
             inserted.date_creation, inserted.must_change_password
      WHERE id = @id
    `;

    const req2 = pool.request()
      .input("id",             mssql.Int, id)
      .input("nom",            mssql.VarChar(100), body.nom.trim())
      .input("prenom",         mssql.VarChar(100), body.prenom.trim())
      .input("email",          mssql.VarChar(150), newEmail)
      .input("code_structure", mssql.VarChar(50),  body.code_structure || null)
      .input("role",           mssql.VarChar(50),  body.role)
      .input("statut",         mssql.VarChar(20),  body.statut || "Actif");
    if (updatePassword) req2.input("mot_de_passe", mssql.VarChar(255), hash);

    const out = await req2.query(sql);
    return res.json({ user: publicUser(out.recordset[0]) });
  } catch (err) {
    console.error("❌ userController.update:", err);
    return res.status(500).json({ error: "Erreur lors de la mise à jour." });
  }
}

/**
 * DELETE /api/users/:id — Supprime un utilisateur.
 * Garde-fous :
 *   • impossible de supprimer un compte avec role = "Admin"
 *   • impossible de supprimer le compte technique admin@bna.tn
 *   • impossible de supprimer son propre compte
 */
async function remove(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID invalide." });

    const pool = await getPool();
    const cur = await pool.request()
      .input("id", mssql.Int, id)
      .query("SELECT id, email, role FROM dbo.Users WHERE id = @id");
    const u = cur.recordset[0];
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable." });

    if (u.role === "Admin" || u.email.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Suppression d'un administrateur interdite." });
    }
    if (req.auth?.sub === id) {
      return res.status(403).json({ error: "Impossible de supprimer votre propre compte." });
    }

    await pool.request()
      .input("id", mssql.Int, id)
      .query("DELETE FROM dbo.Users WHERE id = @id");

    return res.json({ ok: true });
  } catch (err) {
    console.error("❌ userController.remove:", err);
    return res.status(500).json({ error: "Erreur lors de la suppression." });
  }
}

module.exports = {
  list, getOne, create, update, remove,
  // Exporté pour /api/users/_meta/options : la liste publique ne contient
  // PAS "Admin" — le front ne propose donc jamais ce rôle dans ses selects.
  ROLES: ASSIGNABLE_ROLES,
  ALL_ROLES,
  STATUTS,
  PROTECTED_ADMIN_EMAIL,
};
