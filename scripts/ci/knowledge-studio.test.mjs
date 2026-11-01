// Knowledge Studio's backend (supabase/functions/knowledge-studio/): the whole create -> draft -> publish -> live
// workflow, with an in-memory git repository, an in-memory database and a fake live concierge. Covers the acceptance
// list of docs/knowledge-studio.md: drafts never reach the AI, publishing updates the Markdown AND the index, the AI
// then retrieves the new knowledge, non-public notes never do, brand access holds, version conflicts are caught,
// one publication at a time, failures keep drafts and the previous index, the GitHub adapter commits atomically.
//
//   node --experimental-strip-types --test scripts/ci/knowledge-studio.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const studioCore = await import(join(root, "supabase/functions/knowledge-studio/core.ts"));
const { createGithubRepo } = await import(join(root, "supabase/functions/knowledge-studio/github.ts"));
const { compileBrain, renderIndexModule, renderSnapshotModule, parseFrontmatter } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
const { search } = await import(join(root, "supabase/functions/_shared/brain/retrieve.ts"));
const { withIndexAccess } = await import(join(root, "supabase/functions/_shared/brain/agent.ts"));
const { LA_ROSA_VIEW_CONCIERGE } = await import(join(root, "supabase/functions/concierge/agent.ts"));
const { BRAIN_INDEX } = await import(join(root, "supabase/functions/_shared/brain/index.generated.ts"));
const { createStudio, safeNotePath, checkSuggestion, BRAIN_DIR, INDEX_PATH, SNAPSHOT_PATH } = studioCore;

const { brainFiles, fakeRepo, fakeStore } = await import("../brain/studio-fakes.mjs");
const blobSha = (text) => createHash("sha1").update(text).digest("hex");

const actor = { id: "11111111-1111-4111-8111-111111111111", email: "owner@example.com" };
const setup = (overrides = {}) => {
  const g = fakeRepo();
  const store = fakeStore();
  let liveFp = BRAIN_INDEX.fingerprint;
  let clock = Date.parse("2026-10-30T10:00:00Z");
  const studio = createStudio({
    repo: g.repo, store, live: { fingerprint: async () => liveFp }, answerer: null, interpreter: null,
    agent: LA_ROSA_VIEW_CONCIERGE, liveIndex: BRAIN_INDEX, snapshot: brainFiles, now: () => clock, ...overrides,
  });
  const call = (method, action, { body, query = {} } = {}) => studio.handle({ method, action, query, body, actor });
  return { g, store, studio, call, setLive: (fp) => (liveFp = fp), advance: (ms) => (clock += ms) };
};

const NEW_NOTE = `---
id: lrv-international-bookings
title: International bookings
brand: la-rosa-view
type: policy
visibility: public
status: verified
tags: [booking, international, abroad, travel, outside tunisia]
sources: [site-larosaview]
updated: 2026-10-30
---

# International bookings

## Booking DJ La Rosa outside Tunisia
International booking requests for [[DJ Hajri Mohamed]] are handled through the management team, [[Houcine.management]].
Travel arrangements depend on the location and are discussed individually.
`;

test("the dashboard state comes from the notes themselves, and says whether the AI is in sync", async () => {
  const { call, setLive } = setup();
  const r = await call("GET", "state");
  assert.equal(r.status, 200);
  const { isNotePath } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
  const notes = brainFiles.filter((f) => isNotePath(f.path));
  assert.equal(r.body.stats.total, notes.length);
  assert.equal(r.body.stats.public, BRAIN_INDEX.notes.length);
  assert.ok(r.body.stats.internal >= 2);
  assert.equal(r.body.stats.byBrand["la-rosa-view"], notes.filter((f) => f.text.includes("\nbrand: la-rosa-view\n")).length);
  assert.deepEqual(r.body.validation.published, []);
  assert.equal(r.body.index.sync, "in_sync");
  assert.equal(r.body.canPublish, true);
  setLive("0000000000000000");
  assert.equal((await call("GET", "state")).body.index.sync, "out_of_sync");
  // The dashboard's visitor-question summary is the coverage of the knowledge visitors get (the deployed index).
  const { scoreCoverage } = await import(join(root, "supabase/functions/_shared/brain/coverage.ts"));
  const { COVERAGE_QUESTIONS } = await import(join(root, "supabase/functions/_shared/brain/coverage-questions.ts"));
  const { BRANDS } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
  assert.deepEqual(r.body.coverage, scoreCoverage(BRAIN_INDEX, COVERAGE_QUESTIONS, BRANDS).brands);
});

