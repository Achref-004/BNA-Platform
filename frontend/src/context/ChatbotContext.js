// ============================================================
// ChatbotContext.js — état global d'ouverture du chatbot
// Permet à la sidebar et à la page Welcome de l'ouvrir / fermer.
// ============================================================
import { createContext, useContext, useState, useCallback } from "react";

const ChatbotContext = createContext({
  open: false,
  openChatbot:  () => {},
  closeChatbot: () => {},
  toggleChatbot:() => {},
});

export function ChatbotProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openChatbot   = useCallback(() => setOpen(true),  []);
  const closeChatbot  = useCallback(() => setOpen(false), []);
  const toggleChatbot = useCallback(() => setOpen(o => !o), []);

  return (
    <ChatbotContext.Provider value={{ open, openChatbot, closeChatbot, toggleChatbot }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  return useContext(ChatbotContext);
}
