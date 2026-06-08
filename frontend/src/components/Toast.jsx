// ============================================================
// Toast.jsx — Toast vert éphémère ancré en bas de l'écran
// (retours d'action brefs : envoi, suppression, succès…)
// ============================================================
import { BNA } from "../styles/theme";

export default function Toast({ message }) {
  if (!message) return null;
  return <div style={styles.toast}>{message}</div>;
}

const styles = {
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: BNA.greenDark,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    zIndex: 10001,
  },
};
