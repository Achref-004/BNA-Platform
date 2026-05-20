// ============================================================
// BackgroundFX.jsx — Fond premium réutilisable (palette claire)
//   • dégradé mesh animé pastel
//   • orbes lumineux flottants (mint / bleu glacé / pêche)
//   • grille subtile en filigrane
//   • watermark BNA en filigrane vert très doux
// ============================================================
import { BNA, GRADIENTS } from "../styles/theme";

export default function BackgroundFX({ watermark = true, intensity = 1 }) {
  return (
    <>
      {/* 1) Dégradé mesh principal — clair, animé */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0,
          background: GRADIENTS.hero,
          backgroundSize: "220% 220%",
          animation: "bna-gradient-shift 26s ease infinite",
        }}
      />

      {/* 2) Grille très subtile */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          opacity: 0.25 * intensity,
          backgroundImage:
            "linear-gradient(rgba(0,90,60,0.06) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,90,60,0.06) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* 3) Orbes pastel flottants */}
      <Orb size={520} x="78%"  y="-12%" color="#00C48A" alpha={0.22 * intensity} duration={16} />
      <Orb size={460} x="-10%" y="22%"  color="#78B4F0" alpha={0.22 * intensity} duration={20} reverse />
      <Orb size={360} x="58%"  y="78%"  color="#FFCE85" alpha={0.18 * intensity} duration={18} />
      <Orb size={300} x="4%"   y="86%"  color="#B49CFF" alpha={0.16 * intensity} duration={22} reverse />

      {/* 4) Reflet diagonal très léger */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background:
            "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.18) 35%, transparent 60%)",
        }}
      />

      {/* 5) Watermark BNA en vert très doux */}
      {watermark && (
        <div aria-hidden style={{
          position: "fixed", right: -110, bottom: -180, zIndex: 0,
          opacity: 0.05, pointerEvents: "none",
          color: BNA.greenDark,
          fontSize: 520, fontWeight: 900,
          fontFamily: "Inter, Segoe UI, sans-serif",
          letterSpacing: -22, lineHeight: 1,
          filter: "blur(0.5px)",
        }}>BNA</div>
      )}
    </>
  );
}

function Orb({ size, x, y, color, alpha = 0.25, duration = 18, reverse = false }) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: x, top: y,
        width: size, height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${hex2rgba(color, alpha)} 0%, ${hex2rgba(color, 0)} 65%)`,
        filter: "blur(14px)",
        zIndex: 0, pointerEvents: "none",
        animation: `${reverse ? "bna-float-rev" : "bna-float-slow"} ${duration}s ease-in-out infinite`,
      }}
    />
  );
}

function hex2rgba(hex, a) {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
