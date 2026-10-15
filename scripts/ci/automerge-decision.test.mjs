// Unit tests for the auto-merge decision (Node's built-in test runner: `node --test scripts/ci/`).
// AUTOMERGE_DECISION_PATH lets scripts/ci/automerge-breaks.test.mjs run these same tests against
// deliberately broken copies of the module; every break must make at least one test fail.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = process.env.AUTOMERGE_DECISION_PATH ?? join(here, "automerge-decision.mjs");
const {
  matchesGlob, parsePatternList, findCriticalHits, findWatchHits, decide,
  NO_MERGE_BEFORE, REQUIRED_CHECK_RUNS, REQUIRED_STATUSES, MAX_FILES,
} = await import(pathToFileURL(modulePath).href);

const AFTER_GATE = new Date(Date.parse(NO_MERGE_BEFORE) + 60_000);
const SHA = "a".repeat(40);

/** Facts for a pull request that should merge; each test changes one thing. */
const goodFacts = (overrides = {}) => ({
  errors: [],
  runConclusion: "success",
  runHeadSha: SHA,
  latestHeadSha: SHA,
  pr: { number: 7, state: "open", draft: false, labels: ["auto"], headSha: SHA, baseRef: "main", changedFiles: 1 },
  files: [{ filename: "src/pages/Manages.tsx", status: "modified", patch: "@@ -1 +1 @@\n-old\n+new" }],
  filesComplete: true,
  checkRuns: REQUIRED_CHECK_RUNS.map((name, i) => ({ id: i + 1, name, status: "completed", conclusion: "success" })),
  statuses: REQUIRED_STATUSES.map((context) => ({ context, state: "success" })),
  criticalPatterns: [".github/**", ".env*", "supabase/**", "src/components/owner/**", "index.html"],
  watchList: ["platform_role", "super_admin", "supabase.auth", "service_role"],
  now: AFTER_GATE,
  ...overrides,
});

// ── glob matching ────────────────────────────────────────────────────────────

test("glob: ** crosses directories", () => {
  assert.equal(matchesGlob(".github/workflows/ci.yml", ".github/**"), true);
  assert.equal(matchesGlob("supabase/functions/a/index.ts", "supabase/**"), true);
  assert.equal(matchesGlob("src/supabase/x.ts", "supabase/**"), false);
  assert.equal(matchesGlob("src/a/b/c/secret.ts", "src/**/secret.ts"), true);
  assert.equal(matchesGlob("src/secret.ts", "src/**/secret.ts"), true);
  assert.equal(matchesGlob("lib/a/secret.ts", "src/**/secret.ts"), false);
});

test("glob: * stays inside one directory", () => {
  assert.equal(matchesGlob("src/hooks/useMemberships.ts", "src/hooks/useMemberships*"), true);
  assert.equal(matchesGlob("src/hooks/useMemberships/inner.ts", "src/hooks/useMemberships*"), false);
  assert.equal(matchesGlob("src/a/b.ts", "src/*.ts"), false);
});

test("glob: a pattern without a slash matches the file name at any depth", () => {
  assert.equal(matchesGlob(".env", ".env*"), true);
  assert.equal(matchesGlob(".env.production.local", ".env*"), true);
  assert.equal(matchesGlob("deep/folder/.env.local", ".env*"), true);
  assert.equal(matchesGlob("src/environment.ts", ".env*"), false);
});

test("glob: an exact path matches only itself", () => {
  assert.equal(matchesGlob("index.html", "index.html"), true);
  assert.equal(matchesGlob("public/index.html", "/index.html"), false);
  assert.equal(matchesGlob("src/config/trades.ts", "src/config/trades.ts"), true);
  assert.equal(matchesGlob("src/config/trades.tsx", "src/config/trades.ts"), false);
});

test("glob: ? matches one character and regex characters are literal", () => {
  assert.equal(matchesGlob("a1.txt", "a?.txt"), true);
  assert.equal(matchesGlob("a12.txt", "a?.txt"), false);
  assert.equal(matchesGlob("axhtml", "a.html"), false);
});

test("pattern lists ignore comments and blank lines", () => {
  assert.deepEqual(parsePatternList("# comment\n\n.github/**\n  index.html  \n"), [".github/**", "index.html"]);
});

// ── critical paths and watch-list ────────────────────────────────────────────

test("critical hits include renamed-from paths", () => {
  const hits = findCriticalHits(
    [{ filename: "src/moved.ts", previous_filename: "src/components/owner/card/index.tsx" }],
    ["src/components/owner/**"],
  );
  assert.deepEqual(hits, ["src/components/owner/card/index.tsx"]);
});

test("watch-list hits are found in the diff text", () => {
  assert.deepEqual(findWatchHits([{ filename: "x.ts", patch: "+ if (role === 'super_admin')" }], ["super_admin", "service_role"]), ["super_admin"]);
});

test("a critical path means needs-owner, not merge", () => {
  const d = decide(goodFacts({ files: [{ filename: ".github/workflows/ci.yml", status: "modified", patch: "+x" }] }));
  assert.equal(d.action, "needs-owner");
  assert.deepEqual(d.criticalHits, [".github/workflows/ci.yml"]);
});

