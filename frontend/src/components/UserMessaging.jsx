// ============================================================
// UserMessaging.jsx — messagerie collaborateur (liste + fil)
// ------------------------------------------------------------
// Détail d’un fil ouvre GET /messages/my-threads/:id (marque les
// réponses admin comme « lues » côté utilisateur).
//
// POST /messages peut créer un fil (sujet + message) ou poursuivre
// (thread_id + message uniquement).
// ============================================================
import { useEffect, useState, useCallback } from "react";
import { BNA, GRADIENTS, GLASS } from "../styles/theme";
import {
  sendUserMessage,
  listMyThreads,
  getMyThread,
} from "../services/messageService";
import { formatDate } from "../utils/format";

export default function UserMessaging() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [toast, setToast] = useState("");

  const [newSubject, setNewSubject]       = useState("");
  const [newBody, setNewBody]             = useState("");
  const [replyBody, setReplyBody]         = useState("");
  const [composerMode, setComposerMode]   = useState(null);
  const [sending, setSending]             = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3400);
  };

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const d = await listMyThreads();
      setItems(d.items || []);
    } catch (e) {
      showToast(e.message || "Impossible de charger la liste.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const selectThread = async (id) => {
    setSelectedId(id);
    setComposerMode(null);
    try {
      const pack = await getMyThread(id);
      setDetail(pack);
      setReplyBody("");
    } catch (e) {
      showToast(e.message);
    }
  };

  const openNewComposer = () => {
    setSelectedId(null);
    setDetail(null);
    setComposerMode("fresh");
    setNewSubject("");
    setNewBody("");
  };

  const submitComposer = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      if (composerMode === "fresh") {
        await sendUserMessage({
          thread_id: null,
          sujet: newSubject,
          message: newBody,
        });
        showToast("Message envoyé.");
      } else if (selectedId) {
        await sendUserMessage({
          thread_id: selectedId,
          message: replyBody,
        });
        showToast("Message ajouté.");
      }
      setComposerMode(null);
      setNewSubject("");
      setNewBody("");
      setReplyBody("");
      await refreshList();
      if (selectedId) await selectThread(selectedId);
    } catch (err) {
      showToast(err.message || "Erreur");
    } finally {
      setSending(false);
    }
  };

  const statusLabel = (t) => {
    const map = {
      envoye:  { text: "Envoyé", color: BNA.gold },
      lu:      { text: "Lu", color: BNA.steel },
      repondu: { text: "Répondu", color: BNA.green },
    };
    return map[t.status_label] || { text: t.status_label || "—", color: BNA.textMuted };
  };

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            MESSAGERIE BNA
          </div>
          <h1 style={styles.title}>Messages à l’administration</h1>
          <p style={styles.subtitle}>
            Envoyé / lu / répondu — suivez vos échanges et l’historique des réponses.
          </p>
        </div>
        <button type="button" style={styles.primaryBtn} onClick={openNewComposer}>
          + Nouvelle conversation
        </button>
      </header>

      <div style={styles.split}>
        <aside style={styles.listCard}>
          <h3 style={styles.blockTitle}>Mes conversations</h3>
          {loadingList && <p style={styles.muted}>Chargement…</p>}
          {!loadingList && items.length === 0 && (
            <p style={styles.empty}>Aucun message pour le moment.</p>
          )}
          <ul style={styles.ul}>
            {items.map((t) => {
              const pill = statusLabel(t);
              return (
                <li key={t.thread_id}>
                  <button
                    type="button"
                    onClick={() => selectThread(t.thread_id)}
                    style={{
                      ...styles.threadBtn,
                      borderColor:
                        selectedId === t.thread_id ? BNA.green : BNA.border,
                    }}
                  >
                    <span style={styles.threadSubject}>{t.subject}</span>
                    <span style={styles.miniMeta}>{formatDate(t.updated_at)}</span>
                    <span
                      style={{
                        ...styles.pill,
                        background: `${pill.color}22`,
                        color: pill.color,
                      }}
                    >
                      {pill.text}
                      {t.has_unseen_admin_reply ? " ●" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section style={{ ...styles.listCard, minHeight: 420 }}>
          {composerMode === "fresh" && (
            <>
              <h3 style={styles.blockTitle}>Nouvelle conversation</h3>
              <form style={styles.form} onSubmit={submitComposer}>
                <Field label="Sujet *">
                  <input
                    style={styles.input}
                    required
                    maxLength={200}
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </Field>
                <Field label="Message *">
                  <textarea
                    style={{ ...styles.input, minHeight: 160, resize: "vertical" }}
                    required
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                  />
                </Field>
                <div style={styles.rowActions}>
                  <button
                    type="button"
                    style={styles.ghostBtn}
                    onClick={() => setComposerMode(null)}
                  >
                    Annuler
                  </button>
                  <button disabled={sending} type="submit" style={styles.primaryBtn}>
                    Envoyer
                  </button>
                </div>
              </form>
            </>
          )}

          {detail && !composerMode && (
            <>
              <div style={styles.threadHead}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: BNA.textDark }}>
                    {detail.thread.subject}
                  </div>
                  <div style={styles.miniMeta}>
                    Ouvert {formatDate(detail.thread.created_at)} — mis à jour{" "}
                    {formatDate(detail.thread.updated_at)}
                  </div>
                </div>
              </div>

              <div style={styles.stream}>
                {detail.posts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      ...styles.bubbleBase,
                      ...(p.sender === "user" ? styles.bubbleUser : styles.bubbleAdmin),
                    }}
                  >
                    <div style={styles.bubbleMeta}>
                      {p.sender === "user" ? "Vous" : "Administration BNA"}
                      {" · "}
                      {formatDate(p.created_at)}
                    </div>
                    {p.body}
                  </div>
                ))}
              </div>

              <form style={{ ...styles.form, marginTop: 18 }} onSubmit={submitComposer}>
                <Field label="Écrire dans ce fil">
                  <textarea
                    style={{ ...styles.input, minHeight: 120 }}
                    required
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                  />
                </Field>
                <button disabled={sending} type="submit" style={styles.primaryBtn}>
                  Envoyer
                </button>
              </form>
            </>
          )}

          {!detail && !composerMode && (
            <div style={styles.placeholder}>
              Choisissez une conversation ou créez-en une nouvelle.
            </div>
          )}
        </section>
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