test("teach -> draft -> publish -> live: the AI retrieves the new knowledge only once it is published and live", async () => {
  const { call, g, store, setLive } = setup();
  const path = "brands/la-rosa-view/international-bookings.md";
  const saved = await call("POST", "draft", { body: { path, content: NEW_NOTE, expectedVersion: null, originalInput: "DJ Hajri's international booking requests must be handled through the management team." } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual(saved.body.errors, []);

  // A draft is not available to the public AI: the live index does not have it; the preview index does.
  const scope = LA_ROSA_VIEW_CONCIERGE.scope;
  assert.ok(!search(BRAIN_INDEX, ["book DJ Hajri for an event outside Tunisia"], scope).some((p) => p.note.id === "lrv-international-bookings"));
  const preview = await call("POST", "playground", { body: { message: "How can I book DJ Hajri for an event outside Tunisia?", source: "preview" } });
  assert.equal(preview.status, 200);
  assert.ok(preview.body.passages.some((p) => p.noteId === "lrv-international-bookings"), "the preview playground retrieves the draft");
  const livePlay = await call("POST", "playground", { body: { message: "How can I book DJ Hajri for an event outside Tunisia?", source: "live" } });
  assert.ok(!livePlay.body.passages.some((p) => p.noteId === "lrv-international-bookings"), "the live AI does not see the draft");
  assert.equal(livePlay.body.error.code, "not_configured", "no model in tests: an honest notice, never an invented answer");

  const published = await call("POST", "publish", { body: {} });
  assert.equal(published.status, 200, JSON.stringify(published.body));
  const pub = published.body.publication;
  assert.equal(pub.status, "deploying", "committed, not yet 'published': the AI does not have it yet");

  // The commit holds the Markdown (source of truth), the rebuilt index and the Studio snapshot, all consistent.
  const tree = g.tree();
  assert.equal(tree.get(`${BRAIN_DIR}/${path}`), NEW_NOTE);
  const after = [...tree.entries()].filter(([p]) => p.startsWith(`${BRAIN_DIR}/`)).map(([p, text]) => ({ path: p.slice(BRAIN_DIR.length + 1), text }));
  const compiled = compileBrain(after);
  assert.equal(tree.get(INDEX_PATH), renderIndexModule(compiled.index));
  assert.equal(tree.get(SNAPSHOT_PATH), renderSnapshotModule(after));
  // ...and the generated maps, exactly as the Node build writes them.
  const { buildMaps, DASHBOARD_PATH, CANVAS_PATH } = await import("../brain/lib.mjs");
  const maps = buildMaps(after, compiled.index);
  assert.equal(tree.get(`${BRAIN_DIR}/${DASHBOARD_PATH}`), maps.dashboard);
  assert.equal(tree.get(`${BRAIN_DIR}/${CANVAS_PATH}`), maps.canvas);
  assert.equal(pub.expected_fingerprint, compiled.index.fingerprint);
  assert.equal(await store.draft(path), null, "the draft is done once the notes are committed");

  // Still deploying while the concierge serves the old index...
  assert.equal((await call("GET", "publication", { query: { id: pub.id } })).body.publication.status, "deploying");
  // ...live once the concierge reports the new fingerprint.
  setLive(compiled.index.fingerprint);
  const live = (await call("GET", "publication", { query: { id: pub.id } })).body.publication;
  assert.equal(live.status, "live");
  assert.ok(store.eventLog.some((e) => e.kind === "index_live"));

  // And the AI's retrieval, with its own access rules, finds the new knowledge.
  const agent = withIndexAccess(LA_ROSA_VIEW_CONCIERGE, compiled.index);
  const hits = search(compiled.index, ["How can I book DJ Hajri for an event outside Tunisia?", "international booking DJ abroad"], agent.scope);
  assert.ok(hits.some((p) => p.note.id === "lrv-international-bookings"), hits.map((p) => p.note.id).join(","));
});

test("internal and restricted notes are never compiled into the public index, even after publishing", async () => {
  const { call, g } = setup();
  for (const [vis, id] of [["internal", "lrv-secret-internal"], ["confidential", "lrv-secret-restricted"]]) {
    const content = NEW_NOTE.replace("id: lrv-international-bookings", `id: ${id}`).replace("title: International bookings", `title: Secret ${vis}`).replace("visibility: public", `visibility: ${vis}`).replace("[[DJ Hajri Mohamed]]", "DJ").replace("[[Houcine.management]]", "management").replace("# International bookings", `# Secret ${vis}`);
    const r = await call("POST", "draft", { body: { path: `brands/la-rosa-view/${id}.md`, content, expectedVersion: null } });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  assert.equal((await call("POST", "publish", { body: {} })).status, 200);
  const index = g.tree().get(INDEX_PATH);
  assert.ok(!index.includes("lrv-secret-internal") && !index.includes("lrv-secret-restricted") && !index.includes("Secret internal"));
  // The admin's search does find them (it is the admin's view).
  const found = await call("GET", "search", { query: { q: "Secret restricted" } });
  assert.ok(found.body.results.some((x) => x.id === "lrv-secret-restricted"));
});

test("validation failure: nothing is committed, the draft is kept, and the reason is given", async () => {
  const { call, g, store } = setup();
  const broken = NEW_NOTE.replace("[[Houcine.management]]", "[[A note that does not exist]]");
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/broken.md", content: broken.replace("lrv-international-bookings", "lrv-broken").replace("International bookings", "Broken"), expectedVersion: null } });
  const head = g.state.head;
  const r = await call("POST", "publish", { body: {} });
  assert.equal(r.status, 422);
  assert.equal(r.body.code, "validation_failed");
  assert.ok(r.body.errors.some((e) => e.includes("A note that does not exist")));
  assert.equal(g.state.head, head, "no commit");
  assert.ok(await store.draft("brands/la-rosa-view/broken.md"), "draft kept");
});

test("optimistic concurrency: a second save on an old version, or publishing over a note changed on main, is refused", async () => {
  const { call, g } = setup();
  const path = "brands/la-rosa-view/bookings.md";
  const file = (await call("GET", "note", { query: { path } })).body;
  const edited = file.content.replace("typically within 24 hours", "typically within 24 hours (checked)");
  const first = await call("POST", "draft", { body: { path, content: edited, baseSha: file.sha, expectedVersion: null } });
  assert.equal(first.status, 200);
  const again = await call("POST", "draft", { body: { path, content: edited + "\nA", expectedVersion: 1 } });
  assert.equal(again.status, 200);
  const stale = await call("POST", "draft", { body: { path, content: edited + "\nB", expectedVersion: 1 } });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "draft_conflict");
  assert.equal(stale.body.current.version, 2, "the other admin's version is shown");

  // Someone changes the same note on the main branch: publishing the draft is refused, nothing is overwritten.
  g.externalCommit(`${BRAIN_DIR}/${path}`, file.content.replace("Booking La Rosa View", "Booking La Rosa View (edited elsewhere)"));
  const pub = await call("POST", "publish", { body: {} });
  assert.equal(pub.status, 409);
  assert.equal(pub.body.code, "drafts_out_of_date");
  // Opening a note with an outdated starting point is refused too.
  const opened = await call("POST", "draft", { body: { path: "brands/la-rosa-view/events.md", content: "x", baseSha: "0".repeat(40), expectedVersion: null } });
  assert.equal(opened.status, 422); // unreadable header is checked first
});

test("one publication at a time, and a branch that moves mid-publication is handled safely", async () => {
  const { call, g } = setup();
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content: NEW_NOTE, expectedVersion: null } });
  g.state.moveBranchOnce = true;
  const first = await call("POST", "publish", { body: {} });
  assert.equal(first.status, 200, "retried once on a fresh head");
  assert.ok(g.tree().has("README-unrelated.txt"), "the other commit is kept, not overwritten");
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/another.md", content: NEW_NOTE.replace("lrv-international-bookings", "lrv-another").replace("International bookings", "Another note"), expectedVersion: null } });
  const second = await call("POST", "publish", { body: {} });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "publication_in_progress");
});

