// ============================================================
// services/forecastService.js — Client API /api/forecast/*
// ============================================================
import { API_BASE } from "../config";
import { authHeaders, handle } from "./apiClient";

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
