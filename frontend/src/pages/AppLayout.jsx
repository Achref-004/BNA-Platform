// ============================================================
// AppLayout.jsx — Layout commun (Sidebar + contenu)
// Fond premium clair pour les pages internes.
// ============================================================
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { BNA, GRADIENTS } from "../styles/theme";

export default function AppLayout({ user, onLogout }) {
  return (
    <div style={{
      display: "flex",
      height: "100vh",
      minHeight: "100vh",
      position: "relative",
      background: GRADIENTS.app,
      fontFamily: "Inter, Segoe UI, sans-serif",
      overflow: "hidden",
    }}>
      {/* Décors lumineux subtils */}
      <div aria-hidden style={{
        position: "fixed", top: -200, right: -160, width: 520, height: 520,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${BNA.greenMid}33, transparent 65%)`,
        filter: "blur(20px)", pointerEvents: "none", zIndex: 0,
      }} />
      <div aria-hidden style={{
        position: "fixed", bottom: -180, right: 200, width: 360, height: 360,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${BNA.greenGlow}22, transparent 65%)`,
        filter: "blur(20px)", pointerEvents: "none", zIndex: 0,
      }} />

      <Sidebar user={user} onLogout={onLogout} />

      <main style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
        overflowY: "auto",
        overflowX: "hidden",
      }}>
        <Outlet />
      </main>
    </div>
  );
}
