// ============================================================
// scripts/seedUsers.js — Insère les utilisateurs initiaux
// (mots de passe hachés avec bcrypt) dans dbo.Users.
//
// Usage :  node scripts/seedUsers.js
// Prérequis : avoir exécuté backend/database/init_users.sql
// ============================================================
const bcrypt = require("bcryptjs");
const { mssql, getPool } = require("../config/db");

const SALT_ROUNDS = 10;

// ⚠️ Mots de passe en clair UNIQUEMENT ici : ils seront hachés
//    avant insertion et ne seront jamais stockés en clair.
const INITIAL_USERS = [
  {
    nom: "Bejaoui",
    prenom: "Achref",
    email: "admin@bna.tn",               
    motDePasse: "Admin@2025",
    code_structure: "900",
    role: "Admin",
    statut: "Actif",
    must_change_password: false,
  },
  {
    nom: "Ben Salah",
    prenom: "Sami",
    email: "sami.bensalah@bna.tn",
    motDePasse: "Direction@2025",
    code_structure: "711",
    role: "Direction central",
    statut: "Actif",
    must_change_password: false,
  },
  {
    nom: "Trabelsi",
    prenom: "Mouna",
    email: "mouna.trabelsi@bna.tn",
    motDePasse: "Region@2025",
    code_structure: "891",
    role: "Direction regional",
    statut: "Actif",
    must_change_password: false,
  },
  {
    nom: "Agence",
    prenom: "Medjez El Bab",
    email: "agence.medjezelbab@bna.tn",
    motDePasse: "Agence@2025",
    code_structure: "18",
    role: "Agence",
    statut: "Actif",
    must_change_password: false,
  },
];

(async function main() {
  let pool;
  try {
    pool = await getPool();

    for (const u of INITIAL_USERS) {
      const exists = await pool.request()
        .input("email", mssql.VarChar(150), u.email)
        .query("SELECT id FROM dbo.Users WHERE email = @email");

      if (exists.recordset.length > 0) {
        console.log(`↪️  Existe déjà : ${u.email} — ignoré.`);
        continue;
      }

      const hash = await bcrypt.hash(u.motDePasse, SALT_ROUNDS);

      const mcp = u.must_change_password ? 1 : 0;

      await pool.request()
        .input("nom",            mssql.VarChar(100), u.nom)
        .input("prenom",         mssql.VarChar(100), u.prenom)
        .input("email",          mssql.VarChar(150), u.email)
        .input("mot_de_passe",   mssql.VarChar(255), hash)
        .input("code_structure", mssql.VarChar(50),  u.code_structure)
        .input("role",           mssql.VarChar(50),  u.role)
        .input("statut",         mssql.VarChar(20),  u.statut)
        .input("mcp",            mssql.Bit,        mcp)
        .query(`
          INSERT INTO dbo.Users
            (nom, prenom, email, mot_de_passe, code_structure, role, statut, must_change_password)
          VALUES
            (@nom, @prenom, @email, @mot_de_passe, @code_structure, @role, @statut, @mcp)
        `);

      console.log(`✅ Inséré : ${u.email}  (${u.role})  →  mdp en clair : ${u.motDePasse}`);
    }

    console.log("\n🎉 Seed terminé.");
  } catch (err) {
    console.error("❌ Erreur seed:", err);
    process.exitCode = 1;
  } finally {
    try { (await pool?.close?.()); } catch {}
    process.exit();
  }
})();
