// ============================================================
// Splash.jsx
// ------------------------------------------------------------
// Écran de démarrage affiché pendant la vérification du JWT
// au chargement de l'application (boot phase).
// Purement visuel — aucune logique.
// ============================================================
import { BNA } from "../styles/theme";

export default function Splash() {
  return (
    <div style={styles.page}>
      <div style={styles.spinner} />
      <div style={styles.label}>Chargement de votre espace BNA…</div>
      <style>{`@keyframes bna-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: `linear-gradient(145deg, ${BNA.greenDark}, ${BNA.green}, ${BNA.greenMid})`,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    color: "#fff", fontFamily: "Inter, Segoe UI, sans-serif",
  },
  spinner: {
    width: 56, height: 56, borderRadius: "50%",
    border: "5px solid rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
    animation: "bna-spin 0.9s linear infinite",
    marginBottom: 16,
  },
  label: { fontSize: 16, fontWeight: 600, letterSpacing: 0.5 },
};
