// ============================================================
// services/messageService.js — Clients REST messagerie
// ------------------------------------------------------------
// Threads + posts (voir backend/controllers/messageController.js).
// JWT joint automatiquement (Authorization Bearer).
// ============================================================
import { API_BASE } from "../config";
import { getToken } from "./authService";

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
}

async function handle(res) {
  let data = {};
  try { data = await res.json(); } catch { /* no json */ }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

/** POST nouveau fil ou nouveau message utilisateur ({ thread_id?, sujet?, message }) */
export async function sendUserMessage(payload) {
  const res = await fetch(`${API_BASE}/messages`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function listMyThreads() {
  const res = await fetch(`${API_BASE}/messages/my-threads`, { headers: authHeaders() });
  return handle(res);
}

export async function getMyThread(id) {
  const res = await fetch(`${API_BASE}/messages/my-threads/${id}`, { headers: authHeaders() });
  return handle(res);
}

/** Admin */
export async function adminListThreads(params = {}) {
  const qs = new URLSearchParams({
    search:   params.search   || "",
    role:     params.role     || "",
    page:     String(params.page     || 1),
    pageSize: String(params.pageSize || 12),
    sort:     params.sort     || "updated_desc",
  });
  const res = await fetch(`${API_BASE}/messages/admin/threads?${qs}`, { headers: authHeaders() });
  return handle(res);
}

export async function adminThreadDetail(id) {
  const res = await fetch(`${API_BASE}/messages/admin/threads/${id}`, { headers: authHeaders() });
  return handle(res);
}

export async function adminReplyThread(id, body) {
  const res = await fetch(`${API_BASE}/messages/admin/threads/${id}/reply`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ message: body }),
  });
  return handle(res);
}

export async function adminDeleteThread(id) {
  const res = await fetch(`${API_BASE}/messages/admin/threads/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handle(res);
}

/** Résumés globaux polling (voir /api/notifications/summary). */
export async function fetchNotificationsSummary() {
  const res = await fetch(`${API_BASE}/notifications/summary`, { headers: authHeaders() });
  return handle(res);
}