const styles = {
  wrap: { padding: "26px 28px", flex: 1, minHeight: "100%", boxSizing: "border-box" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: BNA.greenLight,
    color: BNA.greenDark,
    padding: "5px 12px",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: "50%", background: BNA.greenMid },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: BNA.textDark },
  subtitle: { margin: "6px 0 0", color: BNA.textMuted, maxWidth: 720, fontSize: 14 },
  primaryBtn: {
    background: GRADIENTS.brand,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,154,106,0.28)",
  },
  ghostBtn: {
    background: "transparent",
    border: `1.5px solid ${BNA.border}`,
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  split: { display: "grid", gridTemplateColumns: "minmax(260px, 32%) 1fr", gap: 18 },
  listCard: {
    ...GLASS.surface,
    borderRadius: 20,
    border: "1px solid rgba(0,154,106,0.12)",
    padding: 18,
  },
  blockTitle: { margin: "0 0 12px", fontSize: 15, fontWeight: 800, color: BNA.textDark },
  ul: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 },
  threadBtn: {
    width: "100%",
    textAlign: "left",
    background: "rgba(255,255,255,0.65)",
    borderRadius: 14,
    border: `1.5px solid ${BNA.border}`,
    padding: "12px 14px",
    cursor: "pointer",
    display: "grid",
    gap: 6,
  },
  threadSubject: { fontWeight: 800, fontSize: 14, color: BNA.textDark },
  miniMeta: { fontSize: 11, color: BNA.textSubtle },
  pill: { fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "4px 10px", width: "fit-content" },
  form: { display: "grid", gap: 12 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: BNA.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 12,
    border: `1.5px solid ${BNA.border}`,
    padding: "11px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
  },
  rowActions: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 },
  threadHead: { marginBottom: 8 },
  stream: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: "46vh",
    overflowY: "auto",
  },
  bubbleBase: {
    maxWidth: "80%",
    padding: "12px 14px",
    borderRadius: 16,
    fontSize: 13.5,
    lineHeight: 1.55,
    whiteSpace: "pre-wrap",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    background: GRADIENTS.brand,
    color: "#fff",
    boxShadow: "0 12px 26px rgba(0,154,106,0.25)",
  },
  bubbleAdmin: {
    alignSelf: "flex-start",
    background: "#fff",
    color: BNA.textDark,
    border: `1px solid ${BNA.border}`,
  },
  bubbleMeta: {
    fontSize: 10,
    opacity: 0.85,
    marginBottom: 6,
    fontWeight: 700,
  },
  muted: { color: BNA.textMuted, fontSize: 13 },
  empty: { color: BNA.textMuted, fontStyle: "italic", fontSize: 13 },
  placeholder: { color: BNA.textMuted, textAlign: "center", padding: "72px 12px", fontSize: 14 },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    background: BNA.greenDark,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 12,
    fontWeight: 700,
    zIndex: 10001,
  },
};