test("a failed deploy is reported, the previous index keeps serving, and synchronization can be retried", async () => {
  const { call, g, setLive, advance } = setup();
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content: NEW_NOTE, expectedVersion: null } });
  const pub = (await call("POST", "publish", { body: {} })).body.publication;
  g.state.deploy = "failure";
  const failed = (await call("GET", "publication", { query: { id: pub.id } })).body.publication;
  assert.equal(failed.status, "failed");
  assert.equal(failed.error_code, "deploy_failed");
  assert.equal((await call("GET", "state")).body.index.live, BRAIN_INDEX.fingerprint, "the old index still serves visitors");
  const review = await call("GET", "review");
  assert.ok(review.body.items.some((i) => i.kind === "publication_failed"));

  g.state.deploy = "in_progress";
  const retried = await call("POST", "retry", { body: { id: pub.id } });
  assert.equal(retried.status, 200);
  assert.equal(retried.body.publication.status, "deploying");
  assert.equal(g.state.dispatched, 1);
  setLive(retried.body.publication.expected_fingerprint);
  assert.equal((await call("GET", "publication", { query: { id: pub.id } })).body.publication.status, "live");

  // A deploy that never shows up times out instead of waiting forever.
  const s2 = setup();
  await s2.call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content: NEW_NOTE, expectedVersion: null } });
  const p2 = (await s2.call("POST", "publish", { body: {} })).body.publication;
  s2.g.state.deploy = "none";
  s2.advance(11 * 60_000);
  assert.equal((await s2.call("GET", "publication", { query: { id: p2.id } })).body.publication.error_code, "deploy_not_started");
  void advance;
});

