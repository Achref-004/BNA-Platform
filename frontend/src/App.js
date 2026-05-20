// ============================================================
// App.js
// ------------------------------------------------------------
// Point d'entrée de l'application React.
//   • monte le Router (react-router-dom)
//   • fournit le contexte du chatbot (Provider)
//   • délègue le routage à <AppRoutes>
//   • monte le chatbot flottant tant qu'un utilisateur est connecté
//
// Toute la logique d'auth est dans le hook useAuth.
// Toute la définition des routes est dans routes/AppRoutes.jsx.
// ============================================================
import { BrowserRouter } from "react-router-dom";

import AppRoutes        from "./routes/AppRoutes";
import FloatingChatbot  from "./components/FloatingChatbot";
import Splash           from "./components/Splash";
import { ChatbotProvider } from "./context/ChatbotContext";
import useAuth          from "./hooks/useAuth";

export default function App() {
  return (
    <BrowserRouter>
      <ChatbotProvider>
        <AppShell />
      </ChatbotProvider>
    </BrowserRouter>
  );
}

/**
 * Coquille de l'application : authentifie l'utilisateur puis affiche
 * soit l'écran de chargement, soit l'arbre de routes + chatbot.
 */
function AppShell() {
  const { user, setUser, booting, logout } = useAuth();

  if (booting) return <Splash />;

  return (
    <>
      <AppRoutes user={user} onLogin={setUser} onLogout={logout} />
      {user && !user.must_change_password && <FloatingChatbot user={user} />}
    </>
  );
}
