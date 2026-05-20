// ============================================================
// Dashboard.jsx — Embed du rapport Power BI (visuel premium)
// Aucune logique modifiée.
// ============================================================
import { useState } from "react";
import { BNA, GRADIENTS, GLASS, POWERBI_EMBED_URL } from "../styles/theme";

export default function Dashboard() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            REPORTING TEMPS RÉEL
          </div>
          <h1 style={styles.title}>Dashboard Power BI</h1>
          <p style={styles.subtitle}>
            Pilotage des placements — vue consolidée des KPI BNA.
          </p>
        </div>
        <a
          href={POWERBI_EMBED_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.openBtn}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 18px 38px rgba(0,154,106,0.45)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,154,106,0.3)";
          }}
        >
          Ouvrir en plein écran ↗
        </a>
      </div>

      <div style={styles.frameBox}>
        <div style={styles.frameRing} aria-hidden />

        {!loaded && (
          <div style={styles.loader}>
            <div style={styles.spinner} />
            <div style={{ marginTop: 16, color: BNA.textMuted, fontSize: 14, fontWeight: 600, letterSpacing: 0.3 }}>
              Chargement du dashboard Power BI…
            </div>
          </div>
        )}

        <iframe
          title="BNA Dashboard"
          src={POWERBI_EMBED_URL}
          onLoad={() => setLoaded(true)}
          style={{
            width: "100%", height: "100%",
            border: "none", display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.45s",
            position: "relative", zIndex: 1,
          }}
          allowFullScreen
        />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex", flexDirection: "column",
    height: "100%", padding: "26px 28px", gap: 18,
    boxSizing: "border-box",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 12,
  },
  eyebrow: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: BNA.greenLight, color: BNA.greenDark,
    padding: "5px 12px", borderRadius: 999,
    fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4,
    marginBottom: 8,
    border: "1px solid rgba(0,154,106,0.18)",
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: BNA.greenMid,
    boxShadow: `0 0 10px ${BNA.greenMid}`,
  },
  title: {
    margin: 0, fontSize: 28, color: BNA.textDark, fontWeight: 800,
    letterSpacing: -0.7,
  },
  subtitle: {
    margin: "6px 0 0", color: BNA.textMuted, fontSize: 13.5, fontWeight: 500,
  },

  openBtn: {
    background: GRADIENTS.brand,
    color: "#fff",
    padding: "12px 20px", borderRadius: 12,
    textDecoration: "none", fontSize: 13, fontWeight: 700,
    boxShadow: "0 10px 24px rgba(0,154,106,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
    transition: "transform 0.22s, box-shadow 0.22s",
    letterSpacing: 0.2,
  },

  frameBox: {
    position: "relative",
    flex: 1, minHeight: 380,
    ...GLASS.surface,
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid rgba(0,154,106,0.12)",
  },
  frameRing: {
    position: "absolute", inset: 0,
    borderRadius: 22, pointerEvents: "none",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
  },

  loader: {
    position: "absolute", inset: 0,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    zIndex: 2,
  },
  spinner: {
    width: 48, height: 48, borderRadius: "50%",
    border: `4px solid ${BNA.greenLight}`,
    borderTopColor: BNA.green,
    animation: "bna-spin 0.9s linear infinite",
    boxShadow: "0 0 28px rgba(0,196,138,0.35)",
  },
};
