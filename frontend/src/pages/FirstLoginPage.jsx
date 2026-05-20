// ============================================================
// FirstLoginPage.jsx — Obligation de changer le mot de passe (MCP)
// ------------------------------------------------------------
// Affichée quand dbo.Users.must_change_password = 1 jusqu’à ce que
// POST /api/auth/change-password réussisse. Design aligné avec Login.jsx.
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../services/authService";
import { BNA, GRADIENTS } from "../styles/theme";
import BackgroundFX from "../components/BackgroundFX";

export default function FirstLoginPage({ user, onLogin }) {
  const [currentPw, setCurrentPw]       = useState("");
  const [newPw, setNewPw]             = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPw !== confirmPw) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const refreshed = await changePassword(currentPw, newPw);
      onLogin?.(refreshed);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Erreur.");
    } finally {
      setLoading(false);
    }
  };

  const fullName = user?.prenom ? `${user.prenom} ${user.nom || ""}`.trim() : user?.nom;

  return (
    <div style={styles.page}>
      <BackgroundFX />
      <div style={styles.card}>
        <div style={styles.glow} />
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            SÉCURITÉ DU COMPTE BNA
          </div>
          <h1 style={styles.title}>Changement de mot de passe obligatoire</h1>
          <p style={styles.lead}>
            Bonjour <b>{fullName}</b>, une connexion sécurisée nécessite de personnaliser
            votre secret immédiatement (email reçu lors de votre création de compte).
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <Field label="Mot de passe temporaire actuel">
            <input
              type="password"
              required
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              style={styles.input}
            />
          </Field>
          <Field label="Nouveau mot de passe (min 10 caractères, lettre + chiffre)">
            <input
              type="password"
              required
              minLength={10}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              style={styles.input}
            />
          </Field>
          <Field label="Confirmation">
            <input
              type="password"
              required
              minLength={10}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              style={styles.input}
            />
          </Field>
          {error && <div style={styles.error}>⚠️ {error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.8 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Enregistrement…" : "Valider mon nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    position: "relative",
    fontFamily: "Inter, Segoe UI, sans-serif",
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 460,
    background:
      "linear-gradient(155deg, rgba(255,255,255,0.96) 0%, rgba(240,250,246,0.9) 100%)",
    borderRadius: 26,
    padding: "36px 32px",
    border: "1px solid rgba(0,154,106,0.18)",
    boxShadow: "0 28px 70px rgba(0,90,60,0.15)",
  },
  glow: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${BNA.greenMid}35, transparent 65%)`,
    filter: "blur(8px)",
    pointerEvents: "none",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: BNA.greenLight,
    color: BNA.greenDark,
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: BNA.greenMid,
  },
  title: {
    margin: "0 0 8px",
    fontSize: 24,
    fontWeight: 800,
    color: BNA.textDark,
    letterSpacing: -0.5,
  },
  lead: {
    margin: 0,
    color: BNA.textMuted,
    fontSize: 14,
    lineHeight: 1.55,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: BNA.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 12,
    border: `1.5px solid ${BNA.border}`,
    padding: "12px 14px",
    fontSize: 14,
    outline: "none",
  },
  error: {
    background: BNA.dangerSoft,
    color: BNA.danger,
    padding: "10px 14px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
  },
  btn: {
    marginTop: 10,
    background: GRADIENTS.brand,
    color: "#fff",
    border: "none",
    borderRadius: 14,
    padding: "15px",
    fontSize: 15,
    fontWeight: 800,
    boxShadow: "0 12px 32px rgba(0,154,106,0.32)",
  },
};