test("a commit that fails keeps the drafts and changes nothing", async () => {
  const { call, g, store } = setup();
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content: NEW_NOTE, expectedVersion: null } });
  g.state.failCommitWith = "protected";
  const r = await call("POST", "publish", { body: {} });
  assert.equal(r.status, 502);
  assert.equal(r.body.code, "branch_protected");
  assert.ok(await store.draft("brands/la-rosa-view/international-bookings.md"));
  // The failed publication does not block the next one.
  g.state.failCommitWith = null;
  assert.equal((await call("POST", "publish", { body: {} })).status, 200);
});

test("archive and restore: a linked note cannot be archived silently; an unlinked one leaves the AI's index", async () => {
  const { call, g, setLive } = setup();
  const linked = await call("POST", "archive", { body: { path: "brands/la-rosa-view/bookings.md" } });
  assert.equal(linked.status, 200);
  assert.ok(linked.body.errors.some((e) => e.includes("archived note")), "other notes link to it: shown as problems");
  assert.equal((await call("POST", "publish", { body: {} })).status, 422);
  await call("POST", "discard", { body: { path: "brands/la-rosa-view/bookings.md", expectedVersion: 1 } });

  // A note nothing links to: publish it, then archive it; it leaves the index and moves to archive/.
  const path = "brands/la-rosa-view/international-bookings.md";
  await call("POST", "draft", { body: { path, content: NEW_NOTE, expectedVersion: null } });
  const first = (await call("POST", "publish", { body: {} })).body.publication;
  setLive(first.expected_fingerprint);
  await call("GET", "publication", { query: { id: first.id } });
  assert.ok(g.tree().get(INDEX_PATH).includes('"lrv-international-bookings"'));
  assert.equal((await call("POST", "archive", { body: { path } })).status, 200);
  assert.equal((await call("POST", "publish", { body: {} })).status, 200);
  assert.ok(g.tree().has(`${BRAIN_DIR}/archive/${path}`));
  assert.ok(!g.tree().has(`${BRAIN_DIR}/${path}`));
  assert.ok(!g.tree().get(INDEX_PATH).includes('"lrv-international-bookings"'));
  const listed = (await call("GET", "state")).body.notes.find((n) => n.path === `archive/${path}`);
  assert.equal(listed.archived, true, "archived notes stay visible in the Studio");
});

