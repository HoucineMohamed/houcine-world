import { useCallback, useEffect, useRef, useState } from "react";
import { SERVICE_EMAILS } from "@/config/contact";

// Drives the La Rosa View Concierge widget. Every answer is written by the concierge edge function
// (supabase/functions/concierge): it interprets the message, searches the Houcine.world knowledge brain and streams
// the reply. This hook never decides what the assistant says; it sends the message with the recent turns and the
// conversation memory, shows the answer as it arrives, and handles failures honestly (no saved or invented reply).
//
// The conversation stays in this browser tab (sessionStorage), for at most 24 hours, under a random conversation id.
// Nothing about it is stored on the server, so no other visitor can ever see it.

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** user: the message could not be answered (retry offered). assistant: still arriving. */
  failed?: boolean;
  streaming?: boolean;
}
interface MemoryItem {
  key: string;
  value: string;
}
export interface ConversationMemory {
  stated: MemoryItem[];
  inferred: MemoryItem[];
  summary: string;
}
export interface ConciergeNotice {
  code: "not_configured" | "busy" | "timeout" | "unavailable" | "declined" | "network";
  message: string;
  email: string | null;
  bookingPath: string | null;
}
export type ChatPhase = "idle" | "waiting" | "streaming";

const STORAGE_KEY = "larosaview-concierge-v2";
const OLD_STORAGE_KEY = "larosaview-concierge-messages";
const RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_MESSAGES = 16;
const SLOW_AFTER_MS = 12_000;
const GIVE_UP_AFTER_MS = 90_000;
const EMPTY_MEMORY: ConversationMemory = { stated: [], inferred: [], summary: "" };
const FALLBACK_CONTACT = { email: SERVICE_EMAILS.larosaview, bookingPath: "/booking" };

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
        (Number(c) ^ (Math.floor(Math.random() * 256) & (15 >> (Number(c) / 4)))).toString(16),
      );

interface Stored {
  conversationId: string;
  messages: ChatMessage[];
  memory: ConversationMemory;
  savedAt: number;
}

const fresh = (): Stored => ({ conversationId: newId(), messages: [], memory: EMPTY_MEMORY, savedAt: Date.now() });

const loadStored = (): Stored => {
  try {
    sessionStorage.removeItem(OLD_STORAGE_KEY);
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || !Array.isArray(parsed.messages) || typeof parsed.conversationId !== "string") return fresh();
    if (Date.now() - Number(parsed.savedAt) > RETENTION_MS) return fresh();
    // A reply that was still arriving when the tab closed is incomplete: drop it rather than show half an answer.
    const messages = parsed.messages.filter((m) => !m.streaming);
    return { ...parsed, messages, memory: parsed.memory ?? EMPTY_MEMORY };
  } catch {
    return fresh();
  }
};

const save = (state: Stored) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch {
    // Private browsing or a full quota: the conversation just won't survive a reload.
  }
};

const endpoint = (): { url: string; headers: Record<string, string> } | null => {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) {
    headers.apikey = key;
    // Legacy keys are JWTs and go in Authorization too, as supabase-js does; the function itself needs no sign-in.
    if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  }
  return { url: `${base.replace(/\/$/, "")}/functions/v1/concierge/chat`, headers };
};

const notice = (code: ConciergeNotice["code"], message: string, contact?: { email?: string | null; bookingPath?: string | null }): ConciergeNotice => ({
  code,
  message,
  email: contact?.email ?? FALLBACK_CONTACT.email,
  bookingPath: contact?.bookingPath ?? FALLBACK_CONTACT.bookingPath,
});

const NETWORK = "The concierge couldn't be reached. Check your connection and try again.";

