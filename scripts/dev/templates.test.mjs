// The case-study and journal-post templates (src/content/templates.ts) and the new-entry printer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const T = await import("../../src/content/templates.ts");
const { validateContent } = await import("../../src/content/schema.ts");
const { MANIFEST } = await import("../../src/routes/manifest.ts");
const routes = MANIFEST.map((r) => r.path);
const empty = { services: [], work: [], journal: [], team: [], testimonials: [], faq: [] };
const check = (c) => validateContent({ ...empty, ...c }, { routes, fileExists: () => true });
const SITE = { baseUrl: "https://houcine.world", name: "Houcine.world" };

test("slugify makes lower-case ascii words joined by hyphens", () => {
  assert.equal(T.slugify("How Houcine.world is built"), "how-houcine-world-is-built");
  assert.equal(T.slugify("  Été à Paris: notes!  "), "ete-a-paris-notes");
  assert.equal(T.slugify("A".repeat(50) + " " + "b".repeat(50)).length <= 80, true);
  assert.doesNotMatch(T.slugify("x".repeat(79) + " yy"), /-$/);
});

test("a new draft is refused by the content test until every TODO is written", () => {
  const work = T.caseStudyDraft("A real project", "studio", "2026-10-01");
  const post = T.journalPostDraft("A real post", "2026-10-17");
  assert.equal(work.draft, true);
  assert.equal(post.draft, true);
  const problems = check({ work: [work], journal: [post] });
  for (const field of ["summary", "context", "role", "approach", "outcome"]) assert.ok(problems.some((p) => p.startsWith(`work[0].${field}:`)), field);
  assert.ok(problems.some((p) => p.startsWith("journal[0].summary:")));
  assert.ok(problems.some((p) => p.startsWith("journal[0].body.0.text:")));
});

test("once written, the same draft is valid", () => {
  const work = { ...T.caseStudyDraft("A real project", "studio"), summary: "S.", context: "C.", role: "R.", approach: "A.", outcome: "O." };
  const post = { ...T.journalPostDraft("A real post", "2026-10-17"), summary: "S.", body: [{ type: "p", text: "Text." }] };
  assert.deepEqual(check({ work: [work], journal: [post] }), []);
});

test("the printed source is the entry, as TypeScript", () => {
  const post = T.journalPostDraft("A real post", "2026-10-17");
  const src = T.draftSource(post);
  assert.match(src, /^\{\n  slug: "a-real-post",/);
  assert.match(src, /\},\n$/);
  assert.deepEqual(Function(`return ${src.trim().replace(/,$/, "")}`)(), post);
  const out = execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", new URL("./new-entry.mjs", import.meta.url).pathname, "post", "A real post", "2026-10-17"], { encoding: "utf8" });
  assert.equal(out, src);
});

test("the printer refuses a missing title, vertical or date", () => {
  const run = (...a) => () => execFileSync(process.execPath, ["--experimental-strip-types", "--no-warnings", new URL("./new-entry.mjs", import.meta.url).pathname, ...a], { stdio: "pipe" });
  assert.throws(run("work", "Title", "music"));
  assert.throws(run("post", "Title"));
  assert.throws(run("page"));
});

test("structured data of a case study and a post", () => {
  const work = { ...T.caseStudyDraft("A real project", "studio", "2026-10-01"), summary: "S.", tags: ["Brand"] };
  assert.deepEqual(T.caseStudyStructuredData(work, SITE), {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: "A real project",
    description: "S.",
    url: "https://houcine.world/work/a-real-project",
    dateCreated: "2026-10-01",
    keywords: "Brand",
    creator: { "@type": "Organization", name: "Houcine.world", url: "https://houcine.world/" },
  });
  const bare = T.caseStudyStructuredData({ ...work, tags: [], date: undefined }, SITE);
  assert.ok(!("keywords" in bare) && !("dateCreated" in bare));
  const post = { ...T.journalPostDraft("A real post", "2026-10-17"), summary: "S." };
  const ld = T.journalPostStructuredData(post, SITE);
  assert.equal(ld["@type"], "BlogPosting");
  assert.equal(ld.url, "https://houcine.world/journal/a-real-post");
  assert.equal(ld.datePublished, "2026-10-17");
});
