// The pure request rules of the concierge function: what a visitor may send (message, recent turns, the
// conversation memory, a conversation id), who may call it (origin), and the per-address rate limit. No Deno,
// network or database code, so the Node tests (scripts/ci/concierge.test.mjs) import this file directly.
//
// Conversations are not stored on the server. The visitor's browser keeps the transcript and the short
// conversation memory (what the visitor stated, what was only inferred) for the length of the tab session and
// sends the recent part back with each message; the server rebuilds the context from that every time. So one
// visitor can never read another's conversation: there is nothing on the server to read.

import type { ConversationMemory, MemoryItem } from "../_shared/brain/prompts.ts";
export type { ConversationMemory, MemoryItem };

export const LIMITS = {
  message: 2000,
  historyTurns: 8, // a "turn" is one visitor message and one answer; older turns live on in the memory summary
  historyUserLength: 2000,
  historyAssistantLength: 4000,
  memoryItems: 12,
  memoryKey: 40,
  memoryValue: 200,
  memorySummary: 600,
} as const;

export type Role = "user" | "assistant";
export interface ChatMessage {
  role: Role;
  content: string;
}
export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  memory: ConversationMemory;
  conversationId: string | null;
  stream: boolean;
}
export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

export const EMPTY_MEMORY: ConversationMemory = { stated: [], inferred: [], summary: "" };

const CHAT_FIELDS = new Set(["message", "history", "memory", "conversationId", "stream"]);
// Control characters, zero-width and direction marks, line/paragraph separators, BOM: never allowed in a value that
// reaches a prompt or is rendered back to a visitor. Built from character codes so no editor can turn an escape
// into the invisible character itself.
const FORBIDDEN_RANGES: Array<[number, number]> = [
  [0x0000, 0x0008], [0x000b, 0x000b], [0x000c, 0x000c], [0x000e, 0x001f], [0x007f, 0x009f],
  [0x200b, 0x200f], [0x202a, 0x202e], [0x2028, 0x2028], [0x2029, 0x2029], [0x2060, 0x2060], [0xfeff, 0xfeff],
];
const FORBIDDEN = new RegExp(
  "[" + FORBIDDEN_RANGES.map(([a, b]) => String.fromCharCode(a) + "-" + String.fromCharCode(b)).join("") + "]",
);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const textOf = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s === "" || s.length > max) return null;
  if (FORBIDDEN.test(s)) return null;
  return s;
};

const historyOf = (v: unknown): ChatMessage[] | null => {
  if (v === undefined) return [];
  if (!Array.isArray(v)) return null;
  // Only the most recent turns are used; a longer history is trimmed, not refused.
  const trimmed = v.slice(-LIMITS.historyTurns * 2);
  const out: ChatMessage[] = [];
  for (const entry of trimmed) {
    if (!isRecord(entry)) return null;
    if (Object.keys(entry).some((k) => k !== "role" && k !== "content")) return null;
    if (entry.role !== "user" && entry.role !== "assistant") return null;
    const content = textOf(entry.content, entry.role === "user" ? LIMITS.historyUserLength : LIMITS.historyAssistantLength);
    if (content === null) return null;
    out.push({ role: entry.role, content });
  }
  // The provider needs the conversation to start with the visitor.
  while (out.length && out[0]!.role === "assistant") out.shift();
  return out;
};

// Personal contact or payment details are never kept in the memory, even when the visitor typed them: an email
// address, a phone or card number (8 digits or more once dates are set aside), or a payment or password word.
const DATES = /\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g;
export const isSensitive = (value: string): boolean =>
  /\S@\S/.test(value) ||
  /\d(?:[\s().-]?\d){7,}/.test(value.replace(DATES, " ")) ||
  /\b(?:iban|card number|carte bancaire|password|mot de passe)\b/i.test(value);

