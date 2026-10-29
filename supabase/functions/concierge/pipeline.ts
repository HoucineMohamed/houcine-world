// One concierge turn, from a checked request to the events streamed back to the widget. Pure orchestration: the
// models come in as LlmProvider objects and the knowledge as a BrainIndex, so the Node tests run every path with a
// scripted fake provider (scripts/ci/concierge-pipeline.test.mjs) and index.ts wires the real ones.
//
//   1. no answering model configured -> an honest "not available" event with the team's contact, no invented answer
//   2. interpret the message (small model, JSON): language, topic, search queries, missing details, updated memory;
//      if that step fails, carry on with the visitor's own words and the previous memory
//   3. retrieve passages from the brain (only the agent's brands; the pinned contact passage always)
//   4. stream the answer from the main model, grounded in those passages
//   5. any failure -> one error event with a short code, a plain message and the team's contact; partial text is
//      discarded by the widget

import type { AgentProfile } from "../_shared/brain/agent.ts";
import type { BrainIndex } from "../_shared/brain/types.ts";
import { noteById, search, type Passage } from "../_shared/brain/retrieve.ts";
import {
  buildAnswerInput,
  buildAnswerSystem,
  buildInterpreterInput,
  buildInterpreterSystem,
  INTERPRETATION_SCHEMA,
  TOPICS,
  type Interpretation,
  type Topic,
} from "../_shared/brain/prompts.ts";
import type { LlmErrorKind, LlmMessage, LlmProvider } from "../_shared/llm/provider.ts";
import { memoryOf, type ChatRequest, type ConversationMemory } from "./core.ts";

export type ErrorCode = "not_configured" | "busy" | "timeout" | "unavailable" | "declined";

export type ConciergeEvent =
  | { type: "meta"; language: string | null; sources: string[]; memory: ConversationMemory }
  | { type: "delta"; text: string }
  | { type: "reset" }
  | { type: "done"; memory: ConversationMemory }
  | { type: "error"; code: ErrorCode; message: string; contact: Contact };

export interface Contact {
  email: string | null;
  bookingPath: string | null;
}

export interface TurnReport {
  interpreter: "ok" | "skipped" | LlmErrorKind;
  passages: number;
  answer: "ok" | LlmErrorKind;
}

export const ANSWER_MAX_TOKENS = 1500;
export const INTERPRETER_MAX_TOKENS = 1500;

const MESSAGES: Record<ErrorCode, string> = {
  not_configured: "The concierge's AI is switched off for the moment, so it can't answer questions right now.",
  busy: "The concierge is receiving a lot of messages right now. Please try again in a minute.",
  timeout: "The concierge took too long to answer. Please try again.",
  unavailable: "The concierge can't answer right now. Please try again in a moment.",
  declined: "The concierge can't help with that message. You can rephrase it, or contact the team directly.",
};

export const codeFor = (error: LlmErrorKind): ErrorCode => {
  switch (error) {
    case "not_configured":
      return "not_configured";
    case "rate_limited":
      return "busy";
    case "timeout":
      return "timeout";
    case "refused":
      return "declined";
    default:
      return "unavailable"; // auth, bad_request, bad_response, unavailable: the visitor can only retry or write
  }
};

