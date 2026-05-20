// ============================================================
// FloatingChatbot.jsx — Fenêtre chatbot flottante BNA
// Contrôlée par ChatbotContext (ouvrable depuis sidebar/welcome).
// ============================================================
import { useState, useRef, useEffect } from "react";
import { BNA, GRADIENTS } from "../styles/theme";
import { useChatbot } from "../context/ChatbotContext";
import { askChatbot } from "../services/chatbotService";

const SUGGESTIONS = ["nombre des placement", "Top 5 agence", "Meilleur produit"];

export default function FloatingChatbot({ user }) {
  const { open, openChatbot, closeChatbot } = useChatbot();

  const [messages, setMessages] = useState(() => initialMessages(user));
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await askChatbot(q, user);
      setMessages(prev => [...prev, {
        role: "bot",
        text: data.response || "Désolé, je n'ai pas pu traiter votre demande.",
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "bot",
        text: `❌ ${err.message || "Erreur de connexion au serveur."}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Bouton flottant rond (toujours visible) */}
      <button
        onClick={open ? closeChatbot : openChatbot}
        title={open ? "Fermer l'assistant" : "Ouvrir l'assistant BNA"}
        style={{
          ...styles.fab,
          background: open ? BNA.greenDark : BNA.green,
          transform: open ? "rotate(20deg)" : "rotate(0deg)",
        }}
      >
        {open
          ? <span style={{ fontSize: 22 }}>✕</span>
          : <BotEmoji />}
      </button>

      {/* Fenêtre chat */}
      {open && (
        <div style={styles.window}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.avatar}><BotEmoji small /></div>
            <div>
              <div style={styles.headerTitle}>Assistant BNA</div>
              <div style={styles.headerSub}>
                <span style={styles.dotLive}></span>
                Bonjour {user?.nom || user?.name || ""}
              </div>
            </div>
            <button onClick={closeChatbot} style={styles.closeBtn} title="Fermer">✕</button>
          </div>

          {/* Messages */}
          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}>
                <div style={{
                  background: m.role === "user" ? BNA.green : BNA.gray,
                  color:      m.role === "user" ? "#fff" : BNA.textDark,
                  padding: "10px 14px",
                  borderRadius: m.role === "user"
                    ? "18px 18px 4px 18px"
                    : "18px 18px 18px 4px",
                  fontSize: 13.5, lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
                }}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start" }}>
                <div style={styles.typing}>
                  <span style={styles.dot}></span>
                  <span style={{ ...styles.dot, animationDelay: "0.2s" }}></span>
                  <span style={{ ...styles.dot, animationDelay: "0.4s" }}></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          <div style={styles.suggestions}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={loading}
                style={styles.suggestBtn}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={styles.inputBar}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez votre question..."
              style={styles.input}
              onFocus={(e) => (e.target.style.borderColor = BNA.green)}
              onBlur={(e)  => (e.target.style.borderColor = "transparent")}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              title="Envoyer"
              style={{
                ...styles.sendBtn,
                background: loading || !input.trim() ? BNA.textMuted : BNA.green,
                cursor:     loading || !input.trim() ? "not-allowed" : "pointer",
              }}
            >➤</button>
          </div>
        </div>
      )}

    </>
  );
}

function initialMessages(user) {
  return [{
    role: "bot",
    text: `Bonjour ${user?.nom || user?.name || ""} 👋\nJe suis votre assistant BNA.\nPosez-moi vos questions sur vos placements, objectifs ou activités.`,
  }];
}

function BotEmoji({ small }) {
  const size = small ? 22 : 26;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" fill="#fff" />
      <circle cx="9"  cy="14" r="1" fill="#fff" />
      <circle cx="15" cy="14" r="1" fill="#fff" />
    </svg>
  );
}

const styles = {
  fab: {
    position: "fixed", bottom: 24, right: 24,
    color: "#fff", border: "none", borderRadius: 50,
    width: 60, height: 60, fontSize: 26,
    cursor: "pointer", zIndex: 9999,
    boxShadow: "0 14px 32px rgba(0,154,106,0.5), inset 0 1px 0 rgba(255,255,255,0.35)",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.25s, transform 0.25s",
    animation: "bna-pulse-glow 2.4s infinite",
  },
  window: {
    position: "fixed", bottom: 96, right: 24,
    width: 380, height: 540,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border: "1px solid rgba(255,255,255,0.6)",
    borderRadius: 22,
    boxShadow: "0 32px 80px rgba(0,30,20,0.35), inset 0 1px 0 rgba(255,255,255,0.6)",
    display: "flex", flexDirection: "column",
    zIndex: 9998, overflow: "hidden",
    fontFamily: "Inter, Segoe UI, sans-serif",
    animation: "bna-pop 0.28s ease-out",
  },
  header: {
    background: GRADIENTS.brand,
    padding: "14px 18px",
    display: "flex", alignItems: "center", gap: 12,
    position: "relative",
    boxShadow: "0 4px 14px rgba(0,154,106,0.25), inset 0 -1px 0 rgba(255,255,255,0.18)",
  },
  avatar: {
    width: 38, height: 38, borderRadius: "50%",
    background: "rgba(255,255,255,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontWeight: 700, fontSize: 14 },
  headerSub: {
    color: "rgba(255,255,255,0.85)", fontSize: 11,
    display: "flex", alignItems: "center", gap: 6,
  },
  dotLive: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#7CFFB8", display: "inline-block",
    boxShadow: "0 0 6px #7CFFB8",
  },
  closeBtn: {
    marginLeft: "auto", background: "none", border: "none",
    color: "rgba(255,255,255,0.85)", fontSize: 18, cursor: "pointer",
  },
  messages: {
    flex: 1, overflowY: "auto", padding: "14px 14px 8px",
    display: "flex", flexDirection: "column", gap: 10,
    background: `linear-gradient(180deg, ${BNA.white}, ${BNA.greenSoft})`,
  },
  typing: {
    background: BNA.gray, padding: "10px 16px",
    borderRadius: "18px 18px 18px 4px",
    display: "inline-flex", gap: 4, alignItems: "center",
  },
  dot: {
    width: 6, height: 6, borderRadius: "50%",
    background: BNA.green, display: "inline-block",
    animation: "bna-blink 1s infinite",
  },
  suggestions: {
    padding: "6px 12px", display: "flex", gap: 6,
    overflowX: "auto", borderTop: `1px solid ${BNA.greenLight}`,
  },
  suggestBtn: {
    background: BNA.greenLight, color: BNA.greenDark,
    border: "none", borderRadius: 20,
    padding: "6px 10px", fontSize: 11, cursor: "pointer",
    whiteSpace: "nowrap", fontWeight: 600,
  },
  inputBar: {
    padding: "10px 12px",
    display: "flex", gap: 8, alignItems: "center",
    borderTop: `1px solid ${BNA.greenLight}`,
    background: BNA.white,
  },
  input: {
    flex: 1, background: BNA.gray,
    border: "1.5px solid transparent",
    borderRadius: 20, padding: "9px 14px",
    fontSize: 13, color: BNA.textDark, outline: "none",
    transition: "border-color 0.2s",
  },
  sendBtn: {
    color: "#fff", border: "none", borderRadius: "50%",
    width: 38, height: 38, fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "background 0.2s",
  },
};
