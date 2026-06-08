// ============================================================
// hooks/useToast.js — Toast éphémère réutilisable
// ------------------------------------------------------------
// Gère un message temporaire (état + effacement automatique),
// factorisé depuis AdminMessages / UserMessaging / Forecast.
//   const { toast, showToast } = useToast();
//   showToast("Enregistré.");
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";

export default function useToast(duration = 3200) {
  const [toast, setToast] = useState("");
  const timer = useRef(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), duration);
  }, [duration]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { toast, showToast };
}
