// ============================================================
// AppRoutes.jsx — Arbre principal + garde MCP (voir ProtectedRoute)
// ------------------------------------------------------------
//
//   /login              → Login
//   /premiere-connexion → changement MCP (sans sidebar)
//   /                   → Welcome (sidebar absente comme avant)
//   /messagerie         → fils utilisateur (Collaborateurs uniquement)
//   /dashboard          → BI
//   /admin/messages     → boîte admin (threads/réponses)
//   ...
// ============================================================
import { Routes, Route, Navigate } from "react-router-dom";

import Login            from "../components/Login";
import ProtectedRoute   from "../components/ProtectedRoute";

import AppLayout          from "../pages/AppLayout";
import Home               from "../pages/Home";
import DashboardPage      from "../pages/DashboardPage";
import PredictionPage     from "../pages/PredictionPage";
import UserManagementPage from "../pages/UserManagementPage";
import MessagingUserPage  from "../pages/MessagingUserPage";
import AdminMessagesPage  from "../pages/AdminMessagesPage";
import FirstLoginPage     from "../pages/FirstLoginPage";

const CONTACT_ROLES = ["Agence", "Direction regional", "Direction central"];

export default function AppRoutes({ user, onLogin, onLogout }) {
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login onLogin={onLogin} />}
      />

      <Route
        path="/premiere-connexion"
        element={
          <ProtectedRoute user={user}>
            <FirstLoginPage user={user} onLogin={onLogin} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute user={user}>
            <Home user={user} onLogout={onLogout} />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute user={user}>
            <AppLayout user={user} onLogout={onLogout} />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/prevision" element={<PredictionPage />} />

        <Route
          path="/messagerie"
          element={
            <ProtectedRoute user={user} roles={CONTACT_ROLES}>
              <MessagingUserPage user={user} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/utilisateurs"
          element={
            <ProtectedRoute user={user} roles={["Admin"]}>
              <UserManagementPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute user={user} roles={["Admin"]}>
              <AdminMessagesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}