test("a watch-list identifier means needs-owner, not merge", () => {
  const d = decide(goodFacts({ files: [{ filename: "src/a.ts", status: "modified", patch: "+await supabase.auth.signOut()" }] }));
  assert.equal(d.action, "needs-owner");
  assert.deepEqual(d.watchHits, ["supabase.auth"]);
});

// ── the happy path and every blocker ─────────────────────────────────────────

test("all conditions hold: merge", () => {
  const d = decide(goodFacts());
  assert.equal(d.action, "merge", d.reasons.join("; "));
});

test("an API error means no merge", () => {
  const d = decide(goodFacts({ errors: ["GET /pulls/7 failed: 502"] }));
  assert.equal(d.action, "skip");
  assert.equal(d.retryable, false);
});

test("missing critical-path list means no merge", () => {
  assert.equal(decide(goodFacts({ criticalPatterns: null })).action, "skip");
  assert.equal(decide(goodFacts({ watchList: null })).action, "skip");
});

test("an empty critical-path list means no merge", () => {
  assert.equal(decide(goodFacts({ criticalPatterns: [] })).action, "skip");
});

test("a missing required check means no merge (and may be retried)", () => {
  const d = decide(goodFacts({ checkRuns: [] }));
  assert.equal(d.action, "skip");
  assert.equal(d.retryable, true);
});

test("a failing required check means no merge (not retried)", () => {
  const runs = goodFacts().checkRuns.map((r) => ({ ...r, conclusion: "failure" }));
  const d = decide(goodFacts({ checkRuns: runs }));
  assert.equal(d.action, "skip");
  assert.equal(d.retryable, false);
});

test("the latest run of a check counts", () => {
  const name = REQUIRED_CHECK_RUNS[0];
  const runs = [
    { id: 1, name, status: "completed", conclusion: "success" },
    { id: 2, name, status: "completed", conclusion: "failure" },
  ];
  assert.equal(decide(goodFacts({ checkRuns: runs })).action, "skip");
});

test("a pending required status means no merge (and may be retried)", () => {
  const d = decide(goodFacts({ statuses: REQUIRED_STATUSES.map((context) => ({ context, state: "pending" })) }));
  assert.equal(d.action, "skip");
  assert.equal(d.retryable, true);
});

test("a missing or failed required status means no merge", () => {
  assert.equal(decide(goodFacts({ statuses: [] })).action, "skip");
  const failed = decide(goodFacts({ statuses: REQUIRED_STATUSES.map((context) => ({ context, state: "failure" })) }));
  assert.equal(failed.action, "skip");
  assert.equal(failed.retryable, false);
});

test("Vercel statuses are ignored", () => {
  const statuses = [...goodFacts().statuses, { context: "Vercel", state: "failure" }];
  assert.equal(decide(goodFacts({ statuses })).action, "merge");
});

test("a failed CI run means no merge", () => {
  assert.equal(decide(goodFacts({ runConclusion: "failure" })).action, "skip");
});

test("a draft pull request is not merged", () => {
  assert.equal(decide(goodFacts({ pr: { ...goodFacts().pr, draft: true } })).action, "skip");
});

test("the hold label stops the merge", () => {
  assert.equal(decide(goodFacts({ pr: { ...goodFacts().pr, labels: ["auto", "hold"] } })).action, "skip");
});

test("an existing needs-owner label stops the merge", () => {
  assert.equal(decide(goodFacts({ pr: { ...goodFacts().pr, labels: ["needs-owner"] } })).action, "skip");
});

test("a closed pull request is not merged", () => {
  assert.equal(decide(goodFacts({ pr: { ...goodFacts().pr, state: "closed" } })).action, "skip");
});

test("a stale head SHA means no merge", () => {
  assert.equal(decide(goodFacts({ latestHeadSha: "b".repeat(40) })).action, "skip");
  assert.equal(decide(goodFacts({ runHeadSha: "c".repeat(40) })).action, "skip");
});

test("a truncated file list means no merge", () => {
  assert.equal(decide(goodFacts({ filesComplete: false })).action, "skip");
});

test("more than MAX_FILES changed files means no merge", () => {
  const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => ({ filename: `src/f${i}.ts`, status: "modified", patch: "+x" }));
  const pr = { ...goodFacts().pr, changedFiles: files.length };
  assert.equal(decide(goodFacts({ files, pr })).action, "skip");
});

test("a file without diff text means no merge", () => {
  assert.equal(decide(goodFacts({ files: [{ filename: "public/a.png", status: "added" }] })).action, "skip");
});

test("the time gate: not before NO_MERGE_BEFORE, and not exactly at it", () => {
  assert.equal(decide(goodFacts({ now: new Date(Date.parse(NO_MERGE_BEFORE) - 1) })).action, "skip");
  assert.equal(decide(goodFacts({ now: new Date(Date.parse(NO_MERGE_BEFORE)) })).action, "skip");
  assert.equal(decide(goodFacts({ now: new Date("invalid") })).action, "skip");
});

test("NO_MERGE_BEFORE is the agreed instant", () => {
  assert.equal(Date.parse(NO_MERGE_BEFORE), Date.parse("2026-10-15T03:00:00Z"));
});
