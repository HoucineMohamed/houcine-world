// concierge: the La Rosa View Concierge chat backend. POST /concierge/chat. The rules and the pure
// code are in core.ts and knowledgeBase.ts; this file reads the request, calls the AI provider and
// returns the reply. No conversation is stored server-side -- the client resends the recent turns
// with each request (see core.ts's historyOf) and this function treats each request independently.
//
// Secrets (Supabase -> Edge Functions -> Secrets; names only, see docs/owner-review-guide.md for
// where that screen is):
//   ANTHROPIC_API_KEY   required. An API key from https://console.anthropic.com (Claude). Without
//                       it the function answers every request with a clear "not configured yet"
//                       message instead of a 500, and logs that the secret is missing (name only).
//   ANTHROPIC_MODEL     optional. Defaults to "claude-sonnet-4-5" if not set.
//
// Logs never contain a visitor's message, the AI's reply, or any secret value.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  buildAnthropicRequest,
  checkChatRequest,
  clientAddress,
  createRateLimiter,
  extractReplyText,
  FALLBACK,
  isAllowedOrigin,
} from "./core.ts";

const MAX_BODY = 8_000;
const PROVIDER_TIMEOUT_MS = 20_000;
const allow = createRateLimiter();

const json = (status: number, body: Record<string, unknown>, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}),
    },
  });

const callAnthropic = async (
  req: ReturnType<typeof checkChatRequest> extends { ok: true; value: infer V } ? V : never,
  apiKey: string,
  model: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(buildAnthropicRequest(req, model)),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`concierge: provider refused, status ${res.status}`);
      if (res.status === 429) return { ok: false, status: 429, message: "The assistant is busy right now. Please try again in a moment." };
      return { ok: false, status: 502, message: "The assistant could not answer right now. Please try again." };
    }
    const data = await res.json();
    const text = extractReplyText(data);
    if (!text) {
      console.error("concierge: provider returned an unexpected response shape");
      return { ok: false, status: 502, message: "The assistant could not answer right now. Please try again." };
    }
    return { ok: true, text };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      console.error("concierge: provider timed out");
      return { ok: false, status: 504, message: "The assistant took too long to answer. Please try again." };
    }
    console.error("concierge: provider call failed:", e instanceof Error ? e.name : "unknown");
    return { ok: false, status: 502, message: "The assistant could not answer right now. Please try again." };
  } finally {
    clearTimeout(timer);
  }
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const allowed = isAllowedOrigin(origin);

  if (req.method === "OPTIONS") {
    if (!allowed) return new Response(null, { status: 403 });
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin!,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }
  if (!allowed) return json(403, { error: "Origin not allowed" }, null);
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, origin);

  const action = new URL(req.url).pathname.split("/").pop();
  if (action !== "chat") return json(400, { error: "Invalid action. Use /chat" }, origin);

  const address = clientAddress(req.headers);
  if (!address) console.warn("concierge: refused, the platform sent no caller address");
  if (!allow(address, Date.now())) return json(429, { error: "Too many messages. Please wait a moment and try again." }, origin);

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

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.warn("concierge: ANTHROPIC_API_KEY is not set; answering with the not-configured fallback");
    return json(200, { reply: FALLBACK, configured: false }, origin);
  }
  const model = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5";

  try {
    const result = await callAnthropic(checked.value, apiKey, model);
    if (!result.ok) return json(result.status, { error: result.message }, origin);
    return json(200, { reply: result.text, configured: true }, origin);
  } catch (e) {
    console.error("concierge: unexpected error:", e instanceof Error ? e.name : "unknown");
    return json(500, { error: "Something went wrong" }, origin);
  }
};

serve(handler);
