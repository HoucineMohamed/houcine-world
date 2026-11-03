// Knowledge OS (docs/knowledge-os.md): private knowledge never goes to the public repository; one retrieval service
// serves every AI consumer, with private documents fetched under the person's own identity (the database decides);
// citations never show paths; the public concierge stays public-only; the compiled index holds public notes only.
//
//   node --experimental-strip-types --test scripts/ci/knowledge-os.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const studio = await import(join(root, "supabase/functions/knowledge-studio/core.ts"));
const kos = await import(join(root, "supabase/functions/_shared/knowledge/retrieve.ts"));
const { BRAIN_INDEX } = await import(join(root, "supabase/functions/_shared/brain/index.generated.ts"));
const read = (p) => readFileSync(join(root, p), "utf8");

const note = (vis, type = "topic") => `---\nid: x\ntitle: X\nbrand: la-rosa-view\ntype: ${type}\nvisibility: ${vis}\nstatus: verified\nupdated: 2026-11-01\n---\n\n# X\n`;

test("publication guard: only public notes (and agent access notes) can reach the public repository", () => {
  const drafts = [
    { path: "brands/la-rosa-view/a.md", operation: "upsert", content: note("public") },
    { path: "brands/la-rosa-view/b.md", operation: "upsert", content: note("internal") },
    { path: "brands/la-rosa-view/c.md", operation: "upsert", content: note("confidential") },
    { path: "agents/d.md", operation: "upsert", content: note("internal", "agent") },
    { path: "brands/la-rosa-view/e.md", operation: "upsert", content: "no header at all" },
    { path: "brands/la-rosa-view/f.md", operation: "archive", content: null },
  ];
  assert.deepEqual(studio.privateDrafts(drafts).sort(), ["brands/la-rosa-view/b.md", "brands/la-rosa-view/c.md", "brands/la-rosa-view/e.md"]);
});

test("the compiled AI index contains public notes only", () => {
  const index = read("supabase/functions/_shared/brain/index.generated.ts");
  for (const file of ["internal/open-questions.md", "maps/roadmap.md"]) {
    const id = /\nid: ([^\n]+)/.exec(read(`houcine-world-brain/${file}`))[1];
    assert.ok(!index.includes(`"${id}"`), `${id} must not be compiled`);
  }
});

test("private sources: called with the person's client, refusals give nothing, citations hide paths", async () => {
  const calls = [];
  const db = { rpc: async (fn, args) => { calls.push({ fn, args }); return { data: [{ document_id: "d1", title: "Revision policy", version: 3, brand: "La Rosa View", visibility: "client", section: "Two rounds of revisions.", score: 0.5, updated_at: "2026-11-01T00:00:00Z" }], error: null }; } };
  const s = await kos.privateSources(db, "how many revisions?", "client_ai", null, 3);
  assert.equal(calls[0].fn, "kos_retrieve");
  assert.deepEqual(calls[0].args, { p_query: "how many revisions?", p_consumer: "client_ai", p_brand_ids: null, p_limit: 3 });
  assert.equal(s[0].version, "v3");
  assert.equal(kos.citation(s[0]).source, "Knowledge Library");
  assert.ok(!JSON.stringify(kos.citation(s[0])).includes("d1"), "no internal id in a citation");
  const refused = { rpc: async () => ({ data: null, error: { message: "Not allowed." } }) };
  assert.deepEqual(await kos.privateSources(refused, "q", "client_ai", null), []);
  assert.deepEqual(await kos.privateSources(null, "q", "client_ai", null), []);
});

test("retrieveKnowledge: private first, then public of the given brands only; outdated passages excluded", async () => {
  const db = { rpc: async () => ({ data: [{ title: "Internal booking procedure", version: 1, brand: "La Rosa View", visibility: "internal", section: "Check the date.", score: 1 }], error: null }) };
  const all = await kos.retrieveKnowledge({ index: BRAIN_INDEX, question: "La Rosa View booking", publicBrands: ["houcine-world", "la-rosa-view"], consumer: "internal_ai", db, limit: 6 });
  assert.equal(all[0].visibility, "internal");
  assert.ok(all.slice(1).every((x) => x.visibility === "public" && ["houcine-world", "la-rosa-view"].includes(x.brand) && x.status !== "outdated"));
  const pub = kos.publicSources(BRAIN_INDEX, "La Rosa View booking", ["houcine-tech"]);
  assert.ok(pub.every((x) => x.brand === "houcine-tech"));
});

test("consumers: the Client OS assistants and Autopilot use the shared service; the concierge stays public-only", () => {
  assert.match(read("supabase/functions/client-os-ai/handler.ts"), /retrieveKnowledge\(/);
  assert.match(read("supabase/functions/autopilot/index.ts"), /privateSources\(client/);
  for (const f of ["supabase/functions/concierge/index.ts", "supabase/functions/concierge/pipeline.ts", "supabase/functions/concierge/core.ts"]) {
    assert.doesNotMatch(read(f), /kos_retrieve|_shared\/knowledge/, `${f} must never read private knowledge`);
  }
  // The shared service never uses the service key: private knowledge is read with the caller's own client.
  assert.doesNotMatch(read("supabase/functions/_shared/knowledge/retrieve.ts"), /serviceClient|SERVICE_ROLE/);
});

test("the migration: deny by default, the identity is computed in the database, never passed by a caller", () => {
  const sql = read("supabase/migrations/20261104100000_knowledge_os.sql");
  assert.match(sql, /create or replace function public\.kos_retrieve\(p_query text, p_consumer text, p_brand_ids uuid\[\] default null, p_limit int default 5\)/);
  assert.match(sql, /i jsonb := kos_my_identity\(\);/);
  assert.match(sql, /revoke all on function public\.%s from public, anon, authenticated', f\);/);
  assert.match(sql, /'kos_search_core\(text, jsonb, uuid\[\], integer, uuid\)'/);
  assert.doesNotMatch(sql, /grant[^;]*kos_documents[^;]*(insert|update|delete)/i);
});
