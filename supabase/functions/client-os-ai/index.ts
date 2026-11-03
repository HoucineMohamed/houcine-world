// client-os-ai: the Client AI Assistant (/portal) and the internal Client Intelligence Assistant (/workspace/clients).
//
//   POST /client-os-ai/ask  { mode: "client" | "internal", question, conversationId?, brandId? }
//
// Runs AS THE SIGNED-IN USER (their token is forwarded): no service role is used. Secrets: ANTHROPIC_API_KEY (shared
// with the other assistants), optional ANALYST_MODEL / ANTHROPIC_MODEL. Without a key the assistant answers that it
// is not configured; the rest of Client OS is unaffected. Logs hold outcomes only, never questions or answers.
import { authenticateRequest } from "../_shared/authz.ts";
import { createAnthropicProvider } from "../_shared/llm/anthropic.ts";
import { isAllowedOrigin } from "../concierge/core.ts";
import { BRAIN_INDEX } from "../_shared/brain/index.generated.ts";
import { handleAsk } from "./handler.ts";

const corsFor = (origin: string | null): Record<string, string> =>
  isAllowedOrigin(origin)
    ? { "Access-Control-Allow-Origin": origin!, Vary: "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }
    : {};
const json = (status: number, body: unknown, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsFor(origin) } });

const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
const model = Deno.env.get("ANALYST_MODEL")?.trim() || Deno.env.get("ANTHROPIC_MODEL")?.trim() || "claude-opus-5-5";
const llm = apiKey ? createAnthropicProvider({ apiKey, model, effort: "low", timeoutMs: 60_000, fetch }) : null;
const recent = new Map<string, number[]>();
const burst = (userId: string) => {
  const now = Date.now();
  const list = (recent.get(userId) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(userId, list);
  return list.length > 8;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: isAllowedOrigin(origin) ? 204 : 403, headers: corsFor(origin) });
  if (!isAllowedOrigin(origin)) return json(403, { error: "Not allowed from this origin." }, origin);
  if (req.method !== "POST") return json(405, { error: "POST only." }, origin);
  const auth = await authenticateRequest(req);
  if (!auth) return json(401, { error: "Sign in again." }, origin);
  if (burst(auth.user.id)) return json(429, { error: "Too many questions in a minute. Wait a moment." }, origin);
  if (new URL(req.url).pathname.split("/").filter(Boolean).pop() !== "ask") return json(404, { error: "Unknown action." }, origin);
  let body: Record<string, unknown> = {};
  try { const raw = await req.text(); if (raw.length > 8000) return json(413, { error: "Too large." }, origin); body = raw ? JSON.parse(raw) : {}; } catch { return json(400, { error: "Invalid request." }, origin); }
  try {
    const r = await handleAsk(auth.userClient, auth.user.id, body, llm, BRAIN_INDEX);
    console.log(`client-os-ai: ${body.mode} ${r.status}`);
    return json(r.status, r.body, origin);
  } catch (e) {
    console.error("client-os-ai: failed", e instanceof Error ? e.message.slice(0, 80) : "unknown");
    return json(500, { error: "The assistant could not complete this request. Everything else in Client OS works as usual." }, origin);
  }
});
