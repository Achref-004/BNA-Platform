// ============================================================
// services/userService.js
// ------------------------------------------------------------
// Client REST pour /api/users (réservé aux Admin).
// Toutes les requêtes joignent automatiquement le JWT via
// l'en-tête Authorization: Bearer <token>.
// ============================================================
import { API_BASE } from "../config";
import { getToken } from "./authService";

/** Construit les headers d'auth (+ extras éventuels). */
function authHeaders(extra = {}) {
  const headers = { ...extra };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
}

/**
 * Wrapper unique pour parser la réponse fetch :
 *   • lit le JSON si présent
 *   • lève une Error contenant `error` (renvoyé par le backend) si !res.ok
 */
async function handle(res) {
  let data = {};
  try { data = await res.json(); } catch { /* corps non JSON */ }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data;
}

/**
 * Liste paginée + filtrée des utilisateurs.
 * @returns {Promise<{ total:number, page:number, pageSize:number, pages:number, items:object[] }>}
 */
export async function listUsers({ search = "", role = "", statut = "", page = 1, pageSize = 10 } = {}) {
  const qs = new URLSearchParams({ search, role, statut, page, pageSize });
  const res = await fetch(`${API_BASE}/users?${qs.toString()}`, { headers: authHeaders() });
  return handle(res);
}

/** POST /api/users — création */
export async function createUser(payload) {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/** PUT /api/users/:id — mise à jour (mot de passe optionnel) */
export async function updateUser(id, payload) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

/** DELETE /api/users/:id — suppression */
export async function deleteUser(id) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handle(res);
}

/** GET /api/users/_meta/options — listes des rôles et statuts */
export async function getOptions() {
  const res = await fetch(`${API_BASE}/users/_meta/options`, { headers: authHeaders() });
  return handle(res);
}