const memoryItemsOf = (v: unknown): MemoryItem[] | null => {
  if (v === undefined) return [];
  if (!Array.isArray(v)) return null;
  const out: MemoryItem[] = [];
  for (const entry of v.slice(0, LIMITS.memoryItems)) {
    if (!isRecord(entry) || Object.keys(entry).some((k) => k !== "key" && k !== "value")) return null;
    const key = textOf(entry.key, LIMITS.memoryKey);
    const value = textOf(entry.value, LIMITS.memoryValue);
    if (key === null || value === null) return null;
    if (isSensitive(value)) continue;
    out.push({ key, value });
  }
  return out;
};

/** Checks a memory object from the browser or from the interpreter model. Null when it is not a valid memory. */
export const memoryOf = (v: unknown): ConversationMemory | null => {
  if (v === undefined || v === null) return { ...EMPTY_MEMORY };
  if (!isRecord(v)) return null;
  if (Object.keys(v).some((k) => k !== "stated" && k !== "inferred" && k !== "summary")) return null;
  const stated = memoryItemsOf(v.stated);
  const inferred = memoryItemsOf(v.inferred);
  if (stated === null || inferred === null) return null;
  let summary = "";
  if (v.summary !== undefined && v.summary !== "") {
    if (typeof v.summary !== "string" || FORBIDDEN.test(v.summary)) return null;
    summary = v.summary.trim().slice(0, LIMITS.memorySummary);
  }
  return { stated, inferred, summary };
};

export const checkChatRequest = (body: unknown): Checked<ChatRequest> => {
  if (!isRecord(body)) return { ok: false, error: "Invalid request body" };
  if (Object.keys(body).some((k) => !CHAT_FIELDS.has(k))) return { ok: false, error: "Unexpected field" };
  const message = textOf(body.message, LIMITS.message);
  if (!message) return { ok: false, error: "Missing or invalid field: message" };
  const history = historyOf(body.history);
  if (history === null) return { ok: false, error: "Invalid field: history" };
  const memory = memoryOf(body.memory);
  if (memory === null) return { ok: false, error: "Invalid field: memory" };
  let conversationId: string | null = null;
  if (body.conversationId !== undefined) {
    if (typeof body.conversationId !== "string" || !UUID.test(body.conversationId)) return { ok: false, error: "Invalid field: conversationId" };
    conversationId = body.conversationId.toLowerCase();
  }
  if (body.stream !== undefined && typeof body.stream !== "boolean") return { ok: false, error: "Invalid field: stream" };
  return { ok: true, value: { message, history, memory, conversationId, stream: body.stream === true } };
};

/** The site's own origins -- the same rule as send-notification/core.ts (kept as its own copy by this codebase's
 *  convention; see supabase/functions/_shared/origin.ts's note on instagram-oauth). */
export const isAllowedOrigin = (origin: string | null): boolean =>
  origin !== null &&
  (origin === "https://houcine.world" ||
    origin === "http://localhost:8080" ||
    origin === "https://www.houcine.world" ||
    origin === "https://houcineworld.netlify.app" ||
    /^https:\/\/[a-z0-9-]+--houcineworld\.netlify\.app$/.test(origin));

export const clientAddress = (headers: { get(name: string): string | null }): string | null => {
  const direct = headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first ? first : null;
};

/**
 * At most `max` requests per address in a sliding `windowMs`. Fails closed: an unknown address is refused. Each
 * message costs two paid model calls, so the limit is what bounds the cost of a flood. It lives in the function's
 * memory, so it is per running instance (docs/knowledge-brain.md, "Limits").
 */
export const createRateLimiter = ({ max = 20, windowMs = 10 * 60_000, maxAddresses = 10_000 } = {}) => {
  const hits = new Map<string, number[]>();
  return (address: string | null, now: number): boolean => {
    if (!address) return false;
    for (const [a, times] of hits) {
      const recent = times.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(a);
      else hits.set(a, recent);
    }
    const times = hits.get(address) ?? [];
    if (times.length >= max) return false;
    if (!hits.has(address) && hits.size >= maxAddresses) return false;
    hits.set(address, [...times, now]);
    return true;
  };
};
