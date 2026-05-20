// ============================================================
// Login.jsx — Page de connexion BNA (visuel premium)
// Aucune logique modifiée.
// ============================================================
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { BNA, GRADIENTS } from "../styles/theme";
import BackgroundFX from "./BackgroundFX";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userObj = await login(email.trim(), password);
      onLogin?.(userObj);
      navigate(userObj?.must_change_password ? "/premiere-connexion" : "/", { replace: true });
    } catch (err) {
      setError(err.message || "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <BackgroundFX />

      <div style={styles.card}>
        <div style={styles.cardGlow} />

        <div style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
          
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            BNA BANK · PORTAIL SÉCURISÉ
          </div>
          <h1 style={styles.title}>Bienvenue</h1>
          <p style={styles.subtitle}>
            Connectez-vous pour accéder à votre espace.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, position: "relative" }}>
          <Field label="Adresse email">
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@bna.tn"
              style={styles.input}
              onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={(e)  => Object.assign(e.target.style, styles.input)}
            />
          </Field>

          <Field label="Mot de passe">
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: 46 }}
                onFocus={(e) => Object.assign(e.target.style, { ...styles.inputFocus, paddingRight: 46 })}
                onBlur={(e)  => Object.assign(e.target.style, { ...styles.input, paddingRight: 46 })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.eyeBtn}
                aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                <PasswordVisibilityIcon visible={showPass} />
              </button>
            </div>
          </Field>

          {error && (
            <div style={styles.error}>⚠️ {error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submit,
              opacity: loading ? 0.85 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 22px 50px rgba(0,196,138,0.55)";
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 14px 32px rgba(0,196,138,0.4)";
            }}
          >
            <span style={styles.submitShine} />
            <span style={{ position: "relative", zIndex: 1 }}>
              {loading ? "Connexion en cours…" : "Se connecter →"}
            </span>
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerDot}>•</span>
          © {new Date().getFullYear()} BNA Bank — Tous droits réservés
          <span style={styles.footerDot}>•</span>
        </div>
      </div>
    </div>
  );
}

function PasswordVisibilityIcon({ visible }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: BNA.greenDark,
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (visible) {
    return (
      <svg {...common}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M1 1l22 22" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{
        color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 700,
        display: "block", marginBottom: 8, letterSpacing: 0.6,
        textTransform: "uppercase",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputBase = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,0.85)",
  border: "1.5px solid rgba(0,154,106,0.18)",
  borderRadius: 12, padding: "14px 16px",
  color: BNA.textDark, fontSize: 15, outline: "none",
  transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
};

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "Inter, Segoe UI, sans-serif",
    padding: 24,
    overflow: "hidden",
  },

  card: {
    position: "relative", zIndex: 1,
    background:
      "linear-gradient(155deg, rgba(255,255,255,0.92) 0%, rgba(240,250,246,0.85) 100%)",
    border: "1px solid rgba(255,255,255,0.85)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    borderRadius: 28,
    padding: "44px 40px",
    width: "100%", maxWidth: 440,
    boxShadow: "0 30px 80px rgba(0,90,60,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
    overflow: "hidden",
    animation: "bna-pop 0.45s ease-out",
  },
  cardGlow: {
    position: "absolute", top: -110, right: -110,
    width: 300, height: 300, borderRadius: "50%",
    background: `radial-gradient(circle, ${BNA.greenMid}40, transparent 65%)`,
    filter: "blur(8px)", pointerEvents: "none",
  },

  eyebrow: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(0,154,106,0.2)",
    color: BNA.greenDark,
    padding: "5px 12px", borderRadius: 999,
    fontSize: 10, fontWeight: 800, letterSpacing: 1.6,
    marginBottom: 14,
    boxShadow: "0 4px 12px rgba(0,90,60,0.06)",
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: BNA.greenMid, boxShadow: `0 0 10px ${BNA.greenMid}`,
  },

  title: {
    color: BNA.textDark, fontSize: 30, fontWeight: 800,
    margin: "0 0 8px", letterSpacing: -0.8,
  },
  subtitle: {
    color: BNA.textMuted,
    fontSize: 14, margin: 0,
  },

  input: inputBase,
  inputFocus: {
    ...inputBase,
    borderColor: BNA.greenMid,
    background: BNA.white,
    boxShadow: `0 0 0 4px rgba(0,196,138,0.18)`,
  },

  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    padding: 0,
    background: "rgba(0,154,106,0.08)",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    transition: "background 0.15s",
  },

  error: {
    background: BNA.dangerSoft,
    border: "1px solid rgba(213,63,63,0.35)",
    color: BNA.danger,
    borderRadius: 10, padding: "11px 14px",
    fontSize: 13, fontWeight: 600,
  },

  submit: {
    position: "relative", overflow: "hidden",
    background: GRADIENTS.brand,
    color: "#fff", border: "none", borderRadius: 14,
    padding: "16px 18px", fontSize: 15, fontWeight: 800,
    marginTop: 6, letterSpacing: 0.3,
    boxShadow: "0 14px 32px rgba(0,154,106,0.32), inset 0 1px 0 rgba(255,255,255,0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  submitShine: {
    position: "absolute", inset: 0,
    background:
      "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
    backgroundSize: "200% 100%",
    animation: "bna-shimmer 3s linear infinite",
    pointerEvents: "none",
  },

  footer: {
    textAlign: "center", marginTop: 28,
    paddingTop: 18,
    borderTop: "1px solid rgba(0,154,106,0.12)",
    color: BNA.textMuted, fontSize: 11.5,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    letterSpacing: 0.3,
  },
  footerDot: { color: BNA.greenMid, fontSize: 14 },
};