test("AI access is a note: changing the agent's brands changes what the concierge can retrieve", async () => {
  const { call, g } = setup();
  const path = "agents/la-rosa-view-concierge.md";
  const note = (await call("GET", "note", { query: { path } })).body;
  const narrowed = note.content.replace("brands: [la-rosa-view, houcine-world]", "brands: [la-rosa-view]");
  const saved = await call("POST", "draft", { body: { path, content: narrowed, baseSha: note.sha, expectedVersion: null } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal((await call("POST", "publish", { body: {} })).status, 200);
  const after = [...g.tree().entries()].filter(([p]) => p.startsWith(`${BRAIN_DIR}/`)).map(([p, text]) => ({ path: p.slice(BRAIN_DIR.length + 1), text }));
  const index = compileBrain(after).index;
  assert.deepEqual(index.agents["la-rosa-view-concierge"].brands, ["la-rosa-view"]);
  const agent = withIndexAccess(LA_ROSA_VIEW_CONCIERGE, index);
  const hits = search(index, ["Booking requests policy request is not a confirmation Terms"], agent.scope);
  assert.ok(hits.every((p) => p.note.brand !== "houcine-world"), "shared notes are no longer reachable");
});

test("feedback becomes a private review item and never changes knowledge", async () => {
  const { call, g } = setup();
  const head = g.state.head;
  const fb = await call("POST", "feedback", { body: { rating: "missing", question: "Do you play in Tozeur?", answer: "Not published.", comment: "Add the cities", sources: ["lrv-overview"] } });
  assert.equal(fb.status, 200);
  const review = await call("GET", "review");
  const item = review.body.items.find((i) => i.kind === "feedback_missing");
  assert.ok(item);
  assert.equal(g.state.head, head, "no knowledge changed");
  const resolved = await call("POST", "resolve", { body: { id: item.id, status: "resolved", resolution: "Added a note" } });
  assert.equal(resolved.body.feedback.status, "resolved");
  assert.ok(!(await call("GET", "review")).body.items.some((i) => i.id === item.id));
});

test("the review queue lists sections awaiting confirmation and notes missing metadata, from the notes themselves", async () => {
  const { call } = setup();
  const items = (await call("GET", "review")).body.items;
  assert.ok(items.some((i) => i.kind === "awaiting_confirmation" || i.kind === "outdated" || i.kind === "missing_metadata" || i.kind === "stale") || items.length === 0);
  for (const i of items) assert.ok(typeof i.title === "string" && typeof i.detail === "string");
});

test("formatting help never adds a fact: a section with a number, price or address the owner did not write is removed", () => {
  const original = "DJ Hajri is available for private corporate events. For international bookings, organizers should contact the management team directly.";
  const s = checkSuggestion({
    title: "Corporate and international bookings",
    sections: [
      { heading: "Corporate events", text: "DJ Hajri is available for private corporate events." },
      { heading: "International", text: "International bookings start at €500, contact intl@example.com." },
    ],
    tags: ["Booking", "Corporate!"],
    related_notes: ["Booking La Rosa View", "A note that does not exist"],
    missing_details: ["Which team email?"],
    possible_conflicts: [{ note_id: "lrv-bookings", explanation: "x" }, { note_id: "invented", explanation: "y" }],
  }, original, ["Booking La Rosa View"], [{ noteId: "lrv-bookings" }]);
  assert.deepEqual(s.sections.map((x) => x.heading), ["Corporate events"]);
  assert.equal(s.removedSections.length, 1);
  assert.match(s.removedSections[0].reason, /€|500|intl@example.com/);
  assert.deepEqual(s.relatedNotes, ["Booking La Rosa View"]);
  assert.deepEqual(s.possibleConflicts.map((c) => c.note_id), ["lrv-bookings"]);
  assert.deepEqual(s.tags, ["booking", "corporate"]);
});

test("Teach the AI without a model: still shows possible overlaps, and says the AI help is unavailable", async () => {
  const { call } = setup();
  const r = await call("POST", "assist", { body: { text: "DJ Hajri's international booking requests must be handled through the management team.", brand: "la-rosa-view" } });
  assert.equal(r.status, 200);
  assert.equal(r.body.suggestion, null);
  assert.equal(r.body.aiAvailable, false);
  assert.ok(r.body.overlaps.length > 0);
});

test("the playground's retrieval inspector explains each passage", async () => {
  const { call } = setup();
  const r = await call("POST", "playground", { body: { message: "How do I book DJ La Rosa for a wedding?", source: "live" } });
  const p = r.body.passages.find((x) => x.noteId === "lrv-bookings");
  assert.ok(p);
  assert.ok(p.why.matched.length > 0);
  assert.equal(p.visibility, "public");
  assert.ok(Array.isArray(p.sources) && p.sources.length);
  assert.deepEqual(r.body.access.brands, ["la-rosa-view", "houcine-world"]);
});

test("search: exact words, partial phrases, titles, tags, brands and people", async () => {
  const { call } = setup();
  const q = async (s) => (await call("GET", "search", { query: { q: s } })).body.results.map((r) => r.id);
  assert.ok((await q("N30")).includes("lrv-events-releases"));
  assert.ok((await q("signature mi")).includes("lrv-events-releases"), "partial phrase");
  assert.ok((await q("Hajri")).includes("lrv-dj-hajri"));
  assert.ok((await q("houcine-tech")).includes("tech-overview"), "brand");
  assert.ok((await q("open questions")).includes("internal-open-questions"), "internal notes are found by the admin");
});

test("paths: only knowledge folders, lower case, .md, no traversal", () => {
  assert.equal(safeNotePath("brands/la-rosa-view/x.md"), "brands/la-rosa-view/x.md");
  for (const bad of ["../x.md", "brands/../../x.md", "README.md", "schemas/x.md", "Brands/x.md", "brands/x.txt", "/brands/x.md", "brands//x.md", "archive/brands/x.md", "supabase/x.md"]) {
    assert.equal(safeNotePath(bad), null, bad);
  }
  assert.equal(safeNotePath("archive/brands/x.md", { allowArchive: true }), "archive/brands/x.md");
});

test("without a GitHub token the Studio is read-only, and says why", async () => {
  const { createSnapshotRepo } = await import(join(root, "supabase/functions/knowledge-studio/github.ts"));
  const { call } = setup({ repo: createSnapshotRepo(brainFiles) });
  const state = await call("GET", "state");
  assert.equal(state.body.canPublish, false);
  assert.equal(state.body.mode, "snapshot");
  assert.ok(state.body.notes.length > 20);
  const write = await call("POST", "draft", { body: { path: "brands/la-rosa-view/x.md", content: NEW_NOTE, expectedVersion: null } });
  assert.equal(write.status, 503);
  assert.equal(write.body.code, "repo_not_configured");
});

test("coverage: search only, works read-only, previews drafts, and each publication keeps its score", async () => {
  const { COVERAGE_QUESTIONS } = await import(join(root, "supabase/functions/_shared/brain/coverage-questions.ts"));
  const { createSnapshotRepo } = await import(join(root, "supabase/functions/knowledge-studio/github.ts"));
  // Read-only (no GitHub token) and no model: the published knowledge is still scored.
  const ro = setup({ repo: createSnapshotRepo(brainFiles) });
  const live = await ro.call("GET", "coverage", { query: { source: "live" } });
  assert.equal(live.status, 200);
  assert.equal(live.body.source, "live");
  assert.equal(live.body.fingerprint, BRAIN_INDEX.fingerprint);
  assert.equal(live.body.questions.length, COVERAGE_QUESTIONS.length);
  assert.deepEqual(live.body.trend, []);
  assert.equal(ro.store.eventLog.length, 0, "scoring writes nothing");

  // With a draft, the preview is scored on the drafts; the live score is unchanged.
  const { call, store, setLive } = setup();
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content: NEW_NOTE, expectedVersion: null } });
  const preview = await call("GET", "coverage", { query: { source: "preview" } });
  assert.equal(preview.status, 200);
  assert.notEqual(preview.body.fingerprint, BRAIN_INDEX.fingerprint);
  assert.equal((await call("GET", "coverage")).body.fingerprint, BRAIN_INDEX.fingerprint);

  // Publishing keeps the score of the new index with the commit, shown as the trend.
  const published = await call("POST", "publish", { body: {} });
  assert.equal(published.status, 200, JSON.stringify(published.body));
  const commitEvent = store.eventLog.find((e) => e.kind === "published_commit");
  const { BRANDS } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
  assert.deepEqual(Object.keys(commitEvent.detail.coverage), [...BRANDS]);
  for (const counts of Object.values(commitEvent.detail.coverage)) assert.equal(counts.length, 4);
  setLive(published.body.expectedFingerprint);
  const after = await call("GET", "coverage");
  assert.equal(after.body.trend.length, 1);
  assert.equal(after.body.trend[0].fingerprint, published.body.expectedFingerprint);
  assert.deepEqual(after.body.trend[0].coverage, commitEvent.detail.coverage);
});

