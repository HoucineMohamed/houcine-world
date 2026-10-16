// The human-readable sitemap (src/routes/siteMap.ts): every public page exactly once, nothing private.
import { test } from "node:test";
import assert from "node:assert/strict";

const { siteMapGroups } = await import("../../src/routes/siteMap.ts");
const { INDEXABLE, CONTENT_PAGES, MANIFEST } = await import("../../src/routes/manifest.ts");

const all = (links) => links.flatMap((l) => [l.path, ...all(l.children)]);
const paths = siteMapGroups().flatMap((g) => all(g.links));

test("every indexable page and published entry appears exactly once", () => {
  const expected = [...INDEXABLE.map((r) => r.path), ...CONTENT_PAGES.map((c) => c.path)].sort();
  assert.deepEqual([...paths].sort(), expected);
});

test("no private, owner-only or template page is listed", () => {
  for (const r of MANIFEST.filter((m) => !m.indexable || m.ownerOnly)) assert.ok(!paths.includes(r.path), r.path);
  for (const p of paths) assert.ok(!/^\/(workspace|admin|auth)(\/|$)/.test(p) && !p.includes(":"), p);
});

test("every group is named and every link has a label and a description", () => {
  const groups = siteMapGroups();
  assert.ok(groups.length >= 4);
  assert.ok(!groups.some((g) => g.title === "More"), "a public page has no group in src/routes/siteMap.ts");
  for (const g of groups) for (const l of g.links) assert.ok(l.label && l.description && !l.label.includes("|"), l.path);
});
