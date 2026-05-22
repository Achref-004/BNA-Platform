// ============================================================
// services/chatScope.js — Périmètre territorial du chatbot
//
//   Agence              → données de son agence uniquement (COD_AGENCE)
//   Direction regional  → agences de sa DR (COD_DR)
//   Admin / Dir. central  → accès national (pas de filtre)
// ============================================================
const { mssql, getDwPool } = require("../config/db");

const FULL_ACCESS_ROLES = ["Admin", "Direction central"];

function escapeSqlLiteral(value) {
  return String(value ?? "").replace(/'/g, "''");
}

/**
 * Résout le périmètre à partir du JWT (req.auth).
 * @param {{ role?: string, code_structure?: string }} auth
 */
async function resolveScope(auth) {
  const role = auth?.role;
  const code = String(auth?.code_structure ?? "").trim();

  if (FULL_ACCESS_ROLES.includes(role)) {
    return {
      type: "all",
      role,
      promptBlock: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PÉRIMÈTRE UTILISATEUR (OBLIGATOIRE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Rôle : ${role} — accès NATIONAL (toutes agences et directions régionales).
- Ne pas ajouter de filtre territorial sur COD_AGENCE ou COD_DR sauf si la question le demande explicitement.
`,
    };
  }

  if (!code) {
    return {
      type: "denied",
      message: "Votre compte n'est pas rattaché à une agence ou direction régionale. Contactez l'administrateur.",
    };
  }

  const pool = await getDwPool();

  if (role === "Agence") {
    const result = await pool.request()
      .input("cod", mssql.VarChar(50), code)
      .query(`
        SELECT TOP 1 COD_AGENCE, LIB_AGENCE, COD_DR, LIB_DR
        FROM DW.DIM_STRUCTURE
        WHERE COD_AGENCE = @cod
      `);

    if (!result.recordset.length) {
      return {
        type: "denied",
        message: `Agence introuvable pour le code structure « ${code} ». Vérifiez le compte utilisateur.`,
      };
    }

    const row = result.recordset[0];
    const codAgence = String(row.COD_AGENCE);
    const filter = `s.COD_AGENCE = N'${escapeSqlLiteral(codAgence)}'`;

    return {
      type: "agence",
      role,
      codAgence,
      libAgence: row.LIB_AGENCE,
      codDr: row.COD_DR,
      libDr: row.LIB_DR,
      sqlFilter: filter,
      promptBlock: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PÉRIMÈTRE UTILISATEUR (OBLIGATOIRE — NE PAS CONTOURNER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Rôle : Agence
- Agence autorisée : ${row.LIB_AGENCE} (COD_AGENCE = ${codAgence})
- TOUJOURS joindre DW.DIM_STRUCTURE avec l'alias exact \`s\`.
- TOUJOURS inclure dans le WHERE : ${filter}
- INTERDIT de filtrer ou afficher une autre agence ou une autre DR.
- Si la question porte sur une autre agence → générer quand même le SQL avec le filtre ci-dessus (résultat vide acceptable).
`,
    };
  }

  if (role === "Direction regional") {
    const result = await pool.request()
      .input("cod", mssql.VarChar(50), code)
      .query(`
        SELECT TOP 1 COD_DR, LIB_DR
        FROM DW.DIM_STRUCTURE
        WHERE COD_DR = @cod
        GROUP BY COD_DR, LIB_DR
      `);

    if (!result.recordset.length) {
      return {
        type: "denied",
        message: `Direction régionale introuvable pour le code « ${code} ». Vérifiez le compte utilisateur.`,
      };
    }

    const row = result.recordset[0];
    const codDr = String(row.COD_DR);
    const filter = `s.COD_DR = N'${escapeSqlLiteral(codDr)}'`;

    return {
      type: "dr",
      role,
      codDr,
      libDr: row.LIB_DR,
      sqlFilter: filter,
      promptBlock: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PÉRIMÈTRE UTILISATEUR (OBLIGATOIRE — NE PAS CONTOURNER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Rôle : Direction régionale
- DR autorisée : ${row.LIB_DR} (COD_DR = ${codDr})
- TOUJOURS joindre DW.DIM_STRUCTURE avec l'alias exact \`s\`.
- TOUJOURS inclure dans le WHERE : ${filter}
- Les classements « top agences » portent UNIQUEMENT sur les agences de cette DR.
- INTERDIT d'inclure des agences d'une autre direction régionale.
`,
    };
  }

  return {
    type: "denied",
    message: `Rôle « ${role || "?"} » non autorisé pour le chatbot données.`,
  };
}

/** Insère le JOIN structure si la requête utilise FAIT_PLACEMENT sans DIM_STRUCTURE. */
function ensureStructureJoin(sql) {
  if (/\bDIM_STRUCTURE\s+(?:AS\s+)?s\b/i.test(sql)) return sql;

  if (/\bFAIT_PLACEMENT\s+(?:AS\s+)?fp\b/i.test(sql)) {
    return sql.replace(
      /(\bFROM\s+DW\.FAIT_PLACEMENT\s+(?:AS\s+)?fp\b)/i,
      "$1\nJOIN DW.DIM_STRUCTURE s ON fp.ID_STRUCTURE = s.ID_STRUCTURE",
    );
  }

  if (/\bFAIT_OBJECTIF\s+(?:AS\s+)?fo\b/i.test(sql)) {
    return sql.replace(
      /(\bFROM\s+DW\.FAIT_OBJECTIF\s+(?:AS\s+)?fo\b)/i,
      "$1\nJOIN DW.DIM_STRUCTURE s ON fo.ID_STRUCTURE = s.ID_STRUCTURE",
    );
  }

  return sql;
}

function findFilterInsertIndex(sql) {
  const markers = [/\bGROUP\s+BY\b/i, /\bORDER\s+BY\b/i, /\bHAVING\b/i];
  let idx = sql.length;
  for (const re of markers) {
    const m = sql.match(re);
    if (m && m.index < idx) idx = m.index;
  }
  return idx;
}

/**
 * Applique le filtre territorial côté serveur (sécurité, indépendant du LLM).
 */
function applyScopeToSQL(sql, scope) {
  if (!scope || scope.type === "all" || !scope.sqlFilter) return sql;

  let q = ensureStructureJoin(sql.trim());
  const filter = scope.sqlFilter;

  if (/\bWHERE\b/i.test(q)) {
    q = q.replace(/\bWHERE\b/i, `WHERE (${filter}) AND `);
  } else {
    const idx = findFilterInsertIndex(q);
    q = `${q.slice(0, idx)} WHERE (${filter}) ${q.slice(idx)}`;
  }

  return q;
}

module.exports = {
  FULL_ACCESS_ROLES,
  resolveScope,
  applyScopeToSQL,
};
