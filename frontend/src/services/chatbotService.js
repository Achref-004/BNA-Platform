// ============================================================
// services/chatbotService.js
// ------------------------------------------------------------
// Envoie une question au chatbot IA (Groq + SQL Server).
// Le backend traduit la question en SQL, l'exécute, puis
// formate la réponse en langage naturel.
// ============================================================
import { API_BASE } from "../styles/theme";
import { getToken } from "./authService";

/**
 * Pose une question au chatbot BNA.
 *
 * @param   {string} question  Texte saisi par l'utilisateur
 * @param   {object} user      Utilisateur courant (envoyé au backend pour personnaliser la réponse)
 * @returns {Promise<{response:string, debug_sql?:string}>}
 * @throws  {Error}            Avec le message renvoyé par le backend
 */
export async function askChatbot(question, user) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question, user }),
  });

  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    throw new Error(data.response || data.error || "Erreur du chatbot.");
  }
  return data;
}