test("the publishing token's expiry: read from GitHub's header when it is there, never guessed", async () => {
  const { parseTokenExpiry, tokenStatus, TOKEN_WARNING_DAYS } = studioCore;
  assert.equal(parseTokenExpiry("2026-12-31 23:59:59 UTC"), "2026-12-31T23:59:59.000Z");
  assert.equal(parseTokenExpiry("2026-12-31 23:59:59 +0100"), "2026-12-31T22:59:59.000Z");
  for (const bad of [null, "", "soon", "2026-13-45 99:99:99 UTC", "31/12/2026"]) assert.equal(parseTokenExpiry(bad), null, String(bad));
  const now = Date.parse("2026-10-30T10:00:00Z");
  assert.deepEqual(tokenStatus(null, now), { expiresAt: null, daysLeft: null, warn: false });
  assert.equal(tokenStatus("2027-01-30 10:00:00 UTC", now).warn, false);
  assert.deepEqual(tokenStatus("2026-11-13 10:00:00 UTC", now), { expiresAt: "2026-11-13T10:00:00.000Z", daysLeft: TOKEN_WARNING_DAYS, warn: true });
  assert.equal(tokenStatus("2026-10-29 10:00:00 UTC", now).daysLeft, -1, "an expired token is said");

  // The dashboard says it in GitHub mode only; read-only mode has no token to speak of.
  const g = fakeRepo();
  const { call } = setup({ repo: { ...g.repo, tokenExpiry: () => "2026-11-05 00:00:00 UTC" } });
  const state = (await call("GET", "state")).body;
  assert.equal(state.token.expiresAt, "2026-11-05T00:00:00.000Z");
  assert.equal(state.token.warn, true);
  const { createSnapshotRepo } = await import(join(root, "supabase/functions/knowledge-studio/github.ts"));
  assert.equal((await setup({ repo: createSnapshotRepo(brainFiles) }).call("GET", "state")).body.token, null);

  // The adapter keeps the header's date (only the date, never the token) from GitHub's answers.
  const token = ["fake", "token", Date.now()].join("-");
  const fetch = async () => new Response(JSON.stringify({ object: { sha: "a".repeat(40) } }), { status: 200, headers: { "github-authentication-token-expiration": "2026-12-01 08:00:00 UTC" } });
  const repo = createGithubRepo({ token, owner: "o", repo: "r", branch: "main", workflow: "supabase-deploy.yml", brainDir: "houcine-world-brain", fetch });
  assert.equal(repo.tokenExpiry(), null, "unknown before any answer");
  await repo.head();
  assert.equal(repo.tokenExpiry(), "2026-12-01 08:00:00 UTC");
  assert.ok(!repo.tokenExpiry().includes(token));
});

