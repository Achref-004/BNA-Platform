// ============================================================
// UserManagement.jsx — Interface CRUD utilisateurs (Admin)
//
// 🔒 Le rôle "Admin" est volontairement absent du formulaire :
// le système n'admet qu'UN SEUL administrateur principal (déjà
// présent en base via le seed). Toute tentative de création ou
// de promotion vers "Admin" est de toute façon refusée côté API.
// ============================================================
import { useEffect, useState, useCallback } from "react";
import { BNA, GRADIENTS, GLASS } from "../styles/theme";
import {
  listUsers, createUser, updateUser, deleteUser, getOptions,
} from "../services/userService";
import { formatDate } from "../utils/format";

// Rôles assignables dans le formulaire : Admin EXCLU.
const ASSIGNABLE_ROLES = ["Agence", "Direction regional", "Direction central"];

const DEFAULT_FORM = {
  nom: "", prenom: "", email: "",
  mot_de_passe: "", code_structure: "",
  role: "Agence", statut: "Actif",
};
const PROTECTED_EMAIL = "admin@bna.tn";

// Validation client — mêmes règles/messages que le backend
// (userController.validatePayload). Renvoie un objet { champ: message }.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateUserForm(form, mode) {
  const e = {};
  if (!form.prenom || form.prenom.trim().length < 2) e.prenom = "Prénom requis (min 2 caractères).";
  if (!form.nom    || form.nom.trim().length    < 2) e.nom    = "Nom requis (min 2 caractères).";
  if (!form.email  || !EMAIL_RE.test(form.email.trim())) e.email = "Email invalide.";
  if (form.code_structure && form.code_structure.length > 5) e.code_structure = "Code structure invalide (max 5 caractères).";
  if (mode === "edit" && form.mot_de_passe && form.mot_de_passe.length < 6) e.mot_de_passe = "Mot de passe requis (min 6 caractères).";
  return e;
}

