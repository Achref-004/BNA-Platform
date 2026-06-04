// ============================================================
// WelcomeCard.jsx — Page Welcome (visuel premium)
// Aucune logique modifiée : mêmes handlers, mêmes routes.
// ============================================================
import { useNavigate } from "react-router-dom";
import { BNA, GRADIENTS } from "../styles/theme";
import { useChatbot } from "../context/ChatbotContext";
import BackgroundFX from "./BackgroundFX";

export default function WelcomeCard({ user, onLogout }) {
  const navigate = useNavigate();
  const { openChatbot } = useChatbot();
  const isAdmin = user?.role === "Admin";

  return (
    <div style={styles.page}>
      <BackgroundFX />

      {/* Logo BNA — coin haut gauche, élégant */}
      <div style={styles.logoCorner}>
        <img
          src="/bna-logo.png"
          alt="BNA Bank"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
          style={styles.logoImg}
        />
        <div style={styles.brandWordmark}>
          <div style={styles.brandLine1}>BNA</div>
          <div style={styles.brandLine2}>BANK</div>
        </div>
      </div>

      {/* Bouton déconnexion (haut droite) */}
      <button onClick={onLogout} style={styles.logoutTop} title="Se déconnecter"
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.95)";
          e.currentTarget.style.borderColor = "rgba(0,154,106,0.35)";
        }}
        onMouseOut={(e)  => {
          e.currentTarget.style.background = "rgba(255,255,255,0.75)";
          e.currentTarget.style.borderColor = "rgba(0,154,106,0.18)";
        }}
      >
        Déconnexion ⏏
      </button>

      <div style={styles.container}>
        {/* ── Bloc gauche : illustration + titre ── */}
        <section style={styles.left}>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            ESPACE PROFESSIONNEL
          </div>

          <h1 style={styles.title}>
            Bienvenue dans votre<br />
            <span style={styles.titleAccent}>espace BNA</span>
          </h1>

          <p style={styles.lead}>
            Pilotez vos placements, suivez vos objectifs et discutez avec votre
            assistant intelligent — depuis une interface unifiée.
          </p>

          {/* Carte utilisateur (glassmorphism) */}
          <div style={styles.userCard}>
            <div style={styles.userCardGlow} />
            <div style={styles.avatar}>
              {(user?.prenom || user?.nom || user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={styles.userName}>
                {user?.prenom ? `${user.prenom} ${user.nom || ""}` : (user?.nom || user?.name || "Utilisateur")}
              </div>
              <div style={styles.userMeta}>
                <span style={{ opacity: 0.85 }}>{user?.email}</span>
                {user?.role && <span style={styles.rolePill}>{user.role}</span>}
              </div>
            </div>
          </div>

      
        </section>

        {/* ── Bloc droit : 3 grands boutons (logique identique) ── */}
        <section style={styles.right}>
          <ActionCard
            tone="primary"
            icon={<DashIcon />}
            title="Dashboard"
            text="Visualisez vos KPI Power BI en temps réel."
            onClick={() => navigate("/dashboard")}
          />
          <ActionCard
            tone="ai"
            icon={<BotIcon />}
            title="AI Assistant"
            text="Posez vos questions en langage naturel."
            onClick={() => openChatbot()}
            badge="IA"
          />
          <ActionCard
            tone="mint"
            icon={<ChartUpIcon />}
            title="Prévision"
            text="Anticipation des placements."
            onClick={() => navigate("/prevision")}
          />
          {isAdmin && (
            <>
              <ActionCard
                tone="primary"
                icon={<AdminIcon />}
                title="Administration"
                text="Gérer les utilisateurs."
                onClick={() => navigate("/utilisateurs")}
              />
              <ActionCard
                tone="mint"
                icon={<MailIcon />}
                title="Administration"
                text="Gérer les messages."
                onClick={() => navigate("/admin/messages")}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── Sous-composants visuels ─── */


function ActionCard({ tone, icon, title, text, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.actionCard,
        ...(          tone === "ai"      ? styles.actionAI :
           tone === "mint"     ? styles.actionMint :
                                 styles.actionPrimary),
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow =
          "0 30px 60px rgba(0,40,25,0.45), inset 0 1px 0 rgba(255,255,255,0.25)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow =
          "0 18px 40px rgba(0,40,25,0.28), inset 0 1px 0 rgba(255,255,255,0.18)";
      }}
    >
      <div style={styles.actionShine} />
      <div style={styles.actionIconWrap}>{icon}</div>
      <div style={{ flex: 1, textAlign: "left", position: "relative", zIndex: 1 }}>
        <div style={styles.actionTitleRow}>
          <span>{title}</span>
          {badge && <span style={styles.badge}>{badge}</span>}
        </div>
        <div style={styles.actionText}>{text}</div>
      </div>
      <span style={styles.actionArrow}>›</span>
    </button>
  );
}

/* ─── Icônes ─── */
function DashIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3"  width="7" height="9"  rx="1.5" />
      <rect x="14" y="3" width="7" height="5"  rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5"  rx="1.5" />
    </svg>
  );
}
function BotIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" fill="#fff" />
      <circle cx="9"  cy="14" r="1" fill="#fff" />
      <circle cx="15" cy="14" r="1" fill="#fff" />
    </svg>
  );
}
function ChartUpIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 9 11 13 15 21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}
function AdminIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9.5 12l2 2 3.5-4" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

