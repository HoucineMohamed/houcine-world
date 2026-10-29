// Tests of the concierge function's request rules (supabase/functions/concierge/core.ts): what a visitor may send
// (message, recent turns, conversation memory, conversation id), the memory's privacy filter, and who may call it.
// The pipeline, the prompts and the AI adapter have their own tests: scripts/ci/concierge-pipeline.test.mjs.
//
//   node --experimental-strip-types --test scripts/ci/concierge.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = process.env.CONCIERGE_CORE_PATH ?? join(here, "../../supabase/functions/concierge/core.ts");
const core = await import(pathToFileURL(modulePath).href);
const { checkChatRequest, isAllowedOrigin, clientAddress, createRateLimiter, memoryOf, isSensitive, LIMITS } = core;

const headers = (h) => ({ get: (k) => h[k.toLowerCase()] ?? null });

test("a plain message with no history is accepted", () => {
  const r = checkChatRequest({ message: "Tell me about La Rosa View." });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    message: "Tell me about La Rosa View.",
    history: [],
    memory: { stated: [], inferred: [], summary: "" },
    conversationId: null,
    stream: false,
  });
});

test("a message with valid history is accepted and trimmed to the limit", () => {
  const longHistory = Array.from({ length: LIMITS.historyTurns * 2 + 10 }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `message ${i}`,
  }));
  const r = checkChatRequest({ message: "And the prices?", history: longHistory });
  assert.equal(r.ok, true);
  assert.equal(r.value.history.length, LIMITS.historyTurns * 2);
  // The most recent turns are kept, not the oldest.
  assert.equal(r.value.history.at(-1).content, `message ${longHistory.length - 1}`);
});

test("empty or missing message is refused", () => {
  assert.equal(checkChatRequest({}).ok, false);
  assert.equal(checkChatRequest({ message: "" }).ok, false);
  assert.equal(checkChatRequest({ message: "   " }).ok, false);
  assert.equal(checkChatRequest({ message: 42 }).ok, false);
});

test("a message over the length limit is refused", () => {
  const r = checkChatRequest({ message: "x".repeat(LIMITS.message + 1) });
  assert.equal(r.ok, false);
});

test("control characters and zero-width/direction marks are refused", () => {
  assert.equal(checkChatRequest({ message: "hello\u0000world" }).ok, false);
  assert.equal(checkChatRequest({ message: "hello​world" }).ok, false);
  assert.equal(checkChatRequest({ message: "hello‮world" }).ok, false);
});

test("an unexpected top-level field is refused", () => {
  assert.equal(checkChatRequest({ message: "hi", sessionToken: "x" }).ok, false);
});

test("history must be an array of {role, content} with a known role", () => {
  assert.equal(checkChatRequest({ message: "hi", history: "not an array" }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", history: [{ role: "system", content: "x" }] }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", history: [{ role: "user", content: "x", extra: 1 }] }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", history: [{ role: "user", content: "" }] }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", history: [{ role: "user", content: "x".repeat(LIMITS.historyUserLength + 1) }] }).ok, false);
  // An answer may be longer than a visitor message.
  assert.equal(checkChatRequest({ message: "hi", history: [{ role: "user", content: "a" }, { role: "assistant", content: "x".repeat(3000) }] }).ok, true);
});

test("the site's own origins are allowed, nothing else", () => {
  assert.equal(isAllowedOrigin("https://houcine.world"), true);
  assert.equal(isAllowedOrigin("https://www.houcine.world"), true);
  assert.equal(isAllowedOrigin("https://houcineworld.netlify.app"), true);
  assert.equal(isAllowedOrigin("https://deploy-preview-12--houcineworld.netlify.app"), true);
  assert.equal(isAllowedOrigin("http://localhost:8080"), true);
  assert.equal(isAllowedOrigin(null), false);
  assert.equal(isAllowedOrigin("https://evil.example"), false);
  assert.equal(isAllowedOrigin("https://houcineworld.netlify.app.evil.example"), false);
});

test("the caller address prefers cf-connecting-ip, then the first x-forwarded-for entry", () => {
  assert.equal(clientAddress(headers({ "cf-connecting-ip": "1.2.3.4" })), "1.2.3.4");
  assert.equal(clientAddress(headers({ "x-forwarded-for": "5.6.7.8, 9.9.9.9" })), "5.6.7.8");
  assert.equal(clientAddress(headers({})), null);
});

test("the rate limiter allows up to max, refuses an unknown address, and resets after the window", () => {
  const allow = createRateLimiter({ max: 2, windowMs: 1000 });
  const t0 = 1_000_000;
  assert.equal(allow("1.2.3.4", t0), true);
  assert.equal(allow("1.2.3.4", t0 + 1), true);
  assert.equal(allow("1.2.3.4", t0 + 2), false);
  assert.equal(allow(null, t0), false);
  assert.equal(allow("1.2.3.4", t0 + 1001), true);
});

test("a history that starts with an answer is trimmed to start with the visitor", () => {
  const r = checkChatRequest({ message: "hi", history: [{ role: "assistant", content: "Welcome" }, { role: "user", content: "a" }, { role: "assistant", content: "b" }] });
  assert.equal(r.ok, true);
  assert.equal(r.value.history[0].role, "user");
});

test("conversation id: a UUID or nothing; stream: a boolean", () => {
  const id = "3f2b8c1e-9a4d-4c2b-8e1f-0a1b2c3d4e5f";
  assert.equal(checkChatRequest({ message: "hi", conversationId: id, stream: true }).value.conversationId, id);
  assert.equal(checkChatRequest({ message: "hi", conversationId: "../../etc" }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", conversationId: 5 }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", stream: "yes" }).ok, false);
});

test("memory: stated and inferred items and a summary, within limits", () => {
  const memory = { stated: [{ key: "event date", value: "December 15" }, { key: "city", value: "Sousse" }], inferred: [{ key: "event type", value: "private party" }], summary: "Wants to book the DJ." };
  const r = checkChatRequest({ message: "And the price?", memory });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.memory, memory);
  assert.equal(checkChatRequest({ message: "hi", memory: { stated: "x" } }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", memory: { stated: [{ key: "a", value: "b", extra: 1 }] } }).ok, false);
  assert.equal(checkChatRequest({ message: "hi", memory: { other: [] } }).ok, false);
  const many = Array.from({ length: 30 }, (_, i) => ({ key: `k${i}`, value: "v" }));
  assert.equal(memoryOf({ stated: many }).stated.length, LIMITS.memoryItems);
  assert.equal(memoryOf({ summary: "s".repeat(5000) }).summary.length, LIMITS.memorySummary);
});

test("memory never keeps an email, a phone or card number, but keeps dates and guest counts", () => {
  assert.equal(isSensitive("name@example.com"), true);
  assert.equal(isSensitive("+216 22 333 444"), true);
  assert.equal(isSensitive("4970 1012 3456 7890"), true);
  assert.equal(isSensitive("2026-12-15"), false);
  assert.equal(isSensitive("15/12/2026"), false);
  assert.equal(isSensitive("about 200 guests"), false);
  const m = memoryOf({ stated: [{ key: "email", value: "me@mail.com" }, { key: "date", value: "2026-12-15" }] });
  assert.deepEqual(m.stated, [{ key: "date", value: "2026-12-15" }]);
});
