// ============================================================
// hooks/useNotificationSummary.js — pastilles temps quasi-réel
// ------------------------------------------------------------
// Appelle régulièrement /api/notifications/summary avec le même JWT :
//   • PendingAdminThreads  → admins (messages utilisateurs pas encore traités)
//   • unseenAdminReplies → collaborateurs (réponses administrateur non ouvertes)
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { fetchNotificationsSummary } from "../services/messageService";

const POLL_MS = 20_000;

export default function useNotificationSummary(user) {
  const [adminPendingThreads, setAdminPendingThreads]     = useState(0);
  const [collaboratorUnseenReplies, setCollaboratorUnseenReplies] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotificationsSummary();
      setAdminPendingThreads(typeof data.pendingAdminThreads === "number" ? data.pendingAdminThreads : 0);
      setCollaboratorUnseenReplies(typeof data.unseenAdminReplies === "number"
        ? data.unseenAdminReplies
        : 0,
      );
    } catch {
      // silencieux (API indispo / migration pas faite…)
      setAdminPendingThreads(0);
      setCollaboratorUnseenReplies(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setAdminPendingThreads(0);
      setCollaboratorUnseenReplies(0);
      return undefined;
    }
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh, user]);

  return {
    adminPendingThreads,
    collaboratorUnseenReplies,
    refresh,
  };
}
