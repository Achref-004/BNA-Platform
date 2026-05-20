// ============================================================
// hooks/useAuth.js
// ------------------------------------------------------------
// Gère l'utilisateur courant (boot + logout) côté React.
//   • au montage : si un JWT valide est stocké, on rafraîchit
//     le profil via /api/auth/me
//   • expose `user`, `setUser`, `booting`, `logout`
//
// Aucune logique métier ajoutée : ce hook ne fait que regrouper
// le code qui se trouvait précédemment dans App.js.
// ============================================================
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getStoredUser,
  isTokenValid,
  fetchMe,
  logout as svcLogout,
} from "../services/authService";

/**
 * Hook d'authentification global de l'application.
 *
 * @returns {{
 *   user: object|null,
 *   setUser: Function,
 *   booting: boolean,
 *   logout: Function
 * }}
 */
export default function useAuth() {
  const [user, setUser]       = useState(getStoredUser());
  const [booting, setBooting] = useState(true);
  const navigate = useNavigate();

  // Au démarrage : tente de restaurer la session si le JWT est encore valide
  useEffect(() => {
    let alive = true;
    (async () => {
      if (isTokenValid()) {
        try {
          const me = await fetchMe();
          if (alive) setUser(me);
        } catch {
          // Token encore valide mais API indisponible → garder la session locale
          if (alive) setUser(getStoredUser());
        }
      } else {
        svcLogout();
        if (alive) setUser(null);
      }
      if (alive) setBooting(false);
    })();
    return () => { alive = false; };
  }, []);

  /** Déconnecte l'utilisateur : vide le token et redirige vers /login. */
  const logout = () => {
    svcLogout();
    setUser(null);
    navigate("/login", { replace: true });
  };

  return { user, setUser, booting, logout };
}
