// ============================================================
// routes/chatRoute.js — Backend Chatbot BNA (Groq + SQL Server)
// Utilise le pool partagé config/db.js et exige un JWT valide.
// ============================================================
const express = require("express");
const Groq    = require("groq-sdk");
const { getDwPool, resetPool } = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");
const { ensurePasswordChanged } = require("../middleware/ensurePasswordChanged");
const { resolveScope, applyScopeToSQL } = require("../services/chatScope");
require("dotenv").config();

const router = express.Router();
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.use(verifyToken, ensurePasswordChanged());

// ── Validation stricte du SQL généré par le LLM ───────────
function isSafeSQL(sqlText) {
  if (typeof sqlText !== "string") return false;
  const trimmed = sqlText.trim();
  if (trimmed.length === 0) return false;
  if (!/^SELECT\s/i.test(trimmed)) return false;

  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|EXEC|EXECUTE|MERGE|GRANT|REVOKE|SHUTDOWN|BACKUP|RESTORE|BULK|OPENROWSET|OPENQUERY|XP_\w+|SP_\w+)\b/i;
  if (forbidden.test(trimmed)) return false;

  const withoutTrailingSemi = trimmed.replace(/;+\s*$/, "");
  if (withoutTrailingSemi.includes(";")) return false;
  if (/--|\/\*|\*\//.test(trimmed)) return false;

  return true;
}

// ── Schéma exact du DW (inchangé) ─────────────────────────
const DW_SCHEMA = `
=== DATA WAREHOUSE BNA — SCHÉMA COMPLET ===

## TABLE: DW.FAIT_PLACEMENT (table de faits principale)
Granularité: 1 ligne = 1 placement financier
Colonnes:
  ID_PLACEMENT          INT          Clé primaire
  ID_TEMPS_SCRP         INT          FK → DIM_TEMPS.ID_TEMPS (date de souscription)
  ID_TEMPS_ECHNC        INT          FK → DIM_TEMPS.ID_TEMPS (date d'échéance)
  ID_STRUCTURE          INT          FK → DIM_STRUCTURE.ID_STRUCTURE (agence)
  ID_PRODUIT            INT          FK → DIM_PRODUIT.ID_PRODUIT
  ID_DEVISE             INT          FK → DIM_DEVISE.ID_DEVISE
  ID_ACTIVITE           INT          FK → DIM_ACTIVITE.ID_ACTIVITE (secteur client)
  ID_MATURITE_CONTRAT   INT          FK → DIM_MATURITE.ID_MATURITE (durée initiale)
  ID_MATURITE_RESIDUELLE INT         FK → DIM_MATURITE.ID_MATURITE (durée restante)
  V_MONTANT             DECIMAL      MESURE: montant du placement en millimes
  V_TAUX                DECIMAL      MESURE: taux d'intérêt annuel en % (ex: 8.49)
  NB_JOURS              INT          MESURE: durée effective du placement en jours
  CHARGE_INTERET        DECIMAL      MESURE: charge d'intérêt totale en millimes
  TYPE_DEVISE           VARCHAR      Dimension dégénérée: 'Dinar' ou 'Devise'
  DateChargementDW      DATETIME     Date de chargement technique

## TABLE: DW.FAIT_OBJECTIF (objectifs commerciaux)
Colonnes:
  ID_OBJECTIF      INT       Clé primaire
  ID_STRUCTURE     INT       FK → DIM_STRUCTURE.ID_STRUCTURE
  OBJECTIF_DT      BIGINT    MESURE: objectif en Dinars Tunisiens (millimes)
  OBJECTIF_DEV     BIGINT    MESURE: objectif en Devises (millimes)
  ANNEE            INT       Année de l'objectif (ex: 2025)
  DateChargementDW DATETIME

## TABLE: DW.DIM_TEMPS (calendrier 2020–2030)
Colonnes:
  ID_TEMPS, DATE_COMPLETE, JOUR, MOIS, LIB_MOIS, TRIMESTRE, LIB_TRIMESTRE, SEMESTRE, ANNEE, ...

## TABLE: DW.DIM_STRUCTURE (agences et directions régionales)
Colonnes: ID_STRUCTURE, COD_AGENCE, LIB_AGENCE, COD_DR, LIB_DR, LIB_MAIL, MAIL_DR, ...

## TABLE: DW.DIM_PRODUIT (produits financiers)
Colonnes: ID_PRODUIT, COD_PRODUIT, LIB_PRODUIT, ...

## TABLE: DW.DIM_DEVISE
Colonnes: ID_DEVISE, COD_DEV, LIB_DEVISE, ...

## TABLE: DW.DIM_MATURITE (tranches de durée)
Colonnes: ID_MATURITE (1-14), LIB_TRANCHE, NB_JOURS_MIN, NB_JOURS_MAX, ORDRE, ...

## TABLE: DW.DIM_ACTIVITE (secteurs d'activité économique)
Colonnes: ID_ACTIVITE, KEY_ACT, LIB_ACTIVITE, ...
`;

