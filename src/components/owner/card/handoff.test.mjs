// The Houcine.Trades hand-off screen's decisions (./handoff.ts).
//   node --experimental-strip-types --test src/components/owner/card/handoff.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

const { handoffOutcome, createHandoffStore } = await import("./handoff.ts");
const HREF = "https://houcine-trades.onrender.com/";
const NOTE = ["eyJhbGciOiJFZERTQSJ9", "eyJzdWIiOiJ4In0", "c2ln"].join(".");

test("a good answer opens TRADES_URL + sso#<note> in a fragment, never a query string", () => {
  const out = handoffOutcome(200, { assertion: NOTE }, HREF, "sso");
  assert.deepEqual(out, { kind: "go", url: `${HREF}sso#${NOTE}` });
  assert.ok(!out.url.includes("?"));
});

test("503, a missing function (404, 405, or the site's page instead of JSON) mean not set up yet", () => {
  assert.deepEqual(handoffOutcome(503, { error: "not configured" }, HREF, "sso"), { kind: "not-configured" });
  for (const s of [404, 405]) assert.deepEqual(handoffOutcome(s, null, HREF, "sso"), { kind: "not-configured" });
  assert.deepEqual(handoffOutcome(200, null, HREF, "sso"), { kind: "not-configured" });
});

test("no session means the sign-in has ended; a network failure is an error", () => {
  assert.deepEqual(handoffOutcome(0, null, HREF, "sso", "no-session"), { kind: "expired" });
  assert.deepEqual(handoffOutcome(0, null, HREF, "sso", "network"), { kind: "error" });
});

test("anything else is an error the owner may retry", () => {
  for (const [status, body] of [[403, { error: "forbidden" }], [429, {}], [500, null], [0, null], [200, {}], [200, { assertion: 42 }], [200, { assertion: "not a token" }], [200, { assertion: `${NOTE}?x=1` }], [200, { assertion: "a.b.c".repeat(1000) }]]) {
    assert.deepEqual(handoffOutcome(status, body, HREF, "sso"), { kind: "error" }, `${status} ${JSON.stringify(body)?.slice(0, 40)}`);
  }
});

test("a bad address or path never navigates", () => {
  for (const href of ["http://houcine-trades.onrender.com/", "https://houcine-trades.onrender.com", "https://x.example/?a=1/", "https://x.example/#/"]) {
    assert.deepEqual(handoffOutcome(200, { assertion: NOTE }, href, "sso"), { kind: "error" }, href);
  }
  for (const path of ["", "../x", "sso?x", "SSO", "sso/x"]) assert.deepEqual(handoffOutcome(200, { assertion: NOTE }, HREF, path), { kind: "error" }, path);
});

test("the store tells every listener and stops after unsubscribe", () => {
  const s = createHandoffStore();
  const seen = [];
  const off = s.subscribe(() => seen.push(s.get()));
  s.set("opening");
  s.set("error");
  off();
  s.set("idle");
  assert.deepEqual(seen, ["opening", "error"]);
  assert.equal(s.get(), "idle");
});
