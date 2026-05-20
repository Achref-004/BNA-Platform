// ============================================================
// UserManagementPage.jsx — Page Admin (CRUD utilisateurs)
// ============================================================
import UserManagement from "../components/UserManagement";

export default function UserManagementPage({ user }) {
  return <UserManagement currentUser={user} />;
}
