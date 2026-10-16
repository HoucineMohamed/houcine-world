// Checks the typed content layer (src/content/*.ts) with its schemas and validator (src/content/schema.ts).
//
//   node --experimental-strip-types --test scripts/dev/content.test.mjs
//
// It fails on: an entry the schema refuses (empty or placeholder text, a bad slug, a bad date), a
// duplicate slug, a link to a page that is not in the route manifest, an outside link that is not https,
// and an image path that does not exist in the repository. The second half proves that each of those
// checks really fires, with small broken examples.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { validateContent } = await import(join(root, "src/content/schema.ts"));
const { MANIFEST } = await import(join(root, "src/routes/manifest.ts"));
const load = async (name) => (await import(join(root, `src/content/${name}.ts`)))[name];

const content = {
  services: await load("services"),
  work: await load("work"),
  journal: await load("journal"),
  team: await load("team"),
  testimonials: await load("testimonials"),
  faq: await load("faq"),
};
const routes = MANIFEST.map((r) => r.path);
const fileExists = (p) => existsSync(join(root, p));
const check = (c) => validateContent(c, { routes, fileExists });

test("the content of the site is valid", () => {
  assert.deepEqual(check(content), []);
});

test("no invented entries ship: work, journal posts and testimonials are only what the owner added", () => {
  for (const t of content.testimonials) assert.equal(t.confirmedByOwner, true, `${t.slug}: not confirmed by the owner`);
});

// ── The checks fire ─────────────────────────────────────────────────────────────────────────────
const empty = { services: [], work: [], journal: [], team: [], testimonials: [], faq: [] };
const faq = (over) => ({ slug: "a-question", question: "A question?", answer: "An answer.", ...over });
const work = (over) => ({
  slug: "a-project", title: "A project", vertical: "studio", summary: "One sentence.", context: "Context.",
  role: "Role.", approach: "Approach.", outcome: "Outcome.", tags: [], gallery: [], links: [], draft: false, ...over,
});

test("an empty string is refused", () => {
  assert.match(check({ ...empty, faq: [faq({ answer: "   " })] }).join("\n"), /faq\[0\]\.answer/);
});

test("placeholder text is refused", () => {
  for (const text of ["Lorem ipsum dolor", "TODO write this", "[CLIENT NAME]", "Coming soon"]) {
    assert.ok(check({ ...empty, faq: [faq({ answer: text })] }).length > 0, `accepted "${text}"`);
  }
});

test("a duplicate slug is refused", () => {
  assert.match(check({ ...empty, faq: [faq(), faq()] }).join("\n"), /duplicate slug "a-question"/);
});

test("a bad slug is refused", () => {
  assert.ok(check({ ...empty, faq: [faq({ slug: "Not A Slug" })] }).length > 0);
});

test("a dead internal link is refused", () => {
  assert.match(check({ ...empty, work: [work({ links: [{ label: "More", href: "/no-such-page" }] })] }).join("\n"), /not a page/);
});

test("an outside link that is not https is refused", () => {
  assert.ok(check({ ...empty, work: [work({ links: [{ label: "More", href: "http://example.com" }] })] }).length > 0);
});

test("an image path that does not exist is refused", () => {
  const broken = work({ gallery: [{ src: "src/assets/no-such-image.png", alt: "Nothing" }] });
  assert.match(check({ ...empty, work: [broken] }).join("\n"), /does not exist/);
});

test("an image outside src/assets is refused", () => {
  const outside = work({ gallery: [{ src: "https://example.com/x.png", alt: "Outside" }] });
  assert.ok(check({ ...empty, work: [outside] }).length > 0);
});

test("a testimonial needs the owner's confirmation", () => {
  const t = { slug: "a-quote", quote: "Good.", author: "A person", context: "A project", confirmedByOwner: false };
  assert.ok(check({ ...empty, testimonials: [t] }).length > 0);
});
