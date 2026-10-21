// Checks the route manifest (src/routes/manifest.ts) against the app and the public files.
//
//   node --experimental-strip-types --test scripts/dev/manifest.test.mjs
//
// It fails when: a <Route> in src/App.tsx is missing from the manifest (or the manifest lists a route the
// app does not have); public/sitemap.xml or public/robots.txt differ from what the manifest produces;
// an entry is incomplete or inconsistent (empty title, an indexable app route, an owner-only route that
// could be indexed, a duplicate). The app itself also refuses unknown paths at type-check time, because
// src/App.tsx writes its top-level paths through route(), which only accepts manifest paths.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { MANIFEST, PRIVATE_PREFIXES, CONTENT_TEMPLATES, sitemapXml, robotsTxt } = await import(join(root, "src/routes/manifest.ts"));

/** The paths of src/App.tsx, with the nested brand routes resolved to their full path. */
const appPaths = () => {
  const app = readFileSync(join(root, "src/App.tsx"), "utf8");
  const found = [...app.matchAll(/<Route\s+path=\{?(?:route\()?"([^"]+)"\)?\}?/g)].map((m) => m[1]);
  assert.ok(found.length > 10, "could not read the routes of src/App.tsx");
  return found.map((p) => (p.startsWith("/") || p === "*" ? p : `/workspace/:brandId/${p}`));
};

test("every route of src/App.tsx is in the manifest, and nothing else is", () => {
  const app = new Set(appPaths());
  const manifest = new Set(MANIFEST.map((r) => r.path));
  for (const p of app) assert.ok(manifest.has(p), `${p} is a route of src/App.tsx but is missing from src/routes/manifest.ts`);
  for (const p of manifest) assert.ok(app.has(p), `${p} is in the manifest but src/App.tsx has no such route`);
});

test("entries are complete and consistent", () => {
  const paths = new Set();
  for (const r of MANIFEST) {
    assert.ok(!paths.has(r.path), `duplicate path ${r.path}`);
    paths.add(r.path);
    assert.ok(r.title.trim().length > 0 && r.description.trim().length > 0, `${r.path}: empty title or description`);
    assert.equal(typeof r.indexable, "boolean");
    assert.equal(typeof r.ownerOnly, "boolean");
    if (r.indexable) {
      assert.ok(r.path.startsWith("/") && !/[:*]/.test(r.path), `${r.path}: a pattern cannot be indexable`);
      assert.ok(!PRIVATE_PREFIXES.some((p) => r.path === p || r.path.startsWith(`${p}/`)), `${r.path}: an app route cannot be indexable`);
      assert.ok(typeof r.sitemapPriority === "number" && r.sitemapPriority > 0 && r.sitemapPriority <= 1, `${r.path}: priority between 0 and 1`);
    } else {
      assert.equal(r.sitemapPriority, null, `${r.path}: a page that is not indexable has no sitemap priority`);
    }
    if (r.ownerOnly) assert.equal(r.indexable, false, `${r.path}: owner-only pages are never indexable`);
  }
});

test("content templates are real routes of the manifest and are not themselves indexable", () => {
  for (const t of CONTENT_TEMPLATES) {
    const entry = MANIFEST.find((r) => r.path === t);
    assert.ok(entry && !entry.indexable, `${t} must be a non-indexable manifest entry`);
  }
});

test("every indexable page and published entry has a title, a description and a canonical link from BASE_URL", async () => {
  const { CONTENT_PAGES } = await import(join(root, "src/routes/manifest.ts"));
  const { PUBLIC_PAGES, canonicalUrl } = await import(join(root, "src/config/routes.ts"));
  const { BASE_URL } = await import(join(root, "src/config/site.ts"));
  assert.equal(BASE_URL, "https://houcine.world");
  const paths = [...MANIFEST.filter((r) => r.indexable).map((r) => r.path), ...CONTENT_PAGES.map((p) => p.path)];
  for (const p of paths) {
    const meta = PUBLIC_PAGES[p];
    assert.ok(meta && meta.title.trim() && meta.description.trim(), `${p}: no title or description`);
    assert.equal(canonicalUrl(p), `${BASE_URL}${p}`, `${p}: canonical`);
  }
  assert.equal(canonicalUrl("/workspace"), null);
  assert.equal(canonicalUrl("/no-such-page"), null);
});

test("indexable titles are unique", () => {
  const titles = MANIFEST.filter((r) => r.indexable).map((r) => r.title);
  assert.equal(new Set(titles).size, titles.length);
});

test("public/sitemap.xml is exactly what the manifest produces", () => {
  assert.equal(readFileSync(join(root, "public/sitemap.xml"), "utf8"), sitemapXml());
});

test("public/robots.txt is exactly what the manifest produces, and disallows every app area", () => {
  const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
  assert.equal(robots, robotsTxt());
  for (const r of MANIFEST.filter((x) => !x.indexable && x.path.startsWith("/") && !CONTENT_TEMPLATES.includes(x.path))) {
    assert.ok(PRIVATE_PREFIXES.some((p) => r.path === p || r.path.startsWith(`${p}/`)), `${r.path} is not indexable but no robots rule covers it`);
  }
});

test("the manifest names no private app", () => {
  const text = readFileSync(join(root, "src/routes/manifest.ts"), "utf8").toLowerCase();
  const trades = readFileSync(join(root, "src/config/trades.ts"), "utf8").match(/TRADES_URL\s*=\s*"https:\/\/([^/"]+)/)?.[1];
  assert.ok(trades, "could not read the private host");
  assert.ok(!text.includes(trades.toLowerCase()) && !text.includes(trades.split(".")[0]), "the manifest mentions the private app");
});
