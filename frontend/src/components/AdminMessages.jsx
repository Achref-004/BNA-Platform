// ============================================================
// AdminMessages.jsx — boîte réception admin + réponse inline
// ------------------------------------------------------------
// Flux :
//   liste GET /messages/admin/threads
//   clic → GET /messages/admin/threads/:id (marque comme lus)
//   envoi réponse POST …/reply
//
// Panneau conversation (droite) : même ergonomie que UserMessaging.jsx
// (en-tête sujet + dates Ouvert/mis à jour, bulles, compositeur « Écrire dans ce fil »).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { BNA, GRADIENTS, GLASS } from "../styles/theme";
import {
  adminDeleteThread,
  adminListThreads,
  adminReplyThread,
  adminThreadDetail,
} from "../services/messageService";
import { formatDate } from "../utils/format";

export default function AdminMessages() {
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole]     = useState("");
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [reply, setReply]     = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast]   = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const PAGE_SIZE = 10;

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminListThreads({
        search,
        role,
        page,
        pageSize: PAGE_SIZE,
        sort: "updated_desc",
      });
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch (e) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, role, page]);

  useEffect(() => { loadList(); }, [loadList]);

  const openDetail = async (id) => {
    setSelectedId(id);
    try {
      const d = await adminThreadDetail(id);
      setDetail(d);
      setReply("");
    } catch (e) {
      showToast(e.message);
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setSending(true);
    try {
      await adminReplyThread(selectedId, reply);
      showToast("Réponse envoyée.");
      await openDetail(selectedId);
      await loadList();
      setReply("");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!detail?.thread?.id || !window.confirm("Supprimer définitivement ce fil ?")) return;
    try {
      await adminDeleteThread(detail.thread.id);
      setDetail(null);
      setSelectedId(null);
      await loadList();
    } catch (e) {
      showToast(e.message);
    }
  };

  const participantLabel = detail?.thread?.user || null;

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>ADMIN · MESSAGES</div>
          <h1 style={styles.title}>Boîte de réception</h1>
          <p style={styles.subtitle}>{total} conversation{total > 1 ? "s" : ""}</p>
        </div>
      </header>

      <div style={styles.grid}>
        <aside style={{ ...styles.card, overflow: "hidden" }}>
          <div style={styles.filters}>
            <input
              placeholder="Rechercher…"
              style={styles.input}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              style={styles.input}
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
            >
              <option value="">Tous rôles</option>
              <option value="Agence">Agence</option>
              <option value="Direction regional">Direction regional</option>
              <option value="Direction central">Direction central</option>
            </select>
          </div>
          {loading && <p style={styles.muted}>Chargement…</p>}
          <ul style={styles.ul}>
            {items.map((it) => (
              <li key={it.thread_id}>
                <button
                  type="button"
                  onClick={() => openDetail(it.thread_id)}
                  style={{
                    ...styles.rowBtn,
                    borderColor:
                      selectedId === it.thread_id ? BNA.green : BNA.borderSoft,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{it.subject}</div>
                  <div style={{ fontSize: 12, color: BNA.textMuted }}>
                    {it.participant?.prenom} {it.participant?.nom} · {it.participant?.role}
                  </div>
                  <div style={{ fontSize: 11, color: BNA.textSubtle }}>
                    {formatDate(it.updated_at)}{" "}
                    {it.needs_attention && (
                      <span style={{ color: BNA.green }}> ● à traiter</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div style={styles.pagination}>
            <button
              type="button"
              style={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            <span style={{ fontSize: 12, color: BNA.textMuted }}>
              Page {page}/{pages}
            </span>
            <button
              type="button"
              style={styles.pageBtn}
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              ›
            </button>
          </div>
        </aside>

        {/* Panneau conversation : même logique UI que messagerie utilisateur (bulles + compositeur). */}
        <section style={{ ...styles.conversationPanel, minHeight: 420 }}>
          {!detail && (
            <div style={styles.placeholder}>Choisissez une conversation dans la liste.</div>
          )}

          {detail && participantLabel && (
            <>
              <div style={styles.threadHead}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: BNA.textDark }}>
                    {detail.thread.subject}
                  </div>
                  <div style={styles.miniMeta}>
                    Ouvert {formatDate(detail.thread.created_at)} — mis à jour{" "}
                    {formatDate(detail.thread.updated_at)}
                  </div>
                  <div style={styles.participantStrip}>
                    {participantLabel.prenom} {participantLabel.nom} · {participantLabel.role}
                    {" · "}
                    <span style={{ color: BNA.greenDark }}>{participantLabel.email}</span>
                  </div>
                </div>
                <button type="button" onClick={handleDelete} style={styles.dangerGhost}>
                  Supprimer le fil
                </button>
              </div>

              <div style={styles.stream}>
                {detail.posts.map((p) => {
                  const isAdmin = p.sender === "admin";
                  return (
                    <div
                      key={p.id}
                      style={{
                        ...styles.bubbleBase,
                        ...(isAdmin ? styles.bubbleAdminSelf : styles.bubbleCollaborator),
                      }}
                    >
                      <div style={styles.bubbleMeta}>
                        {isAdmin ? "Vous · Administration BNA" : "Collaborateur"}
                        {" · "}
                        {formatDate(p.created_at)}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{p.body}</div>
                    </div>
                  );
                })}
              </div>

              <form style={{ ...styles.replyForm }} onSubmit={handleReply}>
                <div style={styles.fieldLabel}>Écrire dans ce fil</div>
                <textarea
                  style={styles.composerTextarea}
                  required
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Votre réponse… (notification email au collaborateur)"
                />
                <button
                  disabled={sending}
                  type="submit"
                  style={{
                    ...styles.sendBtn,
                    opacity: sending ? 0.7 : 1,
                    cursor: sending ? "wait" : "pointer",
                  }}
                >
                  Envoyer
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

const styles = {
  wrap: { padding: "26px 28px", flex: 1, boxSizing: "border-box", minHeight: "100%" },
  header: { marginBottom: 18 },
  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.8,
    color: BNA.greenDark,
    marginBottom: 6,
  },
  title: { margin: 0, fontSize: 26, fontWeight: 900, color: BNA.textDark },
  subtitle: { margin: "6px 0 0", color: BNA.textMuted, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "minmax(290px, 34%) 1fr", gap: 18 },
  card: { ...GLASS.surface, borderRadius: 22, padding: 16, border: "1px solid rgba(0,154,106,0.12)" },
  /** Aligné sur UserMessaging.jsx (liste de droite utilisateur). */
  conversationPanel: {
    ...GLASS.surface,
    borderRadius: 20,
    border: "1px solid rgba(0,154,106,0.12)",
    padding: 18,
    display: "flex",
    flexDirection: "column",
  },
  filters: { display: "flex", gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 11,
    border: `1.5px solid ${BNA.border}`,
    fontSize: 13,
    background: "#fff",
  },
  ul: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8, maxHeight: "58vh", overflowY: "auto" },
  rowBtn: {
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    padding: "10px 12px",
    borderRadius: 13,
    border: `1.5px solid ${BNA.border}`,
    background: "rgba(255,255,255,0.92)",
    display: "grid",
    gap: 4,
  },
  muted: { color: BNA.textMuted, padding: "0 12px" },
  placeholder: {
    padding: "80px 20px",
    textAlign: "center",
    color: BNA.textMuted,
    fontWeight: 600,
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  threadHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 8,
    flexShrink: 0,
  },
  miniMeta: { fontSize: 11, color: BNA.textSubtle, marginTop: 4 },
  participantStrip: {
    fontSize: 12,
    color: BNA.textMuted,
    marginTop: 6,
    lineHeight: 1.4,
  },
  dangerGhost: {
    flexShrink: 0,
    padding: "8px 12px",
    borderRadius: 10,
    border: `1.5px solid ${BNA.danger}`,
    color: BNA.danger,
    background: "transparent",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 12,
  },
  stream: {
    flex: 1,
    minHeight: 0,
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
    color: BNA.textDark,
  },
  /** Messages admin → même style que « Vous » côté collaborateur (bulle verte à droite). */
  bubbleAdminSelf: {
    alignSelf: "flex-end",
    background: GRADIENTS.brand,
    color: "#fff",
    boxShadow: "0 12px 26px rgba(0,154,106,0.25)",
  },
  /** Messages collaborateur → même style que « Administration BNA » chez l’utilisateur (gauche, fond blanc). */
  bubbleCollaborator: {
    alignSelf: "flex-start",
    background: "#fff",
    border: `1px solid ${BNA.border}`,
  },
  bubbleMeta: {
    fontSize: 10,
    opacity: 0.9,
    marginBottom: 6,
    fontWeight: 700,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: BNA.textMuted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  composerTextarea: {
    borderRadius: 12,
    border: `1.5px solid ${BNA.border}`,
    padding: "11px 14px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    minHeight: 120,
    resize: "vertical",
    fontFamily: "inherit",
  },
  replyForm: {
    display: "grid",
    gap: 12,
    marginTop: 18,
    flexShrink: 0,
    paddingTop: 4,
  },
  sendBtn: {
    width: "100%",
    background: GRADIENTS.brand,
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "13px 18px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,154,106,0.28)",
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTop: `1px solid ${BNA.border}`,
  },
  pageBtn: {
    width: 36,
    height: 34,
    borderRadius: 9,
    border: `1px solid ${BNA.border}`,
    cursor: "pointer",
    fontWeight: 800,
  },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 20px",
    borderRadius: 12,
    background: BNA.greenDark,
    color: "#fff",
    fontWeight: 700,
    zIndex: 10001,
  },
};