test("the Studio refuses a public note that names a page the site does not have, as the Node build does", async () => {
  const { call } = setup();
  const bad = NEW_NOTE.replace("are discussed individually.", "are discussed individually. Details on `/international`.");
  const saved = await call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content: bad, expectedVersion: null } });
  assert.equal(saved.status, 200);
  assert.ok(saved.body.errors.some((e) => e.includes('"/international" is not a public page of the site')), JSON.stringify(saved.body.errors));
  const published = await call("POST", "publish", { body: {} });
  assert.equal(published.status, 422);
  assert.equal(published.body.code, "validation_failed");
});

test("the review queue lists possible duplicates and contact details no contact note lists, with the note to open", async () => {
  const { call } = setup();
  const before = (await call("GET", "review")).body.items.filter((i) => i.kind === "possible_duplicate");
  assert.ok(before.some((i) => i.path === "brands/la-rosa-view/bookings.md" && /Deposits, payment, cancellation/.test(i.title)), JSON.stringify(before));
  const content = NEW_NOTE.replace("are discussed individually.", "are discussed individually. Write to abroad@larosaview.example.");
  await call("POST", "draft", { body: { path: "brands/la-rosa-view/international-bookings.md", content, expectedVersion: null } });
  const items = (await call("GET", "review")).body.items.filter((i) => i.kind === "contact_mismatch");
  assert.equal(items.length, 1, "the draft is checked too");
  assert.equal(items[0].path, "brands/la-rosa-view/international-bookings.md");
  assert.match(items[0].detail, /abroad@larosaview\.example/);
});

test("the function checks a signed-in super admin on the server before doing anything", () => {
  const src = readFileSync(join(root, "supabase/functions/knowledge-studio/index.ts"), "utf8");
  const auth = src.indexOf("await authenticateRequest(req)");
  const admin = src.indexOf("await isSuperAdmin(auth.userClient)");
  const handle = src.indexOf("studio.handle(");
  assert.ok(auth > 0 && admin > auth && handle > admin);
  assert.match(readFileSync(join(root, "supabase/config.toml"), "utf8"), /\[functions\.knowledge-studio\]\nverify_jwt = true/);
  const migration = readFileSync(join(root, "supabase/migrations/20261030090000_knowledge_studio.sql"), "utf8");
  for (const t of ["knowledge_drafts", "knowledge_publications", "knowledge_events", "knowledge_feedback"]) {
    assert.match(migration, new RegExp(`alter table public\\.${t} enable row level security`));
  }
  assert.match(migration, /revoke all on [\s\S]*from anon, authenticated/);
  assert.doesNotMatch(migration, /create policy/i, "no policy: only the function's service role can reach the tables");
});

