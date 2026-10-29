// The Anthropic adapter of the LlmProvider interface (provider.ts): the Messages API over plain fetch (no SDK: the
// project adds no dependency without the owner's approval, and Supabase Edge Functions run on Deno). Pure apart from
// the injected `fetch`, so the Node tests drive it with a fake fetch.
//
// What it sends (POST https://api.anthropic.com/v1/messages, header anthropic-version 2023-06-01):
//   - the fixed system text as one block marked for prompt caching (the same text every time, so repeat requests
//     read it from the cache at a fraction of the price);
//   - `output_config.effort` on models that take it (chat answers do well at "low": cheaper and faster);
//   - `output_config.format` (JSON schema) for json() on models with structured outputs;
//   - server-side refusal fallbacks (`fallbacks: "default"` + its beta header) on the models that accept them, so a
//     rare classifier decline is answered by Anthropic's recommended fallback model instead of failing;
//   - `stream: true` for stream(), read as server-sent events.
// What it never does: log or return a key, a prompt, an answer or the provider's error text. Every failure becomes a
// short LlmErrorKind.

import type { LlmErrorKind, LlmProvider, LlmRequest, LlmResult, StreamEvents } from "./provider.ts";

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  /** Effort for models that support it; omitted otherwise. */
  effort?: "low" | "medium" | "high";
  timeoutMs: number;
  fetch: typeof fetch;
}

const API = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

/** Models of the current generations take `output_config.effort`; older ids (claude-sonnet-4-5...) would refuse it. */
export const supportsEffort = (model: string): boolean =>
  /^claude-(opus-(4-[5-9]|5)|sonnet-(4-6|5)|haiku-5|fable-5|mythos-5)/.test(model);

/** Structured outputs (`output_config.format`). */
export const supportsJsonSchema = (model: string): boolean =>
  /^claude-(opus-(4-8|5)|sonnet-5|haiku-(4-5|5)|fable-5|mythos-5)/.test(model);

/** Server-side refusal fallbacks in the "default" form, on the Claude API. */
export const supportsDefaultFallback = (model: string): boolean =>
  /^claude-(opus-5|fable-5-1|sonnet-5-5)/.test(model);

export const buildBody = (
  model: string,
  request: LlmRequest,
  extra: { effort?: string; schema?: Record<string, unknown>; stream?: boolean },
): Record<string, unknown> => {
  const outputConfig: Record<string, unknown> = {};
  if (extra.effort && supportsEffort(model)) outputConfig.effort = extra.effort;
  if (extra.schema && supportsJsonSchema(model)) outputConfig.format = { type: "json_schema", schema: extra.schema };
  return {
    model,
    max_tokens: request.maxTokens,
    system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
    messages: request.messages,
    ...(Object.keys(outputConfig).length ? { output_config: outputConfig } : {}),
    ...(supportsDefaultFallback(model) ? { fallbacks: "default" } : {}),
    ...(extra.stream ? { stream: true } : {}),
  };
};

export const headersFor = (apiKey: string, model: string): Record<string, string> => ({
  "content-type": "application/json",
  "x-api-key": apiKey,
  "anthropic-version": VERSION,
  ...(supportsDefaultFallback(model) ? { "anthropic-beta": FALLBACK_BETA } : {}),
});

/** HTTP status -> error kind. The provider's own error text is never read into a message. */
export const errorForStatus = (status: number): LlmErrorKind => {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status === 400 || status === 404 || status === 413 || status === 422) return "bad_request";
  return "unavailable"; // 500, 502, 503, 529 (overloaded) and anything unexpected
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The text blocks of a non-streamed response, after the last fallback boundary. Null on an unexpected shape. */
export const responseText = (data: unknown): { text: string; stopReason: string } | null => {
  if (!isRecord(data) || !Array.isArray(data.content)) return null;
  let text = "";
  for (const block of data.content) {
    if (!isRecord(block)) continue;
    if (block.type === "fallback") text = "";
    else if (block.type === "text" && typeof block.text === "string") text += block.text;
  }
  return { text: text.trim(), stopReason: typeof data.stop_reason === "string" ? data.stop_reason : "unknown" };
};