export const useConciergeChat = () => {
  const initial = useRef<Stored>(loadStored());
  const [conversationId, setConversationId] = useState(initial.current.conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.current.messages);
  const [memory, setMemory] = useState<ConversationMemory>(initial.current.memory);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<ConciergeNotice | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const memoryRef = useRef(memory);
  memoryRef.current = memory;

  useEffect(() => {
    save({ conversationId, messages, memory, savedAt: Date.now() });
  }, [conversationId, messages, memory]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || abortRef.current) return;

      setError(null);
      setIsSlow(false);
      const history = messagesRef.current
        .filter((m) => !m.failed && !m.streaming && m.content)
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content }));
      const userMessage: ChatMessage = { id: newId(), role: "user", content: trimmed };
      const answerId = newId();
      setMessages((prev) => [...prev, userMessage]);
      setPhase("waiting");

      const controller = new AbortController();
      abortRef.current = controller;
      const slowTimer = setTimeout(() => setIsSlow(true), SLOW_AFTER_MS);
      let timedOut = false;
      const giveUp = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, GIVE_UP_AFTER_MS);
      // Started over (reset) while this answer was on its way: drop it silently.
      const cancelled = () => abortRef.current !== controller;

      let answer = "";
      const fail = (n: ConciergeNotice) => {
        if (cancelled()) return;
        setMessages((prev) =>
          prev.filter((m) => m.id !== answerId).map((m) => (m.id === userMessage.id ? { ...m, failed: true } : m)),
        );
        setError(n);
      };
      const showAnswer = (streaming: boolean) => {
        if (cancelled()) return;
        setMessages((prev) => {
          const without = prev.filter((m) => m.id !== answerId);
          return answer ? [...without, { id: answerId, role: "assistant", content: answer, streaming }] : without;
        });
      };

      try {
        const target = endpoint();
        if (!target) {
          fail(notice("unavailable", "The concierge isn't available on this version of the site."));
          return;
        }
        const res = await fetch(target.url, {
          method: "POST",
          headers: target.headers,
          body: JSON.stringify({ message: trimmed, history, memory: memoryRef.current, conversationId, stream: true }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          let data: { error?: string; code?: ConciergeNotice["code"]; contact?: { email?: string; bookingPath?: string } } = {};
          try {
            data = await res.json();
          } catch {
            // not JSON: fall through to the generic message
          }
          const code = data.code ?? (res.status === 429 ? "busy" : "unavailable");
          fail(notice(code, data.error ?? "The concierge can't answer right now. Please try again in a moment.", data.contact));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;
        const handle = (line: string) => {
          if (!line.trim()) return;
          let event: { type?: string; text?: string; code?: ConciergeNotice["code"]; message?: string; memory?: ConversationMemory; contact?: { email?: string; bookingPath?: string } };
          try {
            event = JSON.parse(line);
          } catch {
            return;
          }
          if (event.type === "delta" && typeof event.text === "string") {
            if (!answer) {
              clearTimeout(slowTimer);
              setIsSlow(false);
              setPhase("streaming");
            }
            answer += event.text;
            showAnswer(true);
          } else if (event.type === "reset") {
            answer = "";
            showAnswer(true);
          } else if (event.type === "error") {
            finished = true;
            answer = "";
            fail(notice(event.code ?? "unavailable", event.message ?? "The concierge can't answer right now.", event.contact));
          } else if (event.type === "done") {
            finished = true;
            if (event.memory && !cancelled()) setMemory(event.memory);
            showAnswer(false);
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut: number;
          while ((cut = buffer.indexOf("\n")) !== -1) {
            handle(buffer.slice(0, cut));
            buffer = buffer.slice(cut + 1);
          }
        }
        if (buffer) handle(buffer);
        if (!finished) {
          answer = "";
          fail(notice("unavailable", "The answer was interrupted. Please try again."));
        }
      } catch {
        answer = "";
        fail(timedOut ? notice("timeout", "The concierge took too long to answer. Please try again.") : notice("network", NETWORK));
      } finally {
        clearTimeout(slowTimer);
        clearTimeout(giveUp);
        if (!cancelled()) {
          abortRef.current = null;
          setIsSlow(false);
          setPhase("idle");
        }
      }
    },
    [conversationId],
  );

  /** Sends the failed message again, in the same place in the conversation, without duplicating it. */
  const retry = useCallback(() => {
    const failed = [...messagesRef.current].reverse().find((m) => m.role === "user" && m.failed);
    if (!failed || abortRef.current) return;
    setMessages((prev) => prev.filter((m) => m.id !== failed.id));
    messagesRef.current = messagesRef.current.filter((m) => m.id !== failed.id);
    void send(failed.content);
  }, [send]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const next = fresh();
    setConversationId(next.conversationId);
    setMessages([]);
    setMemory(EMPTY_MEMORY);
    setError(null);
    setPhase("idle");
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { messages, phase, isSending: phase !== "idle", isSlow, error, send, retry, reset };
};
