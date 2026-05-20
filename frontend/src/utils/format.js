// ============================================================
// utils/format.js
// ------------------------------------------------------------
// Helpers de formatage réutilisables.
// ============================================================

/**
 * Formate une date ISO (ou un Date) en JJ/MM/AAAA (locale fr-FR).
 * @param {string|Date|null|undefined} dt
 * @returns {string}  Date formatée ou "—" si invalide.
 */
export function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  });
}
