// The setup steps of the hand-off (./steps.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { STEPS, NETLIFY_VARIABLES, SCOPES, audienceFor, checkResult, CHECK_TEXT } = await import("./steps.ts");

test("the steps are in order and only the live check turns green by itself", () => {
  assert.deepEqual(STEPS.map((s) => s.id), ["trades-ready", "keys", "netlify", "public-key", "redeploy", "check", "open"]);
  assert.deepEqual(STEPS.filter((s) => s.kind === "auto").map((s) => s.id), ["check"]);
  for (const s of STEPS) assert.ok(s.title && s.detail && !/\bnpm\b|terminal|command line/i.test(s.detail), s.id);
});

test("the Netlify variables are exactly the ones the function reads, with Production + Functions", () => {
  const core = readFileSync(new URL("../../../../netlify/functions/assert/core.mjs", import.meta.url), "utf8");
  const read = [...core.matchAll(/env\.([A-Z_]+)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(read)].sort(), NETLIFY_VARIABLES.map((v) => v.name).sort());
  assert.equal(SCOPES, "Production + Functions");
  assert.deepEqual(NETLIFY_VARIABLES.filter((v) => v.secret).map((v) => v.name), ["SSO_PRIVATE_KEY"]);
});

test("the audience is the Houcine.Trades host", () => {
  assert.equal(audienceFor("https://houcine-trades.onrender.com/"), "houcine-trades.onrender.com");
  assert.equal(audienceFor("https://Trades.Houcine.World"), "trades.houcine.world");
  assert.equal(audienceFor("http://x.example"), null);
  assert.equal(audienceFor("not a url"), null);
});

test("the live check reads the function's answer", () => {
  assert.equal(checkResult(200), "ok");
  assert.equal(checkResult(503), "not-configured");
  assert.equal(checkResult(403), "refused");
  assert.equal(checkResult(429), "busy");
  assert.equal(checkResult(0), "failed");
  assert.equal(checkResult(0, true), "expired");
  assert.equal(checkResult(404), "not-deployed");
  assert.equal(checkResult(500), "failed");
  for (const k of ["ok", "not-configured", "not-deployed", "refused", "busy", "expired", "failed"]) assert.ok(CHECK_TEXT[k]);
});
