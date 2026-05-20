// ============================================================
// ProtectedRoute.jsx — Auth + option rôle + contrainte MCP
// ------------------------------------------------------------
// Tant que must_change_password = true renvoyé par le backend (stocké dans
// l’objet user), l’utilisateur est redirigé vers /premiere-connexion sauf
// s’il est déjà sur cette page (évite boucle infinie).
// ============================================================
import { Navigate, useLocation } from "react-router-dom";
import { isTokenValid } from "../services/authService";

export default function ProtectedRoute({ user, roles, children }) {
  const location = useLocation();

  const tokenOk = isTokenValid();
  if (!tokenOk) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  if (user.must_change_password && location.pathname !== "/premiere-connexion") {
    return <Navigate to="/premiere-connexion" replace state={{ from: location }} />;
  }

  return children;
}
