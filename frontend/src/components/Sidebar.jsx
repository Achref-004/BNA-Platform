// ============================================================
// Sidebar.jsx — Navigation latérale (identique sur toutes les
// pages sauf la page Welcome).
//
// Rôles et liens affichés :
//   • TOUS les utilisateurs   : Dashboard, AI Assistant, Prévision
//   • Agence / DR / DC        : + Messagerie (pastille nouvelles réponses admin)
//   • Admin                   : + Utilisateurs, Messages reçus (pastille threads)
// ============================================================
import { NavLink, useNavigate } from "react-router-dom";
import { BNA, GRADIENTS } from "../styles/theme";
import { useChatbot } from "../context/ChatbotContext";
import useNotificationSummary from "../hooks/useNotificationSummary";

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const { open: isChatOpen, toggleChatbot } = useChatbot();
  const isAdmin    = user?.role === "Admin";
  const canMessagerie =
    ["Agence", "Direction regional", "Direction central"].includes(user?.role);

  const {
    adminPendingThreads,
    collaboratorUnseenReplies,
  } = useNotificationSummary(user);

  return (
    <aside style={styles.sidebar}>
      <div style={styles.sidebarGlow} aria-hidden />

      <div style={styles.brand}>
        <div style={styles.logo}>
          <img
            src="/bna-logo.png"
            alt="BNA Bank"
            onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
            style={styles.logoImg}
          />
          <div style={styles.logoFallback}>
            <svg width="36" height="36" viewBox="0 0 70 70">
              <defs>
                <linearGradient id="sb-g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%"  stopColor={BNA.greenMid} />
                  <stop offset="100%" stopColor={BNA.greenDark} />
                </linearGradient>
              </defs>
              <rect width="70" height="70" rx="16" fill="url(#sb-g)" />
              <text x="35" y="46" textAnchor="middle" fill="white"
                fontSize="22" fontWeight="900" fontFamily="Inter, Segoe UI, sans-serif">B</text>
            </svg>
          </div>
        </div>
        <div>
          <div style={styles.brandTitle}>BNA Bank</div>
          <div style={styles.brandSub}>Espace placements</div>
        </div>
      </div>

      <div style={styles.userBox}>
        <div style={styles.avatar}>
          {(user?.prenom || user?.nom || user?.name || "U").charAt(0).toUpperCase()}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={styles.userName}>
            {user?.prenom ? `${user.prenom} ${user.nom || ""}` : (user?.nom || user?.name || "Utilisateur")}
          </div>
          <div style={styles.userRole}>{user?.role || "—"}</div>
        </div>
      </div>

      <nav style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}>
        <SectionLabel>Navigation</SectionLabel>

        <NavItem to="/dashboard" icon={DashboardIcon} label="Dashboard" />

        <button
          onClick={() => toggleChatbot()}
          style={{
            ...styles.navBtn,
            ...(isChatOpen ? styles.navBtnActive : {}),
          }}
          onMouseOver={(e) => {
            if (!isChatOpen) Object.assign(e.currentTarget.style, styles.navBtnHover);
          }}
          onMouseOut={(e)  => {
            if (!isChatOpen) Object.assign(e.currentTarget.style, styles.navBtn);
          }}
          title={isChatOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        >
          <BotIcon color={isChatOpen ? "#fff" : BNA.textMuted} />
          <span>AI Assistant</span>
          <span style={{
            ...styles.badge,
            background: isChatOpen ? "rgba(255,255,255,0.25)" : BNA.green,
          }}>{isChatOpen ? "ON" : "IA"}</span>
        </button>

        <NavItem to="/prevision" icon={ChartIcon} label="Prévision" />

        {canMessagerie && (
          <NavItem
            to="/messagerie"
            icon={MailIcon}
            label="Messagerie"
            badgeCount={collaboratorUnseenReplies}
          />
        )}

        {isAdmin && (
          <>
            <SectionLabel>Administration</SectionLabel>
            <NavItem to="/utilisateurs" icon={UsersIcon} label="Utilisateurs" />
            <NavItem
              to="/admin/messages"
              icon={InboxIcon}
              label="Messages reçus"
              badgeCount={adminPendingThreads}
            />
          </>
        )}
      </nav>

      <div style={{ padding: "12px 14px 18px" }}>
        <button
          onClick={() => { onLogout?.(); navigate("/login", { replace: true }); }}
          style={styles.logoutBtn}
          onMouseOver={(e) => (e.currentTarget.style.background = BNA.dangerSoft)}
          onMouseOut={(e)  => (e.currentTarget.style.background = "transparent")}
        >
          <LogoutIcon /> Déconnexion
        </button>
        <div style={styles.footer}>© {new Date().getFullYear()} BNA</div>
      </div>
    </aside>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
      color: BNA.textMuted, padding: "14px 14px 6px",
      textTransform: "uppercase",
    }}>{children}</div>
  );
}