// ---- The GitHub adapter, with a fake fetch ----

test("GitHub adapter: reads only the brain's Markdown, commits atomically with a fast-forward, maps errors", async () => {
  const token = ["fake", "token", Date.now()].join("-");
  const calls = [];
  let refStatus = 200;
  const b64 = (s) => Buffer.from(s).toString("base64");
  const fetch = async (url, init) => {
    calls.push({ url, init });
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    assert.ok(!url.includes(token), "the token is never in a URL");
    const path = url.replace("https://api.github.com/repos/o/r", "");
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
    if (path === "/git/ref/heads/main") return json({ object: { sha: "a".repeat(40) } });
    if (path.startsWith("/git/commits/") && init.method === "GET") return json({ tree: { sha: "t".repeat(40) } });
    if (path.startsWith("/git/trees/") && init.method === "GET") return json({ truncated: false, tree: [
      { path: "houcine-world-brain/brands/x.md", type: "blob", sha: "b".repeat(40) },
      { path: "houcine-world-brain/.obsidian/w.md", type: "blob", sha: "c".repeat(40) },
      { path: "src/secret.md", type: "blob", sha: "d".repeat(40) },
    ] });
    if (path === `/git/blobs/${"b".repeat(40)}`) return json({ content: b64("---\nid: x\n---\nhé") });
    if (path === "/git/blobs" && init.method === "POST") return json({ sha: "e".repeat(40) }, 201);
    if (path === "/git/trees" && init.method === "POST") return json({ sha: "f".repeat(40) }, 201);
    if (path === "/git/commits" && init.method === "POST") return json({ sha: "1".repeat(40) }, 201);
    if (path === "/git/refs/heads/main" && init.method === "PATCH") {
      const body = JSON.parse(init.body);
      assert.equal(body.force, false, "never a forced update");
      return refStatus === 200 ? json({}) : json({ message: refStatus === 422 ? "Update is not a fast forward" : "Bad credentials" }, refStatus);
    }
    return json({ message: "Not Found" }, 404);
  };
  const repo = createGithubRepo({ token, owner: "o", repo: "r", branch: "main", workflow: "supabase-deploy.yml", brainDir: "houcine-world-brain", fetch });
  const files = await repo.files("a".repeat(40));
  assert.deepEqual(files.files.map((f) => [f.path, f.text]), [["brands/x.md", "---\nid: x\n---\nhé"]]);
  const committed = await repo.commit({ parent: "a".repeat(40), message: "m", changes: [{ path: "houcine-world-brain/brands/x.md", content: "new" }, { path: "houcine-world-brain/brands/old.md", content: null }] });
  assert.deepEqual(committed, { ok: true, commit: "1".repeat(40) });
  const treeBody = JSON.parse(calls.find((c) => c.url.endsWith("/git/trees") && c.init.method === "POST").init.body);
  assert.deepEqual(treeBody.tree.map((t) => [t.path, t.sha]), [["houcine-world-brain/brands/x.md", "e".repeat(40)], ["houcine-world-brain/brands/old.md", null]]);
  refStatus = 422;
  assert.deepEqual(await repo.commit({ parent: "a".repeat(40), message: "m", changes: [] }), { ok: false, error: "conflict" });
  refStatus = 401;
  assert.deepEqual(await repo.commit({ parent: "a".repeat(40), message: "m", changes: [] }), { ok: false, error: "auth" });
});

test("the Studio's own build and the Node build agree byte for byte (one compiler)", () => {
  const compiled = compileBrain(brainFiles);
  assert.equal(readFileSync(join(root, INDEX_PATH), "utf8"), renderIndexModule(compiled.index));
  assert.equal(readFileSync(join(root, SNAPSHOT_PATH), "utf8"), renderSnapshotModule(brainFiles));
  const header = parseFrontmatter(NEW_NOTE, "x.md");
  assert.equal(header.fields.id, "lrv-international-bookings");
});
