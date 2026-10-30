// The coverage score (supabase/functions/_shared/brain/coverage.ts) and its fixed visitor questions
// (coverage-questions.ts): the list is consistent with the published index, the score is search only and
// deterministic, brand separation holds, a note outside the public index never counts as found, and the questions
// the notes answer today keep being found (a note change that breaks one fails here; docs/knowledge-studio.md).
//
//   node --experimental-strip-types --test scripts/ci/coverage.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const { scoreCoverage, checkQuestions, coverageSummary } = await import(join(root, "supabase/functions/_shared/brain/coverage.ts"));
const { COVERAGE_QUESTIONS } = await import(join(root, "supabase/functions/_shared/brain/coverage-questions.ts"));
const { BRANDS } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
const { BRAIN_INDEX } = await import(join(root, "supabase/functions/_shared/brain/index.generated.ts"));

/**
 * Questions a note should answer but the search misses from the visitor's words alone (shown as "Not found" in the
 * Studio). Shrink this list when a note is improved; never grow it to make a failing change pass.
 */
const KNOWN_MISSES = new Set(["lrv-contact"]);

test("every question is consistent with the published index (ids, brands, notes, sections)", () => {
  assert.deepEqual(checkQuestions(COVERAGE_QUESTIONS, BRAIN_INDEX), []);
});

test("every brand has its own questions", () => {
  for (const brand of BRANDS) assert.ok(COVERAGE_QUESTIONS.filter((q) => q.brand === brand).length >= 4, brand);
});

test("no question names a private project, and none states a price or a figure as an answer", () => {
  const text = readFileSync(join(root, "supabase/functions/_shared/brain/coverage-questions.ts"), "utf8");
  for (const word of [/trad(e|ing)/i, /payout/i, /houcine\.trades/i, /\bprop\b/i]) assert.ok(!word.test(text), String(word));
  // Expectations name note sections, never an answer: no currency amount anywhere in the list.
  assert.ok(!/(€|\$|EUR|USD)\s?\d|\d\s?(€|EUR|USD)/.test(text));
});

test("the score is deterministic and uses only the search", () => {
  const a = scoreCoverage(BRAIN_INDEX, COVERAGE_QUESTIONS, BRANDS);
  const b = scoreCoverage(BRAIN_INDEX, COVERAGE_QUESTIONS, BRANDS);
  assert.deepEqual(a, b);
  assert.equal(a.fingerprint, BRAIN_INDEX.fingerprint);
  assert.equal(a.questions.length, COVERAGE_QUESTIONS.length);
  for (const s of a.brands) assert.equal(s.answered + s.awaiting + s.gap + s.not_found, s.total);
  const summary = coverageSummary(a);
  assert.deepEqual(Object.keys(summary), [...BRANDS]);
  const source = readFileSync(join(root, "supabase/functions/_shared/brain/coverage.ts"), "utf8");
  assert.ok(!/fetch\(|llm|anthropic|Deno\.env|process\.env/i.test(source), "no network, model or environment in the scorer");
});

test("the questions the notes answer today are still found (only the listed misses are not)", () => {
  const report = scoreCoverage(BRAIN_INDEX, COVERAGE_QUESTIONS, BRANDS);
  const missed = report.questions.filter((q) => q.brand_view === "not_found").map((q) => q.id);
  assert.deepEqual(missed.filter((id) => !KNOWN_MISSES.has(id)), [], `newly not found: ${missed.join(", ")}`);
  for (const id of KNOWN_MISSES) assert.ok(COVERAGE_QUESTIONS.some((q) => q.id === id), `${id} is no longer a question: remove it from KNOWN_MISSES`);
  // La Rosa View questions are what the public concierge is for: it must reach every one a note answers.
  for (const q of report.questions.filter((q) => q.brand === "la-rosa-view" && q.kind !== "gap")) {
    assert.notEqual(q.concierge_view, "not_found", q.id);
  }
});

test("brand separation: a question is answered only by its brand's notes or the shared ones", () => {
  const report = scoreCoverage(BRAIN_INDEX, COVERAGE_QUESTIONS, BRANDS);
  const brandOf = new Map(BRAIN_INDEX.notes.map((n) => [n.id, n.brand]));
  for (const q of report.questions) {
    for (const t of q.top) assert.ok([q.brand, "houcine-world"].includes(brandOf.get(t.note)), `${q.id} searched ${t.note}`);
  }
  // The same La Rosa View questions asked as Houcine.tech questions reach nothing of La Rosa View; only those a
  // shared houcine-world note also answers (the general booking-request rule) can still be found.
  const moved = COVERAGE_QUESTIONS.filter((q) => q.brand === "la-rosa-view" && q.kind !== "gap").map((q) => ({ ...q, brand: "houcine-tech" }));
  for (const q of scoreCoverage(BRAIN_INDEX, moved, BRANDS).questions) {
    assert.ok(q.top.every((t) => brandOf.get(t.note) !== "la-rosa-view"), q.id);
    assert.ok(q.found.every((f) => brandOf.get(f.split("#")[0]) === "houcine-world"), q.id);
    if (q.expect.every((e) => brandOf.get(e.split("#")[0]) === "la-rosa-view")) assert.equal(q.brand_view, "not_found", q.id);
  }
});

test("a note outside the public index (internal, archived, deleted) never counts as found", () => {
  const q = { id: "x-internal", brand: "houcine-world", kind: "answered", question: "Which questions are still open for the owner?", expect: ["internal-open-questions"] };
  assert.ok(!BRAIN_INDEX.notes.some((n) => n.id === "internal-open-questions"), "the internal note is not compiled");
  assert.deepEqual(checkQuestions([q], BRAIN_INDEX), ["x-internal: internal-open-questions is not a public note of the index"]);
  const [scored] = scoreCoverage(BRAIN_INDEX, [q], BRANDS).questions;
  assert.equal(scored.brand_view, "not_found");
  assert.equal(scored.concierge_view, "not_found");
  assert.deepEqual(scored.unknown, ["internal-open-questions"]);
});

test("a known gap stays a gap, and a question nothing matches is not found (never the overview)", () => {
  const gap = COVERAGE_QUESTIONS.find((q) => q.kind === "gap");
  assert.equal(scoreCoverage(BRAIN_INDEX, [gap], BRANDS).questions[0].brand_view, "gap");
  const nonsense = { id: "x-none", brand: "la-rosa-view", kind: "answered", question: "zzqx vvbn", expect: ["lrv-overview"] };
  const [scored] = scoreCoverage(BRAIN_INDEX, [nonsense], BRANDS).questions;
  assert.equal(scored.brand_view, "not_found");
  assert.equal(scored.concierge_view, "not_found", "the concierge's fallback overview does not count as an answer");
});