function NavItem({ to, icon: Icon, label, badgeCount = 0 }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      ...styles.navBtn,
      ...(isActive ? styles.navBtnActive : {}),
    })}>
      {({ isActive }) => (
        <>
          <Icon color={isActive ? "#fff" : BNA.textMuted} />
          <span>{label}</span>
          {badgeCount > 0 && (
            <span style={{
              ...styles.badge,
              marginLeft: "auto",
              background: isActive ? "rgba(255,255,255,0.25)" : BNA.danger,
              color: "#fff",
            }}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          {isActive && badgeCount === 0 && (
            <span style={{ marginLeft: "auto", fontSize: 14 }}>›</span>
          )}
        </>
      )}
    </NavLink>
  );
}

function DashboardIcon({ color = "#5A7A70" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3"  width="7" height="9"  rx="1.5" />
      <rect x="14" y="3" width="7" height="5"  rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5"  rx="1.5" />
    </svg>
  );
}

function BotIcon({ color = "#5A7A70" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" />
      <circle cx="9"  cy="14" r="1" fill={color} />
      <circle cx="15" cy="14" r="1" fill={color} />
    </svg>
  );
}

function ChartIcon({ color = "#5A7A70" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17 9 11 13 15 21 7" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

function UsersIcon({ color = "#5A7A70" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function MailIcon({ color = "#5A7A70" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

function InboxIcon({ color = "#5A7A70" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BNA.danger}
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const styles = {
  sidebar: {
    flexShrink: 0,
    alignSelf: "stretch",
    width: 260,
    minWidth: 260,
    height: "100%",
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    color: BNA.textDark,
    borderRight: "1px solid rgba(255,255,255,0.6)",
    display: "flex", flexDirection: "column",
    fontFamily: "Inter, Segoe UI, sans-serif",
    boxShadow: "8px 0 32px rgba(0,90,60,0.08)",
    zIndex: 2,
    overflow: "hidden",
  },
  sidebarGlow: {
    position: "absolute", top: -120, left: -120,
    width: 320, height: 320, borderRadius: "50%",
    background: `radial-gradient(circle, ${BNA.greenMid}22, transparent 65%)`,
    filter: "blur(8px)", pointerEvents: "none",
  },

  brand: {
    position: "relative",
    display: "flex", alignItems: "center", gap: 12,
    padding: "22px 18px",
    borderBottom: "1px solid rgba(0,90,60,0.08)",
  },
  logo: { display: "flex", position: "relative" },
  logoImg: {
    width: 44, height: 44, objectFit: "contain",
    borderRadius: 12, padding: 3,
    background: BNA.white,
    boxShadow: "0 8px 22px rgba(0,154,106,0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  logoFallback: { display: "none" },
  brandTitle: {
    fontWeight: 900, fontSize: 17, color: BNA.textDark,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 10.5, color: BNA.textMuted, marginTop: 3,
    letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 600,
  },

  userBox: {
    position: "relative",
    display: "flex", alignItems: "center", gap: 12,
    padding: "16px 18px", margin: "12px 12px 6px",
    borderRadius: 14,
    background: `linear-gradient(135deg, ${BNA.greenSoft}, ${BNA.greenLight})`,
    border: "1px solid rgba(0,154,106,0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
  },
  avatar: {
    width: 40, height: 40, borderRadius: "50%",
    background: GRADIENTS.brand,
    color: "#fff", fontWeight: 800, fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 8px 20px rgba(0,154,106,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
  },
  userName: {
    fontSize: 13.5, fontWeight: 700, color: BNA.textDark,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    letterSpacing: -0.2,
  },
  userRole: {
    fontSize: 10.5, color: BNA.greenDark, marginTop: 3,
    fontWeight: 700, letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  navBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "11px 14px", border: "none", background: "transparent",
    borderRadius: 12, cursor: "pointer", textDecoration: "none",
    color: BNA.textDark, fontSize: 13.5, fontWeight: 600,
    width: "100%", textAlign: "left",
    transition: "all 0.22s cubic-bezier(.2,.7,.2,1)",
    position: "relative",
  },
  navBtnHover: {
    background: BNA.greenSoft,
    color: BNA.greenDark,
    transform: "translateX(2px)",
  },
  navBtnActive: {
    background: GRADIENTS.brand,
    color: "#fff",
    boxShadow: "0 10px 24px rgba(0,154,106,0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
  },
  badge: {
    marginLeft: "auto", fontSize: 9.5, fontWeight: 800,
    background: BNA.green, color: "#fff",
    padding: "3px 8px", borderRadius: 10,
    letterSpacing: 0.5,
    boxShadow: "0 4px 10px rgba(0,154,106,0.3)",
  },

  logoutBtn: {
    display: "flex", alignItems: "center", gap: 10,
    width: "100%", padding: "12px 14px",
    border: "1px solid rgba(213,63,63,0.18)",
    borderRadius: 12, background: "transparent",
    color: BNA.danger, fontSize: 13, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s",
    letterSpacing: 0.2,
  },
  footer: {
    textAlign: "center", marginTop: 14,
    fontSize: 10.5, color: BNA.textMuted,
    letterSpacing: 1, fontWeight: 600,
  },
};
