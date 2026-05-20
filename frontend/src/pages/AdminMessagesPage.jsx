// ============================================================
// AdminMessagesPage.jsx — Page "Messages reçus" (Admin uniquement)
// ------------------------------------------------------------
// Wrappe le composant <AdminMessages /> dans le layout standard.
// Accessible uniquement via /admin/messages (route protégée par
// <ProtectedRoute roles={["Admin"]} />).
// ============================================================
import AdminMessages from "../components/AdminMessages";

export default function AdminMessagesPage() {
  return <AdminMessages />;
}