// Historique de conversation PAR utilisateur (clé = id JWT `sub`).
// Évite que le contexte d'un utilisateur ne fuite vers les autres.
const historyByUser = new Map();

function getUserHistory(userId) {
  if (!historyByUser.has(userId)) historyByUser.set(userId, []);
  return historyByUser.get(userId);
}

async function summarizeHistory(messages) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 200,
    messages: [
      { role: "system", content: "Tu es un assistant qui résume une conversation SQL en 1-2 lignes très courtes." },
      { role: "user",   content: `Résume cette conversation :\n${messages.map(h => `${h.role}: ${h.content}`).join("\n")}` },
    ],
  });
  return completion.choices[0].message.content.trim();
}

// ── Étape 1 : Générer le SQL via Groq ──────────────────────
async function generateSQL(question, scope, userId) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear  = new Date().getFullYear();

  // Copie de travail de l'historique propre à cet utilisateur.
  let history = getUserHistory(userId).slice();
  history.push({ role: "user", content: question });

  if (history.length > 8) {
    const toSummarize = history.slice(0, -4);
    const recent      = history.slice(-4);
    try {
      const summary = await summarizeHistory(toSummarize);
      history = [
        { role: "system", content: "Résumé de la conversation antérieure: " + summary },
        ...recent,
      ];
    } catch (e) {
      console.warn("⚠️ Résumé échoué, troncature simple:", e.message);
      history = recent;
    }
  }

  const completion = await groq.chat.completions.create({
    model:       "llama-3.3-70b-versatile",
    max_tokens:  700,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Tu es un expert SQL pour le Data Warehouse de la Banque Nationale Agricole (BNA) de Tunisie.

${DW_SCHEMA}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLES GÉNÉRALES (OBLIGATOIRES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Génère UNIQUEMENT la requête SQL T-SQL brute.
- AUCUN commentaire, markdown, backtick ou explication.
- TOUJOURS commencer par SELECT TOP 20.
- TOUJOURS diviser V_MONTANT par 1 000 000 pour afficher en MDT.
- TOUJOURS utiliser LIKE '%valeur%' pour filtrer LIB_AGENCE, LIB_PRODUIT, LIB_DR, LIB_DEVISE, LIB_ACTIVITE.
- Pour TYPE_DEVISE : valeurs exactes 'Dinar' ou 'Devise'.
- Pour le taux moyen pondéré : SUM(fp.V_MONTANT * fp.V_TAUX) / SUM(fp.V_MONTANT).
- Mois actuel = ${currentMonth}, Année actuelle = ${currentYear}.
- Si la question ne concerne pas les données BNA → répondre UNIQUEMENT : NON_SQL
- TOUJOURS joindre DW.DIM_STRUCTURE avec l'alias \`s\` (obligatoire pour le périmètre utilisateur).
${scope?.promptBlock || ""}
GROUP BY et ORDER BY :
- Si ORDER BY dm.ORDRE → obligatoirement GROUP BY dm.LIB_TRANCHE, dm.ORDRE
- ❌ INTERDIT : ORDER BY dm.ORDRE sans dm.ORDRE dans le GROUP BY

✅ Exemple correct :
  GROUP BY dm.LIB_TRANCHE, dm.ORDRE
  ORDER BY dm.ORDRE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 1 — DOUBLE DATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quand la question filtre l'année de SOUSCRIPTION et la date d'ÉCHÉANCE simultanément,
utiliser DEUX JOIN distincts sur DIM_TEMPS :

  JOIN DW.DIM_TEMPS t_scrp  ON fp.ID_TEMPS_SCRP  = t_scrp.ID_TEMPS
  JOIN DW.DIM_TEMPS t_echnc ON fp.ID_TEMPS_ECHNC = t_echnc.ID_TEMPS

❌ INTERDIT : un seul alias "t" pour filtrer les deux dates → retourne 0 résultat.

✅ Exemple — "placements 2025 avec échéance après 31/12/2025" :
SELECT TOP 20 SUM(fp.V_MONTANT) / 1000000 AS MONTANT
FROM DW.FAIT_PLACEMENT fp
JOIN DW.DIM_STRUCTURE s   ON fp.ID_STRUCTURE   = s.ID_STRUCTURE
JOIN DW.DIM_TEMPS t_scrp  ON fp.ID_TEMPS_SCRP  = t_scrp.ID_TEMPS
JOIN DW.DIM_TEMPS t_echnc ON fp.ID_TEMPS_ECHNC = t_echnc.ID_TEMPS
WHERE s.LIB_AGENCE LIKE '%AvParis%'
  AND fp.TYPE_DEVISE = 'Devise'
  AND t_scrp.ANNEE = 2025
  AND t_echnc.DATE_COMPLETE > '2025-12-31'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 2 — TAUX DE RÉALISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"taux de réalisation" ≠ V_TAUX (V_TAUX = taux d'intérêt).
Formule : (montant réalisé / objectif) × 100

CAS 1 — En Dinar (TND) :
  CASE WHEN fo.OBJECTIF_DT > 0
       THEN ROUND((SUM(fp.V_MONTANT) / fo.OBJECTIF_DT) * 100, 2)
       ELSE 0 END AS TAUX_REALISATION_PCT
  → Filtre : fp.TYPE_DEVISE = 'Dinar' | Objectif : fo.OBJECTIF_DT

CAS 2 — En Devise étrangère :
  CASE WHEN fo.OBJECTIF_DEV > 0
       THEN ROUND((SUM(fp.V_MONTANT) / fo.OBJECTIF_DEV) * 100, 2)
       ELSE 0 END AS TAUX_REALISATION_PCT
  → Filtre : fp.TYPE_DEVISE = 'Devise' | Objectif : fo.OBJECTIF_DEV

CAS 3 — Sans précision → calculer les deux :
  CASE WHEN fo.OBJECTIF_DT > 0
       THEN ROUND((SUM(CASE WHEN fp.TYPE_DEVISE='Dinar'  THEN fp.V_MONTANT ELSE 0 END) / fo.OBJECTIF_DT)  * 100, 2)
       ELSE 0 END AS TAUX_REAL_DT_PCT,
  CASE WHEN fo.OBJECTIF_DEV > 0
       THEN ROUND((SUM(CASE WHEN fp.TYPE_DEVISE='Devise' THEN fp.V_MONTANT ELSE 0 END) / fo.OBJECTIF_DEV) * 100, 2)
       ELSE 0 END AS TAUX_REAL_DEV_PCT

Obligations :
  1. JOIN DW.FAIT_OBJECTIF fo ON fo.ID_STRUCTURE = s.ID_STRUCTURE AND fo.ANNEE = [année]
  2. DEUX JOIN sur DIM_TEMPS (t_scrp + t_ech)
  3. WHERE t_scrp.ANNEE = [année] AND t_ech.DATE_COMPLETE > '[année]-12-31'
  4. GROUP BY fo.OBJECTIF_DT, fo.OBJECTIF_DEV
  5. Toujours retourner MONTANT_REALISE et OBJECTIF séparément

❌ INTERDIT : AVG(fp.V_TAUX) ou SUM(fp.V_TAUX) pour le taux de réalisation.

✅ Exemple — "taux de réalisation Sfax 2025 en devise" :
SELECT TOP 20
  SUM(fp.V_MONTANT) / 1000000 AS MONTANT_REALISE,
  fo.OBJECTIF_DEV / 1000000   AS OBJECTIF,
  CASE WHEN fo.OBJECTIF_DEV > 0
       THEN ROUND((SUM(fp.V_MONTANT) / fo.OBJECTIF_DEV) * 100, 2)
       ELSE 0 END AS TAUX_REALISATION_PCT
FROM DW.FAIT_PLACEMENT fp
JOIN DW.DIM_STRUCTURE s  ON fp.ID_STRUCTURE   = s.ID_STRUCTURE
JOIN DW.DIM_TEMPS t_scrp ON fp.ID_TEMPS_SCRP  = t_scrp.ID_TEMPS
JOIN DW.DIM_TEMPS t_ech  ON fp.ID_TEMPS_ECHNC = t_ech.ID_TEMPS
JOIN DW.FAIT_OBJECTIF fo ON fo.ID_STRUCTURE   = s.ID_STRUCTURE AND fo.ANNEE = 2025
WHERE s.LIB_AGENCE LIKE '%Sfax%'
  AND fp.TYPE_DEVISE = 'Devise'
  AND t_scrp.ANNEE = 2025
  AND t_ech.DATE_COMPLETE > '2025-12-31'
GROUP BY fo.OBJECTIF_DEV

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE 3 — DIM_MATURITE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tranches disponibles :
  ID=1  → "= 1 jour"
  ID=2  → "1 à 7 jours"
  ID=3  → "7 à 15 jours"
  ID=4  → "15 jours à 1 mois"
  ID=5  → "1 à 3 mois"
  ID=6  → "3 à 6 mois"
  ID=7  → "6 mois à 1 an"
  ID=8  → "1 à 2 ans"
  ID=9  → "2 à 3 ans"
  ID=10 → "3 à 5 ans"
  ID=11 → "5 à 7 ans"
  ID=12 → "7 à 15 ans"
  ID=13 → "15 à 20 ans"
  ID=14 → "Placement échu" → TOUJOURS EXCLURE

Règles :
- Filtrer par : WHERE dm.LIB_TRANCHE LIKE '%mot%'
- ID_MATURITE_CONTRAT    = durée initiale du contrat
- ID_MATURITE_RESIDUELLE = durée restante (14 = échu)
- ❌ INTERDIT : filtrer par NB_JOURS_MIN / NB_JOURS_MAX
- ❌ INTERDIT : utiliser JOIN DIM_TEMPS ou WHERE t.DATE_COMPLETE pour les placements échus

`,
      },
      ...history,
      { role: "user", content: question },
    ],
  });

  const generatedSql = completion.choices[0].message.content
    .replace(/```sql/gi, "")
    .replace(/```/g, "")
    .trim();

  history.push({ role: "assistant", content: generatedSql });
  historyByUser.set(userId, history); // persiste l'historique de CET utilisateur
  return generatedSql;
}

// ── Étape 2 : Exécuter la requête ──────────────────────────
async function executeQuery(sqlQuery) {
  const pool   = await getDwPool();
  const result = await pool.request().query(sqlQuery);
  return result.recordset;
}

// ── Étape 3 : Formater la réponse via Groq ────────────────
async function formatResponse(question, data, user, scope) {
  const dataStr = JSON.stringify(data, null, 2);
  const scopeNote =
    scope?.type === "agence"
      ? `L'utilisateur ne voit que l'agence : ${scope.libAgence}.`
      : scope?.type === "dr"
        ? `L'utilisateur ne voit que la direction régionale : ${scope.libDr}.`
        : "";
  const completion = await groq.chat.completions.create({
    model:     "llama-3.3-70b-versatile",
    max_tokens: 250,
    messages: [
      {
        role: "system",
        content: `Tu es un assistant bancaire de la BNA (Banque Nationale Agricole de Tunisie).
Tu parles à ${user?.prenom || user?.name || "un utilisateur"}.
${scopeNote}
Réponds en français, de façon claire, professionnelle et concise.
Les montants sont en dinars tunisiens (DT) sauf indication contraire.
- ❌ INTERDIT de commencer par "Bonjour", "Voici", "Bien sûr"…
- ✅ Commence DIRECTEMENT par la réponse.
- ✅ Présente les données dans l'ORDRE EXACT reçu.
- ✅ Si "meilleur"/"top 1" → uniquement la première ligne.

Pour le taux de réalisation, TOUJOURS afficher les 3 valeurs même si elles sont 0 :
   - 💰 Montant réalisé  : [MONTANT_REALISE] DT
   - 🎯 Objectif         : [OBJECTIF] DT
   - 📊 Taux de réalisation : [TAUX_REALISATION_PCT] %

2. Si MONTANT_REALISE = 0 ou TAUX = 0, dis :
   "L'agence [nom] n'a réalisé aucun placement correspondant à ces critères.
    Le taux de réalisation est de 0% sur un objectif de [OBJECTIF] DT."

3. ❌ INTERDIT : Ne dis JAMAIS juste "Le montant est de 0 DT" sans montrer l'objectif
4. ❌ INTERDIT : Ne dis JAMAIS "données non disponibles" ou "équipe Data Warehouse"
RÈGLES ABSOLUES :
- ❌ INTERDIT : "Bonjour", "Voici", "Bien sûr", "En réponse à", "D'après les données"...
- ❌ INTERDIT : toute phrase d'introduction ou de conclusion
- ❌ INTERDIT : répéter la question de l'utilisateur
- ❌ INTERDIT : expliquer ce que tu vas faire
- ✅ Commence IMMÉDIATEMENT par la donnée chiffrée ou le tableau
- ✅ Une réponse courte et directe uniquement

Exemple ❌ : "Voici les résultats des placements pour la tranche 15 jours à 1 mois : Le montant total est de 5.2 MDT."
Exemple ✅ : "Montant total — 15 jours à 1 mois : 5.2 MDT `,
      },
      {
        role: "user",
        content: `Question : "${question}"\n\nDonnées :\n${dataStr}\n\nFormule une réponse naturelle et professionnelle.`,
      },
    ],
  });
  return completion.choices[0].message.content.trim();
}

// ── POST /api/chat ─────────────────────────────────────────
router.post("/", async (req, res) => {
  const { question } = req.body;
  const user = req.auth; // depuis le JWT

  if (typeof question !== "string") {
    return res.status(400).json({ error: "Question manquante ou invalide" });
  }
  const trimmedQ = question.trim();
  if (trimmedQ.length < 2)   return res.status(400).json({ error: "Question trop courte" });
  if (trimmedQ.length > 500) return res.status(400).json({ error: "Question trop longue (max 500 caractères)" });

  let sqlQuery = null;
  try {
    let scope;
    try {
      scope = await resolveScope(user);
    } catch (err) {
      console.error("❌ Erreur périmètre chatbot:", err.message);
      return res.status(503).json({ response: "Impossible de déterminer votre périmètre de données. Réessayez plus tard." });
    }

    if (scope.type === "denied") {
      return res.status(403).json({ response: scope.message });
    }

    try {
      sqlQuery = await generateSQL(trimmedQ, scope, user.sub);
    } catch (err) {
      console.error("❌ Erreur Groq (génération SQL):", err.message);
      return res.status(502).json({ response: "Le service d'IA est momentanément indisponible. Réessayez dans quelques instants." });
    }
    console.log("✅ SQL généré (LLM):", sqlQuery);

    if (sqlQuery.trim().toUpperCase() === "NON_SQL") {
      return res.json({ response: "Je suis spécialisé dans les données BNA (placements, objectifs, activités). Posez-moi une question sur vos données bancaires." });
    }

    if (!isSafeSQL(sqlQuery)) {
      console.warn("⛔ SQL rejeté (non sûr):", sqlQuery);
      return res.status(403).json({ response: "La requête générée n'est pas autorisée. Reformulez votre question." });
    }

    sqlQuery = applyScopeToSQL(sqlQuery, scope);
    console.log(`✅ SQL avec périmètre (${scope.type}):`, sqlQuery);

    if (!isSafeSQL(sqlQuery)) {
      console.warn("⛔ SQL rejeté après filtre périmètre:", sqlQuery);
      return res.status(403).json({ response: "La requête générée n'est pas autorisée. Reformulez votre question." });
    }

    let data;
    try {
      data = await executeQuery(sqlQuery);
    } catch (err) {
      console.error("❌ Erreur SQL:", err.code, "-", err.message);
      if (err.code === "ETIMEOUT" || err.code === "ESOCKET")
        return res.json({ response: "La requête a pris trop de temps. Essayez avec des critères plus précis." });
      if (err.code === "ELOGIN")
        return res.status(503).json({ response: "Connexion au Data Warehouse impossible. Contactez l'administrateur." });
      if (err.code === "ECONNCLOSED" || err.code === "ENOTOPEN") {
        resetPool("dw");
        return res.status(503).json({ response: "Connexion à la base perdue. Réessayez dans un instant." });
      }
      if (err.code === "EREQUEST")
        return res.json({ response: "La requête SQL générée contient une erreur. Reformulez votre question." });
      return res.status(500).json({ response: "Erreur lors de l'exécution de la requête. Reformulez votre question." });
    }

    console.log("✅ Résultats:", data.length, "ligne(s)");

    const isEmpty = !data || data.length === 0
      || data.every(row => Object.values(row).every(val => val === null));
    if (isEmpty) {
      const scopeHint =
        scope.type === "agence"
          ? ` Aucun résultat pour votre agence (${scope.libAgence || "périmètre agence"}).`
          : scope.type === "dr"
            ? ` Aucun résultat pour votre direction régionale (${scope.libDr || "périmètre DR"}).`
            : "";
      return res.json({ response: `Aucune donnée trouvée pour cette période ou ces critères.${scopeHint}` });
    }

    let response;
    try {
      response = await formatResponse(trimmedQ, data, user, scope);
    } catch (err) {
      console.error("❌ Erreur Groq (formatage):", err.message);
      return res.json({
        response: "Données trouvées (formatage indisponible) : " + JSON.stringify(data.slice(0, 5)),
        debug_sql: process.env.NODE_ENV !== "production" ? sqlQuery : undefined,
      });
    }

    return res.json({
      response,
      debug_sql: process.env.NODE_ENV !== "production" ? sqlQuery : undefined,
    });
  } catch (err) {
    console.error("❌ Chatbot error inattendue:", err);
    return res.status(500).json({ response: "Une erreur inattendue s'est produite. Reformulez votre question." });
  }
});

module.exports = router;