export default function UserManagement({ currentUser }) {
  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pageSize]                = useState(8);
  const [search, setSearch]       = useState("");
  const [filterRole, setFilterRole]     = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [toast, setToast]         = useState(null);
  // options.roles    → utilisé dans le formulaire (sans "Admin")
  // options.allRoles → utilisé dans le filtre (avec "Admin" pour pouvoir
  //                    filtrer le compte admin principal existant)
  const [options, setOptions]     = useState({ roles: [], allRoles: [], statuts: [] });

  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', user? }
  const [confirm, setConfirm] = useState(null); // { user }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUsers({
        search, role: filterRole, statut: filterStatut, page, pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterStatut, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getOptions().then(setOptions).catch(() => {});
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3200);
  };

  // En cas d'erreur, on laisse l'exception remonter au formulaire
  // (UserModal) qui affiche le message sous le champ concerné.
  const handleSave = async (payload, id) => {
    if (id) {
      await updateUser(id, payload);
      showToast("success", "Utilisateur mis à jour.");
    } else {
      const out = await createUser(payload);
      let msg = "Utilisateur créé.";
      if (out.email_delivery === "queued") {
        msg += " Identifiants et mot de passe temporaire envoyés par email.";
      } else if (out.temporary_password_preview) {
        msg += ` Mot de passe temporaire : ${out.temporary_password_preview} (SMTP non configuré ; communiquez-le par un canal sécurisé.).`;
      } else {
        msg += " Pensez à configurer SMTP pour l’envoi automatique des identifiants.";
      }
      showToast("success", msg);
    }
    setModal(null);
    load();
  };

  const handleDelete = async (id) => {
    try {
      await deleteUser(id);
      showToast("success", "Utilisateur supprimé.");
      setConfirm(null);
      load();
    } catch (e) {
      showToast("error", e.message);
      setConfirm(null);
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={styles.wrap}>
      {/* En-tête */}
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            ADMINISTRATION
          </div>
          <h1 style={styles.title}>Gestion des utilisateurs</h1>
          <p style={styles.subtitle}>
            {total} compte{total > 1 ? "s" : ""} — Réservé aux administrateurs
          </p>
        </div>
        <button
          style={styles.addBtn}
          onClick={() => setModal({ mode: "create" })}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 18px 40px rgba(0,154,106,0.45)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,154,106,0.3)";
          }}
        >
          <PlusIcon /> Ajouter un utilisateur
        </button>
      </header>

      {/* Filtres */}
      <section style={styles.filters}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <SearchIcon style={styles.searchIcon} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par nom, prénom ou email…"
            style={{ ...styles.input, paddingLeft: 40 }}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">Tous les rôles</option>
          {/* Le filtre inclut "Admin" en lecture seule pour pouvoir
              retrouver le compte admin principal existant. */}
          {(options.allRoles?.length ? options.allRoles : options.roles).map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filterStatut}
          onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
          style={styles.select}
        >
          <option value="">Tous statuts</option>
          {options.statuts.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </section>

      {/* Table */}
      <section style={styles.tableCard}>
        {loading && <LoaderBar />}
        {error && (
          <div style={styles.errorBox}>⚠️ {error}</div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <Th>Utilisateur</Th>
                <Th>Email</Th>
                <Th>Code structure</Th>
                <Th>Rôle</Th>
                <Th>Statut</Th>
                <Th>Date création</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} style={styles.empty}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
              {items.map(u => (
                <tr key={u.id} style={styles.row}>
                  <Td>
                    <div style={styles.userCell}>
                      <div style={styles.avatar}>
                        {(u.prenom || u.nom || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: BNA.textDark }}>
                          {u.prenom} {u.nom}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td><span style={{ color: BNA.textDark }}>{u.email}</span></Td>
                  <Td>{u.code_structure || "—"}</Td>
                  <Td><RolePill role={u.role} /></Td>
                  <Td><StatutPill statut={u.statut} /></Td>
                  <Td>{formatDate(u.date_creation)}</Td>
                  <Td align="right">
                    {/* Le compte admin principal est totalement immuable
                        depuis l'interface : on n'affiche aucune action. */}
                    {u.email?.toLowerCase() !== PROTECTED_EMAIL && u.role !== "Admin" && (
                      <>
                        <button
                          style={styles.iconBtn}
                          title="Modifier"
                          onClick={() => setModal({ mode: "edit", user: u })}
                        ><EditIcon /></button>

                        {u.id !== currentUser?.id && (
                          <button
                            style={{ ...styles.iconBtn, color: BNA.danger }}
                            title="Supprimer"
                            onClick={() => setConfirm({ user: u })}
                          ><TrashIcon /></button>
                        )}
                      </>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={styles.pagination}>
          <span style={{ color: BNA.textMuted, fontSize: 13 }}>
            Page {page} / {pages} — {total} résultat{total > 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              style={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >‹</button>
            <button
              style={styles.pageBtn}
              disabled={page >= pages}
              onClick={() => setPage(p => Math.min(pages, p + 1))}
            >›</button>
          </div>
        </div>
      </section>

      {/* Modale de formulaire */}
      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          options={options}
          onClose={() => setModal(null)}
          onSubmit={(payload) => handleSave(payload, modal.user?.id)}
        />
      )}

      {/* Confirmation suppression */}
      {confirm && (
        <ConfirmModal
          user={confirm.user}
          onCancel={() => setConfirm(null)}
          onConfirm={() => handleDelete(confirm.user.id)}
        />
      )}

      {/* Toast */}
      {toast && <Toast {...toast} />}

      <style>{`
        @keyframes bna-bar-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes bna-modal-in  { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes bna-toast-in  { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

/* ─── Sous-composants ─── */

function UserModal({ mode, user, options, onClose, onSubmit }) {
  // Le formulaire n'autorise QUE les rôles assignables (sans Admin).
  // Si on édite l'admin principal, on force le rôle "Agence" comme
  // valeur par défaut pour éviter d'envoyer "Admin" au backend
  // (qui refuserait de toute façon).
  const initialRole = mode === "edit" && user?.role && ASSIGNABLE_ROLES.includes(user.role)
    ? user.role
    : "Agence";

  const [form, setForm] = useState(
    mode === "edit"
      ? { ...DEFAULT_FORM, ...user, role: initialRole, mot_de_passe: "" }
      : DEFAULT_FORM,
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Met à jour un champ et efface son éventuelle erreur affichée.
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setFieldErrors(fe => (fe[k] ? { ...fe, [k]: undefined } : fe));
  };

  const inputStyle = (k) =>
    fieldErrors[k] ? { ...styles.input, borderColor: BNA.danger } : styles.input;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    // Validation côté client : message affiché SOUS chaque champ.
    const fe = validateUserForm(form, mode);
    setFieldErrors(fe);
    if (Object.keys(fe).length > 0) return;

    setSubmitting(true);
    try {
      const payload = { ...form };
      if (mode !== "edit" || !payload.mot_de_passe) delete payload.mot_de_passe;
      await onSubmit(payload);
    } catch (e) {
      // Erreur serveur liée à l'email → rattachée au champ email.
      if (/email/i.test(e.message || "")) {
        setFieldErrors(fe2 => ({ ...fe2, email: e.message }));
      } else {
        setErr(e.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h2 style={{ margin: 0, fontSize: 18, color: BNA.textDark, display: "flex", alignItems: "center", gap: 8 }}>
            {mode === "edit"
              ? <><EditIcon /> Modifier l'utilisateur</>
              : <><PlusIcon /> Nouvel utilisateur</>}
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit} noValidate style={{ padding: 20, display: "grid", gap: 14 }}>
          <div style={styles.grid2}>
            <Field label="Prénom *" error={fieldErrors.prenom}>
              <input style={inputStyle("prenom")} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
            </Field>
            <Field label="Nom *" error={fieldErrors.nom}>
              <input style={inputStyle("nom")} value={form.nom} onChange={(e) => set("nom", e.target.value)} />
            </Field>
          </div>

          <Field label="Email *" error={fieldErrors.email}>
            <input type="email" style={inputStyle("email")} value={form.email}
                   onChange={(e) => set("email", e.target.value)} />
          </Field>

          {mode === "edit" ? (
            <Field label="Mot de passe" error={fieldErrors.mot_de_passe}>
              <input
                type="password"
                style={inputStyle("mot_de_passe")}
                value={form.mot_de_passe}
                onChange={(e) => set("mot_de_passe", e.target.value)}
                placeholder="••••••"
                autoComplete="new-password"
              />
            </Field>
          ) : (
            <div style={styles.emailHint}>
              Le mot de passe est généré automatiquement.
            </div>
          )}

          <div style={styles.grid2}>
            <Field label="Code structure" error={fieldErrors.code_structure}>
              <input style={inputStyle("code_structure")} value={form.code_structure || ""}
                     onChange={(e) => set("code_structure", e.target.value)}
                     placeholder="ex: 900" />
            </Field>
            <Field label="Rôle *">
              <select style={styles.input} value={form.role}
                      onChange={(e) => set("role", e.target.value)} required>
                {/* Liste des rôles assignables (Admin volontairement EXCLU). */}
                {(options.roles?.length ? options.roles : ASSIGNABLE_ROLES)
                  .map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Statut">
            <div style={{ display: "flex", gap: 10 }}>
              {(options.statuts.length ? options.statuts : ["Actif", "Inactif"]).map(s => (
                <label key={s} style={{
                  ...styles.radio,
                  background: form.statut === s ? BNA.greenLight : BNA.gray,
                  borderColor: form.statut === s ? BNA.green : "transparent",
                  color: form.statut === s ? BNA.greenDark : BNA.textDark,
                }}>
                  <input type="radio" name="statut" value={s}
                         checked={form.statut === s}
                         onChange={() => set("statut", s)}
                         style={{ display: "none" }} />
                  {s}
                </label>
              ))}
            </div>
          </Field>

          {err && <div style={styles.errorBox}>⚠️ {err}</div>}

          <div style={styles.modalActions}>
            <button type="button" onClick={onClose} style={styles.btnGhost}>Annuler</button>
            <button type="submit" disabled={submitting} style={{
              ...styles.btnPrimary,
              opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer",
            }}>
              {submitting ? "Enregistrement…" : (mode === "edit" ? "Mettre à jour" : "Créer")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ user, onCancel, onConfirm }) {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={{ ...styles.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: 24, textAlign: "center" }}>
          <div style={styles.warnCircle}>!</div>
          <h2 style={{ margin: "10px 0 6px", color: BNA.textDark }}>Confirmer la suppression</h2>
          <p style={{ color: BNA.textMuted, fontSize: 14, margin: "0 0 18px" }}>
            Supprimer <b>{user.prenom} {user.nom}</b> ({user.email}) ?<br />
            Cette action est irréversible.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={onCancel} style={styles.btnGhost}>Annuler</button>
            <button onClick={onConfirm} style={{ ...styles.btnPrimary, background: BNA.danger }}>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toast({ type, message }) {
  const isErr = type === "error";
  return (
    <div style={{
      position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
      background: isErr ? BNA.danger : BNA.greenDark,
      color: "#fff", padding: "12px 22px", borderRadius: 12,
      boxShadow: "0 10px 32px rgba(0,0,0,0.25)",
      zIndex: 10001, fontSize: 14, fontWeight: 600,
      animation: "bna-toast-in 0.25s ease-out",
    }}>
      {isErr ? "⚠️ " : "✅ "}{message}
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 600,
        color: BNA.textMuted, marginBottom: 6,
      }}>{label}</label>
      {children}
      {error && <div style={styles.fieldError}>⚠ {error}</div>}
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th style={{
      textAlign: align, padding: "12px 14px",
      borderBottom: `1px solid ${BNA.border}`,
      fontSize: 11, color: BNA.textMuted,
      textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700,
      background: BNA.greenSoft,
    }}>{children}</th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td style={{
      textAlign: align, padding: "12px 14px",
      borderBottom: `1px solid ${BNA.border}`,
      fontSize: 13, color: BNA.textDark, verticalAlign: "middle",
    }}>{children}</td>
  );
}

function RolePill({ role }) {
  const map = {
    Admin:                 { bg: "#FDE9CA", color: "#A35A00" },
    Agence:                { bg: BNA.greenLight, color: BNA.greenDark },
    "Direction regional":  { bg: "#E2E8FF", color: "#3D4DA8" },
    "Direction central":   { bg: "#FDD8E5", color: "#9E2956" },
  };
  const s = map[role] || { bg: BNA.gray, color: BNA.textDark };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
    }}>{role}</span>
  );
}

function StatutPill({ statut }) {
  const isActive = statut === "Actif";
  return (
    <span style={{
      background: isActive ? "#DAF5E6" : "#FCDADA",
      color:      isActive ? "#0F7A3B" : "#A12626",
      padding: "3px 10px", borderRadius: 12,
      fontSize: 11, fontWeight: 700, display: "inline-flex",
      alignItems: "center", gap: 6,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: isActive ? "#1FB55B" : "#C8302E",
      }} />
      {statut}
    </span>
  );
}

function LoaderBar() {
  return (
    <div style={{
      position: "relative", height: 3, background: BNA.greenLight, overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(90deg, transparent, ${BNA.green}, transparent)`,
        animation: "bna-bar-slide 1.2s linear infinite",
      }} />
    </div>
  );
}

/* ─── Icônes SVG ─── */
function PlusIcon()   { return <Svg path="M12 5v14M5 12h14" />; }
function EditIcon()   { return <Svg path="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />; }
function TrashIcon()  { return <Svg path="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6" />; }
function SearchIcon({ style }) {
  return (
    <svg style={style} width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke={BNA.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function Svg({ path }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

/* ─── Styles ─── */
const styles = {
  wrap: {
    padding: "26px 28px", flex: 1, minHeight: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, flexWrap: "wrap", marginBottom: 22,
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
    background: BNA.greenMid, boxShadow: `0 0 10px ${BNA.greenMid}`,
  },
  title: {
    margin: 0, fontSize: 28, fontWeight: 800, color: BNA.textDark,
    letterSpacing: -0.7,
  },
  subtitle: { margin: "6px 0 0", color: BNA.textMuted, fontSize: 13.5, fontWeight: 500 },

  addBtn: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: GRADIENTS.brand,
    color: "#fff", border: "none", borderRadius: 12,
    padding: "12px 20px", fontSize: 13, fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(0,154,106,0.3), inset 0 1px 0 rgba(255,255,255,0.25)",
    letterSpacing: 0.2,
    transition: "transform 0.22s, box-shadow 0.22s",
  },

  filters: {
    display: "flex", alignItems: "center", gap: 12,
    flexWrap: "wrap", marginBottom: 16,
  },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" },
  input: {
    background: "rgba(255,255,255,0.8)",
    border: `1.5px solid ${BNA.border}`,
    borderRadius: 12, padding: "11px 14px", fontSize: 13.5,
    color: BNA.textDark, outline: "none", width: "100%", boxSizing: "border-box",
    transition: "border-color 0.18s, box-shadow 0.18s, background 0.18s",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  },
  select: {
    background: "rgba(255,255,255,0.8)",
    border: `1.5px solid ${BNA.border}`,
    borderRadius: 12, padding: "11px 14px", fontSize: 13.5,
    color: BNA.textDark, outline: "none", minWidth: 180, cursor: "pointer",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  },

  tableCard: {
    ...GLASS.surface,
    borderRadius: 20,
    border: "1px solid rgba(0,154,106,0.12)",
    boxShadow: "0 16px 44px rgba(0,90,60,0.10), inset 0 1px 0 rgba(255,255,255,0.8)",
    overflow: "hidden",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  row: { transition: "background 0.15s" },
  empty: { padding: 32, textAlign: "center", color: BNA.textMuted, fontSize: 13 },

  userCell: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: `linear-gradient(135deg, ${BNA.green}, ${BNA.greenDark})`,
    color: "#fff", fontWeight: 800, fontSize: 14,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  iconBtn: {
    border: "none", background: "transparent",
    width: 30, height: 30, borderRadius: 8,
    cursor: "pointer", color: BNA.textMuted, marginLeft: 4,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.18s",
  },

  pagination: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 18px", borderTop: `1px solid ${BNA.border}`,
  },
  pageBtn: {
    border: `1px solid ${BNA.border}`, background: BNA.white,
    width: 34, height: 34, borderRadius: 8, fontSize: 16,
    cursor: "pointer", color: BNA.textDark,
  },

  overlay: {
    position: "fixed", inset: 0, background: "rgba(13,40,30,0.45)",
    backdropFilter: "blur(2px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 10000, padding: 16,
  },
  modal: {
    background: BNA.white, borderRadius: 18,
    width: "100%", maxWidth: 520,
    boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
    overflow: "hidden",
    animation: "bna-modal-in 0.22s ease-out",
  },
  modalHead: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 20px", borderBottom: `1px solid ${BNA.border}`,
    background: BNA.greenSoft,
  },
  closeBtn: {
    background: "transparent", border: "none", fontSize: 18,
    color: BNA.textMuted, cursor: "pointer",
  },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  radio: {
    flex: 1, textAlign: "center", padding: "10px 12px",
    borderRadius: 10, fontWeight: 600, fontSize: 13,
    cursor: "pointer", border: "2px solid transparent",
    transition: "all 0.18s",
  },

  modalActions: {
    display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6,
  },
  btnGhost: {
    background: "transparent", border: `1.5px solid ${BNA.border}`,
    borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600,
    color: BNA.textDark, cursor: "pointer",
  },
  btnPrimary: {
    background: `linear-gradient(135deg, ${BNA.green}, ${BNA.greenDark})`,
    color: "#fff", border: "none", borderRadius: 10,
    padding: "10px 22px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", boxShadow: "0 8px 20px rgba(0,154,106,0.28)",
  },

  errorBox: {
    background: BNA.dangerSoft, border: "1px solid #FFCCCC",
    borderRadius: 10, padding: "10px 14px",
    color: BNA.danger, fontSize: 13,
  },
  fieldError: {
    marginTop: 6, fontSize: 12, fontWeight: 600,
    color: BNA.danger, display: "flex", alignItems: "center", gap: 4,
  },
  warnCircle: {
    width: 56, height: 56, borderRadius: "50%",
    background: BNA.dangerSoft, color: BNA.danger,
    fontSize: 28, fontWeight: 800,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto",
  },

  /** Création : pas de saisie de mot de passe (génération serveur). */
  emailHint: {
    padding: "12px 14px",
    borderRadius: 12,
    background: BNA.greenLight,
    border: "1px solid rgba(0,154,106,0.22)",
    color: BNA.greenDark,
    fontSize: 12.5,
    lineHeight: 1.5,
    fontWeight: 600,
  },
};
