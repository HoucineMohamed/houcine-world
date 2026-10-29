import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Drives the La Rosa View Concierge widget: sends a visitor's message plus the recent turns to
// the concierge edge function (supabase/functions/concierge), which is the only place that talks
// to the AI provider and enforces the La Rosa View-only scope. This hook never decides what the
// assistant may answer -- it only sends, receives, and persists the conversation in the browser
// for the length of the tab's session (sessionStorage), never to a server.

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  failed?: boolean;
}

const STORAGE_KEY = "larosaview-concierge-messages";
const MAX_HISTORY_TURNS = 10;

const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

const loadStored = (): ChatMessage[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveStored = (messages: ChatMessage[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Private browsing or a full quota: the conversation just won't survive a close/reopen.
  }
};

export const useConciergeChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadStored());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingMessageRef = useRef<string | null>(null);

  useEffect(() => {
    saveStored(messages);
  }, [messages]);

  const historyFor = (all: ChatMessage[]) =>
    all
      .filter((m) => !m.failed)
      .slice(-MAX_HISTORY_TURNS * 2)
      .map((m) => ({ role: m.role, content: m.content }));

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed };
    let historySnapshot: ReturnType<typeof historyFor> = [];
    setMessages((prev) => {
      historySnapshot = historyFor(prev);
      return [...prev, userMessage];
    });
    pendingMessageRef.current = trimmed;
    setIsSending(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("concierge/chat", {
        body: { message: trimmed, history: historySnapshot },
      });
      if (invokeError || !data?.reply) {
        throw new Error(invokeError?.message || "No reply");
      }
      setMessages((prev) => [...prev, { id: newId(), role: "assistant", content: data.reply as string }]);
      pendingMessageRef.current = null;
    } catch {
      setError("The assistant couldn't answer just now. You can try again, or reach the team directly.");
      setMessages((prev) =>
        prev.map((m) => (m.id === userMessage.id ? { ...m, failed: true } : m)),
      );
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

  const retry = useCallback(() => {
    const last = pendingMessageRef.current;
    if (!last) return;
    setMessages((prev) => prev.filter((m) => !(m.role === "user" && m.failed)));
    void send(last);
  }, [send]);

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    pendingMessageRef.current = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { messages, isSending, error, send, retry, reset };
};
