// ============================================================
// services/authService.js
// ------------------------------------------------------------
// Service côté client pour l'authentification :
//   • login()      → POST /api/auth/login    (renvoie le user + token)
//   • fetchMe()    → GET  /api/auth/me       (rafraîchit le profil)
//   • logout()     → vide le localStorage
//   • getToken() / getStoredUser() / isTokenValid()  → helpers locaux
//
// Le token JWT est stocké dans localStorage (clé "bna_token") et
// joint manuellement aux requêtes via l'en-tête Authorization.
// ============================================================
import { API_BASE } from "../config";

const TOKEN_KEY = "bna_token";
const USER_KEY  = "bna_user";

/** @returns {string|null}  Le JWT brut stocké ou null. */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * @returns {object|null}  L'utilisateur stocké lors du dernier login,
 *                         ou null s'il n'y en a pas (ou si JSON cassé).
 */
export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Décode (sans VÉRIFIER la signature) le payload d'un JWT et renvoie
 * son timestamp d'expiration en millisecondes, ou null s'il est absent.
 * NB : la vérification réelle est faite côté serveur — ici on s'en sert
 * uniquement pour ne pas envoyer un token déjà périmé.
 */
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isTokenValid(token = getToken()) {
  if (!token) return false;
  const exp = tokenExpiry(token);
  return exp ? Date.now() < exp : true;
}

/**
 * Authentifie l'utilisateur auprès du backend.
 * Stocke le token + le user dans localStorage en cas de succès.
 *
 * @param   {string} email
 * @param   {string} password
 * @returns {Promise<object>}  L'utilisateur public renvoyé par le backend
 * @throws  {Error}            Si la connexion échoue (mauvais identifiants…)
 */
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let data = {};
  try { data = await res.json(); } catch { /* corps non JSON */ }

  if (!res.ok) {
    throw new Error(data.error || "Échec de la connexion.");
  }

  saveSession(data.token, data.user);
  return data.user;
}

/**
 * Rafraîchit le profil de l'utilisateur depuis le backend
 * (utile au démarrage : si le token est encore valide, on évite
 * de redemander le mot de passe).
 *
 * @returns {Promise<object>}  L'utilisateur public
 * @throws  {Error}            Si le token est invalide / expiré
 */
export async function fetchMe() {
  const token = getToken();
  if (!token) throw new Error("Aucun token.");

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    clearSession();
    throw new Error("Session expirée.");
  }
  if (!res.ok) {
    throw new Error("Erreur serveur lors de la vérification de session.");
  }

  const data = await res.json();
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

/** Vide la session locale (token + user). */
export function logout() {
  clearSession();
}

/**
 * Changement MCP / volontaire — renvoie un JWT frais après succès.
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export async function changePassword(currentPassword, newPassword) {
  const token = getToken();
  if (!token) throw new Error("Aucun token.");

  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  let data = {};
  try { data = await res.json(); } catch { /* corps non JSON */ }

  if (!res.ok) {
    throw new Error(data.error || "Échec du changement de mot de passe.");
  }

  saveSession(data.token, data.user);
  return data.user;
}
