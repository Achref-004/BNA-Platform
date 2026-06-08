// ============================================================
// services/apiClient.js — Helpers HTTP partagés
// ------------------------------------------------------------
// Centralise la construction des en-têtes d'authentification et
// le parsing des réponses fetch, factorisés depuis les différents
// services REST (users, messages, forecast, chatbot).
// ============================================================
import { getToken } from "./authService";

/** Construit les en-têtes d'authentification (+ extras éventuels). */
export function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Parse une réponse fetch :
 *   • lit le JSON si présent
 *   • lève une Error contenant `error` (renvoyé par le backend) si !res.ok
 */
export async function handle(res) {
  let data = {};
  try { data = await res.json(); } catch { /* corps non JSON */ }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}
