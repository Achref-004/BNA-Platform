// ============================================================
// services/passwordUtils.js — Génération de mots de passe temporaires
// ------------------------------------------------------------
// Utilise uniquement crypto natif Node (sans dépendances).
// Le mot de passe est imprimable ASCII et respecte au minimum une
// longueur forte pour la livraison par email au premier utilisateur.
// ============================================================
const crypto = require("crypto");

/** Caractères évités : 0,O, l, 1,I pour lisibilité en email */
const ALPHA = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const DIGIT = "23456789";
const SYMBOL = "@#$%*-";

/**
 * @param {number} [length=14]
 * @returns {string} Mot de passe aléatoire (lettres + chiffres + symbole)
 */
function generateSecureTemporaryPassword(length = 14) {
  const chars = ALPHA + DIGIT + SYMBOL;
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  // garantit au moins un chaque type
  return ensureComplexity(out);
}

function ensureComplexity(s) {
  const arr = [...s];
  arr[2] = ALPHA[crypto.randomInt(ALPHA.length)];
  arr[4] = DIGIT[crypto.randomInt(DIGIT.length)];
  arr[6] = SYMBOL[crypto.randomInt(SYMBOL.length)];
  return arr.join("");
}

module.exports = { generateSecureTemporaryPassword };