export const contactFor = (index: BrainIndex, agent: AgentProfile): Contact => ({
  email: noteById(index, agent.contactNote)?.facts.email ?? null,
  bookingPath: agent.bookingNote ? noteById(index, agent.bookingNote)?.facts.booking_path ?? null : null,
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const shortText = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Checks the interpreter's JSON. Anything off-shape is rejected rather than half-trusted. */
export const readInterpretation = (value: unknown): Interpretation | null => {
  if (!isRecord(value)) return null;
  const language = shortText(value.language, 16);
  const intent = shortText(value.intent, 300);
  const topic = TOPICS.includes(value.topic as Topic) ? (value.topic as Topic) : null;
  if (!language || !intent || !topic) return null;
  if (!Array.isArray(value.search_queries) || !Array.isArray(value.missing_details)) return null;
  const queries = value.search_queries.map((q) => shortText(q, 160)).filter((q): q is string => q !== null).slice(0, 4);
  const missing = value.missing_details.map((q) => shortText(q, 120)).filter((q): q is string => q !== null).slice(0, 5);
  const memory = memoryOf(value.memory);
  if (!memory || typeof value.needs_clarification !== "boolean") return null;
  return { language, intent, topic, search_queries: queries, needs_clarification: value.needs_clarification, missing_details: missing, memory };
};

export interface RunOptions {
  request: ChatRequest;
  agent: AgentProfile;
  index: BrainIndex;
  /** The main model; null when no key is configured. */
  answerer: LlmProvider | null;
  /** The interpreting model; null to skip that step. */
  interpreter: LlmProvider | null;
}

export const runTurn = async (options: RunOptions, emit: (event: ConciergeEvent) => void): Promise<TurnReport> => {
  const { request, agent, index, answerer, interpreter } = options;
  const contact = contactFor(index, agent);
  const fail = (code: ErrorCode) => emit({ type: "error", code, message: MESSAGES[code], contact });

  if (!answerer) {
    fail("not_configured");
    return { interpreter: "skipped", passages: 0, answer: "not_configured" };
  }

  // 2. Interpret.
  let interpretation: Interpretation | null = null;
  let interpreterStatus: TurnReport["interpreter"] = "skipped";
  if (interpreter) {
    const result = await interpreter.json({
      system: buildInterpreterSystem(agent),
      messages: [{ role: "user", content: buildInterpreterInput(request.history, request.memory, request.message) }],
      maxTokens: INTERPRETER_MAX_TOKENS,
      schema: INTERPRETATION_SCHEMA,
    });
    if (result.ok) {
      interpretation = readInterpretation(result.value);
      interpreterStatus = interpretation ? "ok" : "bad_response";
    } else {
      interpreterStatus = result.error;
    }
  }
  const memory = interpretation?.memory ?? request.memory;

  // 3. Retrieve: the visitor's words, the interpreter's queries, and (without an interpreter) the previous visitor
  // message, so a short follow-up still finds its subject.
  const queries = [request.message, ...(interpretation?.search_queries ?? [])];
  if (!interpretation) {
    const previous = [...request.history].reverse().find((m) => m.role === "user");
    if (previous) queries.push(previous.content);
  }
  const found = interpretation?.topic === "greeting_or_thanks" && interpretation.search_queries.length === 0
    ? []
    : search(index, queries, agent.scope);
  const byChunk = new Map(index.chunks.map((c) => [c.id, c]));
  const passages: Passage[] = [...found];
  for (const id of agent.pinned) {
    const chunk = byChunk.get(id);
    const note = chunk && noteById(index, chunk.note);
    if (chunk && note && !passages.some((p) => p.chunk.id === id)) passages.push({ chunk, note, score: 0, via: "fallback" });
  }

  emit({ type: "meta", language: interpretation?.language ?? null, sources: [...new Set(passages.map((p) => p.note.id))], memory });

  // 4. Answer.
  const messages: LlmMessage[] = [
    ...request.history,
    { role: "user", content: buildAnswerInput(request.message, memory, passages, interpretation) },
  ];
  let wrote = false;
  const result = await answerer.stream(
    { system: buildAnswerSystem(agent), messages, maxTokens: ANSWER_MAX_TOKENS },
    {
      text: (t) => {
        wrote = true;
        emit({ type: "delta", text: t });
      },
      reset: () => emit({ type: "reset" }),
    },
  );
  if (!result.ok) {
    fail(codeFor(result.error));
    return { interpreter: interpreterStatus, passages: passages.length, answer: result.error };
  }
  if (!wrote) {
    fail("unavailable");
    return { interpreter: interpreterStatus, passages: passages.length, answer: "bad_response" };
  }
  emit({ type: "done", memory });
  return { interpreter: interpreterStatus, passages: passages.length, answer: "ok" };
};
