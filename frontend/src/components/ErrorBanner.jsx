// ============================================================
// ErrorBanner.jsx — Bandeau d'erreur persistant
// (erreurs importantes / échecs de chargement qui bloquent le contenu)
// ============================================================
import { BNA } from "../styles/theme";

export default function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={styles.box}>⚠️ {message}</div>;
}

const styles = {
  box: {
    background: BNA.dangerSoft,
    border: "1px solid #FFCCCC",
    borderRadius: 12,
    padding: "10px 14px",
    color: BNA.danger,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
  },
};
