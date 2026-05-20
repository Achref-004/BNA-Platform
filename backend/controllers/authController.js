// ============================================================
// controllers/authController.js — login / session / MCP
// ------------------------------------------------------------
//  • POST /api/auth/login
//  • POST /api/auth/change-password — premier changement MCP ou volontaire
//  • GET  /api/auth/me
//
// Champ dbo.Users.must_change_password (MCP=1) : l’accès métier (/chat,
// /messages, etc.) reste impossible tant que POST change-password succès.
// ============================================================
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { mssql, getPool } = require("../config/db");
require("dotenv").config();

const JWT_SECRET     = process.env.JWT_SECRET     || "bna-dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const PASSWORD_POLICY_RE = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

function signJwt(userRecord) {
  const mcpFlag = !!(userRecord.must_change_password === true
    || userRecord.must_change_password === 1
    || String(userRecord.must_change_password || "").toLowerCase() === "true");
  return jwt.sign(
    {
      sub:                 userRecord.id,
      email:               userRecord.email,
      role:                userRecord.role,
      code_structure:      userRecord.code_structure,
      /** @deprecated champ optionnel infos rapides uniquement ; la vérité = DB middleware */
      must_change_password: mcpFlag,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/**
 * Représentation publique d’un utilisateur (incluant flag MCP frontend).
 */
function publicUser(u) {
  const mcp = !!(u.must_change_password === true
    || u.must_change_password === 1
    || String(u.must_change_password || "").toLowerCase() === "true");
  return {
    id:                    u.id,
    nom:                   u.nom,
    prenom:                u.prenom,
    name:                  `${u.prenom} ${u.nom}`.trim(),
    email:                 u.email,
    role:                  u.role,
    code_structure:        u.code_structure,
    statut:                u.statut,
    date_creation:         u.date_creation,
    must_change_password:  mcp,
  };
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string"
        || email.trim() === "" || password.length === 0) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input("email", mssql.VarChar(150), email.trim().toLowerCase())
      .query(`
        SELECT id, nom, prenom, email, mot_de_passe, role,
               code_structure, statut, date_creation,
               must_change_password
        FROM dbo.Users
        WHERE LOWER(email) = @email
      `);

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }
    if ((user.statut || "").toLowerCase() !== "actif") {
      return res.status(403).json({ error: "Ce compte est désactivé. Contactez l'administrateur." });
    }

    const ok = await bcrypt.compare(password, user.mot_de_passe);
    if (!ok) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    const token = signJwt(user);
    delete user.mot_de_passe;
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("❌ Erreur authController.login:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

/**
 * POST /api/auth/change-password — JWT obligatoire
 * Body : currentPassword | ancien MCP, newPassword, newPassword_confirm (optionnel)
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || currentPassword.length < 6) {
      return res.status(400).json({ error: "Mot de passe actuel requis." });
    }
    if (typeof newPassword !== "string" || !PASSWORD_POLICY_RE.test(newPassword)) {
      return res.status(400).json({
        error: "Nouveau mot de passe : min 10 caractères avec au moins une lettre et un chiffre.",
      });
    }

    const pool = await getPool();
    const r = await pool.request()
      .input("id", mssql.Int, req.auth.sub)
      .query(`
        SELECT id, nom, prenom, email, mot_de_passe, role,
               code_structure, statut, date_creation,
               must_change_password
        FROM dbo.Users WHERE id = @id
      `);

    const u = r.recordset[0];
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable." });

    const match = await bcrypt.compare(currentPassword, u.mot_de_passe);
    if (!match)
      return res.status(403).json({ error: "Mot de passe actuel incorrect." });

    const SALT_ROUNDS = 10;
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.request()
      .input("hash", mssql.VarChar(255), hash)
      .input("id", mssql.Int, u.id)
      .query(
        `UPDATE dbo.Users SET mot_de_passe = @hash, must_change_password = 0 WHERE id = @id`,
      );

    const fresh = await pool.request()
      .input("id", mssql.Int, u.id)
      .query(`
        SELECT id, nom, prenom, email, role, code_structure,
               statut, date_creation, must_change_password
        FROM dbo.Users WHERE id = @id
      `);

    const user = fresh.recordset[0];
    const token = signJwt(user);
    return res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error("❌ Erreur authController.changePassword:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", mssql.Int, req.auth.sub)
      .query(`
        SELECT id, nom, prenom, email, role, code_structure,
               statut, date_creation, must_change_password
        FROM dbo.Users
        WHERE id = @id
      `);
    const user = result.recordset[0];
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });
    if ((user.statut || "").toLowerCase() !== "actif") {
      return res.status(403).json({ error: "Compte désactivé." });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("❌ Erreur authController.me:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
}

module.exports = { login, changePassword, me, publicUser, signJwt };