/* ─── Styles ─── */
const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    fontFamily: "Inter, Segoe UI, sans-serif",
    color: BNA.textDark,
    padding: "32px 28px",
    boxSizing: "border-box",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  logoCorner: {
    position: "absolute", top: 22, left: 28, zIndex: 5,
    display: "flex", alignItems: "center", gap: 12,
  },
  logoImg: {
    width: 44, height: 44, objectFit: "contain",
    filter: "drop-shadow(0 8px 20px rgba(0,90,60,0.18))",
    background: BNA.white,
    borderRadius: 10, padding: 4,
    border: "1px solid rgba(0,154,106,0.15)",
  },
  brandWordmark: { display: "flex", flexDirection: "column", lineHeight: 1 },
  brandLine1: {
    fontSize: 18, fontWeight: 900, letterSpacing: 1.5,
    color: BNA.greenDark,
  },
  brandLine2: {
    fontSize: 11, fontWeight: 700, letterSpacing: 4,
    color: BNA.steel, marginTop: 2,
  },

  logoutTop: {
    position: "absolute", top: 24, right: 28, zIndex: 5,
    background: "rgba(255,255,255,0.75)",
    color: BNA.greenDark,
    border: "1px solid rgba(0,154,106,0.18)",
    padding: "9px 18px", borderRadius: 22,
    fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    letterSpacing: 0.2,
    boxShadow: "0 6px 18px rgba(0,90,60,0.08)",
    transition: "background 0.25s, border-color 0.25s",
  },

  container: {
    width: "100%", maxWidth: 1240,
    display: "grid", gridTemplateColumns: "1.05fr 1fr",
    gap: 64, alignItems: "center",
    position: "relative", zIndex: 1,
    animation: "bna-fade-up 0.6s ease-out",
  },

  left: { display: "flex", flexDirection: "column", gap: 22 },

  eyebrow: {
    display: "inline-flex", alignItems: "center", gap: 10,
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,154,106,0.2)",
    color: BNA.greenDark,
    padding: "6px 14px", borderRadius: 999,
    fontSize: 11, fontWeight: 800, letterSpacing: 2,
    width: "fit-content",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 4px 14px rgba(0,90,60,0.06)",
  },
  eyebrowDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: BNA.greenMid,
    boxShadow: `0 0 14px ${BNA.greenMid}`,
  },

  title: {
    fontSize: 56, fontWeight: 800, margin: 0,
    lineHeight: 1.05, letterSpacing: "-1.5px",
    color: BNA.textDark,
    textShadow: "0 4px 18px rgba(255,255,255,0.6)",
  },
  titleAccent: {
    background: `linear-gradient(90deg, ${BNA.greenMid} 0%, ${BNA.greenDark} 50%, ${BNA.greenMid} 100%)`,
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    animation: "bna-gradient-shift 6s linear infinite",
  },

  lead: {
    color: BNA.textMuted, fontSize: 16, lineHeight: 1.65,
    maxWidth: 520, margin: 0,
  },

  /* Carte utilisateur (glass clair) */
  userCard: {
    position: "relative",
    display: "flex", alignItems: "center", gap: 14,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(0,154,106,0.18)",
    backdropFilter: "blur(14px) saturate(160%)",
    WebkitBackdropFilter: "blur(14px) saturate(160%)",
    boxShadow: "0 14px 40px rgba(0,90,60,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
    padding: "16px 20px", borderRadius: 18,
    maxWidth: 480, marginTop: 6,
    overflow: "hidden",
  },
  userCardGlow: {
    position: "absolute", inset: -1,
    background: `linear-gradient(135deg, ${BNA.greenMid}22, transparent 55%)`,
    pointerEvents: "none",
  },
  avatar: {
    position: "relative",
    width: 52, height: 52, borderRadius: "50%",
    background: GRADIENTS.brand,
    color: "#fff", fontWeight: 800, fontSize: 20,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 10px 24px rgba(0,196,138,0.4), inset 0 1px 0 rgba(255,255,255,0.4)",
    flexShrink: 0,
  },
  userName: {
    fontSize: 17, fontWeight: 800, color: BNA.textDark,
    letterSpacing: -0.2,
  },
  userMeta: {
    fontSize: 12.5, color: BNA.textMuted, marginTop: 4,
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  },
  rolePill: {
    background: `linear-gradient(135deg, ${BNA.greenLight}, rgba(120,180,240,0.25))`,
    color: BNA.greenDark,
    padding: "3px 10px", borderRadius: 12,
    fontSize: 10, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: 1,
    border: "1px solid rgba(0,154,106,0.3)",
  },

  /* Stats décoratifs */
  statsRow: { display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" },
  statChip: {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,154,106,0.15)",
    backdropFilter: "blur(10px) saturate(160%)",
    WebkitBackdropFilter: "blur(10px) saturate(160%)",
    boxShadow: "0 6px 18px rgba(0,90,60,0.06)",
    padding: "10px 16px", borderRadius: 14,
    display: "flex", flexDirection: "column", gap: 2,
    minWidth: 96,
  },
  statValue: {
    fontSize: 14, fontWeight: 800, color: BNA.greenDark,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 10, fontWeight: 700,
    color: BNA.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
  },

  /* Bloc droit */
  right: {
    display: "flex", flexDirection: "column", gap: 16,
  },

  /* Carte d'action (3 boutons) */
  actionCard: {
    position: "relative",
    display: "flex", alignItems: "center", gap: 18,
    padding: "22px 24px", borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    cursor: "pointer", textAlign: "left",
    boxShadow: "0 18px 40px rgba(0,40,25,0.28), inset 0 1px 0 rgba(255,255,255,0.18)",
    transition: "transform 0.28s cubic-bezier(.2,.7,.2,1), box-shadow 0.28s",
    overflow: "hidden",
  },
  actionPrimary: {
    background:
      `linear-gradient(135deg, rgba(0,196,138,0.95) 0%, rgba(0,107,71,0.95) 100%),` +
      `radial-gradient(circle at 80% 0%, rgba(124,255,208,0.5), transparent 60%)`,
  },
  actionAI: {
    background:
      `linear-gradient(135deg, rgba(0,154,106,0.95) 0%, rgba(0,63,42,0.95) 100%),` +
      `radial-gradient(circle at 80% 0%, rgba(124,255,208,0.45), transparent 60%)`,
  },
  actionMint: {
    background:
      `linear-gradient(135deg, rgba(0,196,138,0.85) 0%, rgba(0,154,106,0.9) 100%)`,
  },
  actionShine: {
    position: "absolute", top: -50, right: -50,
    width: 160, height: 160, borderRadius: "50%",
    background: `radial-gradient(circle, rgba(255,255,255,0.25), transparent 70%)`,
    pointerEvents: "none",
  },
  actionIconWrap: {
    position: "relative", zIndex: 1,
    width: 58, height: 58, borderRadius: 16,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.3)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
  },
  actionTitleRow: {
    fontSize: 19, fontWeight: 800,
    display: "flex", alignItems: "center", gap: 10,
    letterSpacing: -0.2,
  },
  badge: {
    background: "#fff", color: BNA.greenDark,
    padding: "2px 9px", borderRadius: 12,
    fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
  },
  actionText: {
    fontSize: 13, opacity: 0.92, marginTop: 5,
    color: "rgba(255,255,255,0.92)",
  },
  actionArrow: {
    fontSize: 32, opacity: 0.6, marginLeft: 4,
    position: "relative", zIndex: 1,
    transition: "transform 0.2s",
  },
};
