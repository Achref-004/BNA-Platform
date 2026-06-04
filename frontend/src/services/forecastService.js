// ============================================================
// services/forecastService.js — Client API /api/forecast/*
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
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

export async function uploadForecastFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/forecast/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: fd,
  });
  return handle(res);
}

export async function trainForecast() {
  const res = await fetch(`${API_BASE}/forecast/train`, { headers: authHeaders() });
  return handle(res);
}

export async function getForecastResults() {
  const res = await fetch(`${API_BASE}/forecast/results`, { headers: authHeaders() });
  return handle(res);
}

export async function getForecastPreview() {
  const res = await fetch(`${API_BASE}/forecast/predict`, { headers: authHeaders() });
  return handle(res);
}

export async function getForecastStatus() {
  const res = await fetch(`${API_BASE}/forecast/status`, { headers: authHeaders() });
  return handle(res);
}
