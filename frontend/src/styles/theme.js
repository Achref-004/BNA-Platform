// ============================================================
// theme.js — Charte graphique BNA (tokens centralisés)
// ============================================================

export const BNA = {
  // Vert BNA — palette enrichie
  green:       "#009A6A",
  greenDark:   "#006B47",
  greenMid:    "#00C48A",
  greenLight:  "#E6F5F0",
  greenSoft:   "#F0FAF6",
  greenGlow:   "#00E29D",

  // Gris BNA (de la charte BNA BANK)
  steel:       "#7B8985",

  // Or premium (accents financiers)
  gold:        "#D4A93B",
  goldSoft:    "#F4E5B8",

  // Neutres
  gray:        "#F4F6F5",
  border:      "#E2EDE8",
  borderSoft:  "#EEF4F1",
  textDark:    "#0E2620",
  textMuted:   "#5A7A70",
  textSubtle:  "#8FA8A0",

  white:       "#FFFFFF",
  danger:      "#D53F3F",
  dangerSoft:  "#FFEFEF",
};

// Dégradés réutilisables ────────────────────────────────────
export const GRADIENTS = {
  // Hero (Welcome / Login) — palette claire & aérée
  // Mint pastel + bleu glacé + touche crème dorée (style fintech premium)
  hero:
    `radial-gradient(1100px 700px at 85% -10%, rgba(0,196,138,0.28), transparent 60%),` +
    `radial-gradient(900px  600px at -10% 22%, rgba(120,180,240,0.30), transparent 55%),` +
    `radial-gradient(700px  600px at 50% 110%, rgba(255,220,150,0.22), transparent 60%),` +
    `radial-gradient(500px  500px at 100% 90%, rgba(180,140,255,0.18), transparent 60%),` +
    `linear-gradient(150deg, #F1FBF6 0%, #E8F2FC 45%, #FBF5E8 100%)`,

  // Fond principal après login (Dashboard / Prediction / Users)
  app:
    `radial-gradient(900px 600px at 100% -10%, ${BNA.greenLight}cc, transparent 60%),` +
    `radial-gradient(800px 600px at -10% 100%, ${BNA.greenSoft}, transparent 60%),` +
    `linear-gradient(160deg, ${BNA.white} 0%, ${BNA.greenSoft} 100%)`,

  // Boutons et accents
  brand:       `linear-gradient(135deg, ${BNA.greenMid} 0%, ${BNA.green} 50%, ${BNA.greenDark} 100%)`,
};

// Tokens "glass" (utilisés via spread) ─────────────────────
export const GLASS = {
  surface: {
    background:    "rgba(255,255,255,0.78)",
    border:        "1px solid rgba(255,255,255,0.6)",
    backdropFilter:"blur(14px) saturate(160%)",
    WebkitBackdropFilter:"blur(14px) saturate(160%)",
    boxShadow:     "0 14px 40px rgba(0, 90, 60, 0.10)",
  },
};