/** Parses a server-sent-events body, calling `onEvent` with each JSON `data:` payload. */
export const readSse = async (body: ReadableStream<Uint8Array>, onEvent: (event: Record<string, unknown>) => void) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const flush = (block: string) => {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const parsed = JSON.parse(payload);
        if (isRecord(parsed)) onEvent(parsed);
      } catch {
        // A malformed event line is skipped; the final stop reason decides whether the answer is usable.
      }
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) !== -1) {
      flush(buffer.slice(0, cut));
      buffer = buffer.slice(cut + 2);
    }
  }
  if (buffer.trim()) flush(buffer);
};

export const createAnthropicProvider = (options: AnthropicOptions): LlmProvider => {
  const { apiKey, model, effort, timeoutMs } = options;
  const doFetch = options.fetch;

  const call = async (body: Record<string, unknown>, controller: AbortController): Promise<Response | LlmErrorKind> => {
    try {
      const res = await doFetch(API, { method: "POST", headers: headersFor(apiKey, model), body: JSON.stringify(body), signal: controller.signal });
      if (!res.ok) {
        try {
          await res.body?.cancel();
        } catch {
          // nothing to release
        }
        return errorForStatus(res.status);
      }
      return res;
    } catch (e) {
      return e instanceof Error && e.name === "AbortError" ? "timeout" : "unavailable";
    }
  };

  return {
    model,

    async json(request) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await call(buildBody(model, request, { effort, schema: request.schema }), controller);
        if (typeof res === "string") return { ok: false, error: res };
        let data: unknown;
        try {
          data = await res.json();
        } catch (e) {
          return { ok: false, error: e instanceof Error && e.name === "AbortError" ? "timeout" : "bad_response" };
        }
        const read = responseText(data);
        if (!read) return { ok: false, error: "bad_response" };
        if (read.stopReason === "refusal") return { ok: false, error: "refused" };
        const start = read.text.indexOf("{");
        const end = read.text.lastIndexOf("}");
        if (start === -1 || end <= start) return { ok: false, error: "bad_response" };
        try {
          return { ok: true, value: JSON.parse(read.text.slice(start, end + 1)) };
        } catch {
          return { ok: false, error: "bad_response" };
        }
      } finally {
        clearTimeout(timer);
      }
    },

    async stream(request: LlmRequest, events: StreamEvents): Promise<LlmResult<{ stopReason: string }>> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await call(buildBody(model, request, { effort, stream: true }), controller);
        if (typeof res === "string") return { ok: false, error: res };
        if (!res.body) return { ok: false, error: "bad_response" };
        let stopReason = "";
        let failed: LlmErrorKind | null = null;
        let wrote = false;
        await readSse(res.body, (event) => {
          if (event.type === "content_block_start" && isRecord(event.content_block) && event.content_block.type === "fallback") {
            if (wrote) events.reset();
            wrote = false;
          } else if (event.type === "content_block_delta" && isRecord(event.delta) && event.delta.type === "text_delta") {
            const t = event.delta.text;
            if (typeof t === "string" && t) {
              wrote = true;
              events.text(t);
            }
          } else if (event.type === "message_delta" && isRecord(event.delta) && typeof event.delta.stop_reason === "string") {
            stopReason = event.delta.stop_reason;
          } else if (event.type === "error") {
            const kind = isRecord(event.error) ? event.error.type : undefined;
            failed = kind === "rate_limit_error" ? "rate_limited" : kind === "overloaded_error" || kind === "api_error" ? "unavailable" : "bad_response";
          }
        });
        if (failed) return { ok: false, error: failed };
        if (stopReason === "refusal") return { ok: false, error: "refused" };
        if (!stopReason) return { ok: false, error: "bad_response" };
        return { ok: true, value: { stopReason } };
      } catch (e) {
        return { ok: false, error: e instanceof Error && e.name === "AbortError" ? "timeout" : "unavailable" };
      } finally {
        clearTimeout(timer);
      }
    },
  };
};
