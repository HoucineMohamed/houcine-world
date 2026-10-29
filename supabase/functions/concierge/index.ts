// concierge: the La Rosa View Concierge backend. POST /concierge/chat. Checks the request (core.ts), runs one turn
// over the Houcine.world knowledge brain (pipeline.ts: interpret -> retrieve -> answer) and streams the answer back
// as newline-delimited JSON events ({"type":"delta","text":...} ... {"type":"done"}), or returns one JSON object when
// the request says `"stream": false`. Nothing is stored: the visitor's browser resends the recent turns and the
// conversation memory with each message. docs/knowledge-brain.md explains the whole design.
//
// Secrets (Supabase -> Edge Functions -> Secrets; names only, docs/concierge-setup.md):
//   ANTHROPIC_API_KEY             required. Without it every message gets an honest "not available" event with the
//                                 team's contact -- never an invented answer.
//   ANTHROPIC_MODEL               optional, the answering model. Default "claude-opus-5-5".
//   CONCIERGE_INTERPRETER_MODEL   optional, the small model that interprets each message. Default
//                                 "claude-haiku-5-5"; "off" skips that step (search then uses the visitor's words).
//
// Logs never contain a visitor's message, the memory, the AI's reply or any secret value: only step outcomes.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { checkChatRequest, clientAddress, createRateLimiter, isAllowedOrigin } from "./core.ts";
import { runTurn, type ConciergeEvent } from "./pipeline.ts";
import { LA_ROSA_VIEW_CONCIERGE } from "./agent.ts";
import { withIndexAccess } from "../_shared/brain/agent.ts";
import { BRAIN_INDEX } from "../_shared/brain/index.generated.ts";
import { createAnthropicProvider } from "../_shared/llm/anthropic.ts";

const MAX_BODY = 32_000;
const ANSWER_TIMEOUT_MS = 45_000;
const INTERPRETER_TIMEOUT_MS = 12_000;
const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_INTERPRETER = "claude-haiku-5-5";
const allow = createRateLimiter();
// The agent with the access configured in the knowledge brain (Knowledge Studio, Settings, AI access).
const AGENT = withIndexAccess(LA_ROSA_VIEW_CONCIERGE, BRAIN_INDEX);

const cors = (origin: string | null): Record<string, string> =>
  origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};

const json = (status: number, body: Record<string, unknown>, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(origin) },
  });

const providers = () => {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return { answerer: null, interpreter: null };
  const model = Deno.env.get("ANTHROPIC_MODEL")?.trim() || DEFAULT_MODEL;
  const interpreterModel = Deno.env.get("CONCIERGE_INTERPRETER_MODEL")?.trim() || DEFAULT_INTERPRETER;
  return {
    answerer: createAnthropicProvider({ apiKey, model, effort: "low", timeoutMs: ANSWER_TIMEOUT_MS, fetch }),
    interpreter:
      interpreterModel === "off"
        ? null
        : createAnthropicProvider({ apiKey, model: interpreterModel, effort: "low", timeoutMs: INTERPRETER_TIMEOUT_MS, fetch }),
  };
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  // GET /concierge/status: which knowledge index this deployment serves. Knowledge Studio compares it with the index
  // it published to confirm the AI really has the new knowledge. Public and harmless: counts and a fingerprint only.
  if (req.method === "GET" && new URL(req.url).pathname.split("/").pop() === "status") {
    return json(200, { fingerprint: BRAIN_INDEX.fingerprint, notes: BRAIN_INDEX.notes.length, passages: BRAIN_INDEX.chunks.length }, allowed ? origin : null);
  }

  if (req.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        ...cors(origin),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
        "Access-Control-Max-Age": "600",
      },
    });
  }
  if (!allowed) return json(403, { error: "Origin not allowed" }, null);
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  const action = new URL(req.url).pathname.split("/").pop();
  if (action !== "chat") return json(400, { error: "Invalid action. Use /chat" }, origin);

  const address = clientAddress(req.headers);
  if (!address) console.warn("concierge: refused, the platform sent no caller address");
  if (!allow(address, Date.now())) {
    return json(429, { error: "Too many messages. Please wait a few minutes and try again.", code: "busy" }, origin);
  }

  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY) return json(413, { error: "Request too large" }, origin);
  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return json(413, { error: "Request too large" }, origin);
    body = JSON.parse(text);
  } catch {
    return json(400, { error: "Invalid request body" }, origin);
  }
  const checked = checkChatRequest(body);
  if (!checked.ok) return json(400, { error: checked.error }, origin);

  const { answerer, interpreter } = providers();
  if (!answerer) console.warn("concierge: ANTHROPIC_API_KEY is not set; answering with the not-available notice");
  const options = { request: checked.value, agent: AGENT, index: BRAIN_INDEX, answerer, interpreter };
  const log = (r: { interpreter: string; passages: number; answer: string }) =>
    console.log(`concierge: turn interpreter=${r.interpreter} passages=${r.passages} answer=${r.answer}`);

  if (!checked.value.stream) {
    const events: ConciergeEvent[] = [];
    try {
      log(await runTurn(options, (e) => events.push(e)));
    } catch (e) {
      console.error("concierge: unexpected error:", e instanceof Error ? e.name : "unknown");
      return json(500, { error: "Something went wrong", code: "unavailable" }, origin);
    }
    const error = events.find((e) => e.type === "error");
    if (error && error.type === "error") {
      const status = error.code === "not_configured" ? 503 : error.code === "busy" ? 429 : error.code === "timeout" ? 504 : 502;
      return json(status, { error: error.message, code: error.code, contact: error.contact }, origin);
    }
    let reply = "";
    for (const e of events) reply = e.type === "reset" ? "" : e.type === "delta" ? reply + e.text : reply;
    const meta = events.find((e) => e.type === "meta");
    const done = events.find((e) => e.type === "done");
    return json(200, {
      reply: reply.trim(),
      memory: done && done.type === "done" ? done.memory : null,
      sources: meta && meta.type === "meta" ? meta.sources : [],
      language: meta && meta.type === "meta" ? meta.language : null,
    }, origin);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: ConciergeEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        log(await runTurn(options, send));
      } catch (e) {
        console.error("concierge: unexpected error:", e instanceof Error ? e.name : "unknown");
        send({ type: "error", code: "unavailable", message: "The concierge can't answer right now. Please try again in a moment.", contact: { email: null, bookingPath: null } });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...cors(origin) },
  });
};

serve(handler);
