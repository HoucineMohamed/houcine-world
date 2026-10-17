// The owner command center's data and storage helpers (./items.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

const { SETUP_GROUPS, TRADES_OWNER_PAGES, END_TO_END_STEPS, tradesPageUrl, loadState, saveState, STORAGE_KEY, isRealDate } = await import("./items.ts");

test("the groups the owner asked for, each item with a sentence and a click path", () => {
  assert.deepEqual(SETUP_GROUPS.map((g) => g.id), ["handoff", "supabase", "domains", "hosting", "legal", "content"]);
  const ids = SETUP_GROUPS.flatMap((g) => g.items.map((i) => i.id));
  assert.equal(new Set(ids).size, ids.length, "ids are unique");
  for (const g of SETUP_GROUPS) for (const i of g.items) {
    assert.ok(i.title && i.why && i.path, i.id);
    assert.match(i.why, /\.$/, `${i.id}: one sentence`);
    assert.doesNotMatch(`${i.why} ${i.path}`, /\bnpm\b|terminal|command line/i, `${i.id}: browser steps only`);
  }
  const all = JSON.stringify(SETUP_GROUPS);
  for (const needle of ["Production, Functions", "TRADES_AUDIENCE", "OWNER_USER_ID", "SUPABASE_ACCESS_TOKEN", "NOTIFY_FROM", "Allow new users to sign up", "magic", "trades.houcine.world", "TRADES_URL", "onrender.com", "Vercel", "legal", "portfolio", "testimonials"]) {
    assert.ok(all.toLowerCase().includes(needle.toLowerCase()), needle);
  }
});

test("the domain steps are in the safe order: domain, then URL and audience together, then removal", () => {
  assert.deepEqual(SETUP_GROUPS.find((g) => g.id === "domains").items.map((i) => i.id), ["trades-domain", "trades-url", "trades-audience", "remove-onrender"]);
});

test("Trades page links are built only from the validated address and one list", () => {
  assert.deepEqual(TRADES_OWNER_PAGES.map((p) => p.path), ["security", "security/sso", "backups"]);
  assert.equal(tradesPageUrl("https://houcine-trades.onrender.com/", "security/sso"), "https://houcine-trades.onrender.com/security/sso");
  assert.equal(tradesPageUrl(null, "security"), null);
  assert.equal(tradesPageUrl("http://x.example/", "security"), null);
  assert.equal(tradesPageUrl("https://x.example", "security"), null);
  assert.equal(tradesPageUrl("https://x.example/", "../evil?x=1"), null);
  assert.ok(END_TO_END_STEPS.length >= 4);
});

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m };
};

test("state round-trips, and only known ticks and a real date are kept", () => {
  const s = memory();
  assert.equal(saveState(s, { done: { keys: true, vercel: true }, verifiedOn: "2026-10-17" }), true);
  assert.deepEqual(loadState(s), { done: { keys: true, vercel: true }, verifiedOn: "2026-10-17" });
  s.setItem(STORAGE_KEY, JSON.stringify({ done: { keys: true, evil: true, vercel: "yes" }, verifiedOn: "<script>" }));
  assert.deepEqual(loadState(s), { done: { keys: true }, verifiedOn: "" });
  s.setItem(STORAGE_KEY, JSON.stringify({ done: {}, verifiedOn: "2026-02-30" }));
  assert.equal(loadState(s).verifiedOn, "", "not a real date");
  assert.equal(isRealDate("2024-02-29"), true);
  assert.equal(isRealDate("9999-99-99"), false);
});

test("the page works without storage: missing, broken, throwing or refusing", () => {
  const empty = { done: {}, verifiedOn: "" };
  const unreadable = { ...empty, readable: false };
  assert.deepEqual(loadState(null), empty);
  assert.deepEqual(loadState(undefined), empty);
  const s = memory();
  s.setItem(STORAGE_KEY, "{not json");
  assert.deepEqual(loadState(s), unreadable, "a broken saved state is reported, so the page does not overwrite it silently");
  s.setItem(STORAGE_KEY, "42");
  assert.deepEqual(loadState(s), unreadable);
  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); } };
  assert.deepEqual(loadState(throwing), unreadable);
  assert.equal(saveState(throwing, empty), false);
  assert.equal(saveState(null, empty), false);
});
