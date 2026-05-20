// ============================================================
// Home.jsx — Page Welcome (sans sidebar)
// ============================================================
import WelcomeCard from "../components/WelcomeCard";

export default function Home({ user, onLogout }) {
  return <WelcomeCard user={user} onLogout={onLogout} />;
}
