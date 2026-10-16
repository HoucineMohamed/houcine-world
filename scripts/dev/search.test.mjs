// Tests for the site search (src/content/search.ts): the index is built from the route manifest and the
// content layer only, and ranking is simple and predictable.
//
//   node --experimental-strip-types --test scripts/dev/search.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { buildSearchIndex, searchItems } = await import(join(root, "src/content/search.ts"));

const index = buildSearchIndex();

test("the index holds every indexable page, every service and every question, and no app route", () => {
  const hrefs = index.map((i) => i.href);
  for (const p of ["/", "/about", "/dev", "/contact", "/work", "/journal", "/brand"]) assert.ok(hrefs.includes(p), `${p} missing`);
  assert.ok(index.some((i) => i.kind === "Service"));
  assert.ok(index.some((i) => i.kind === "Question"));
  assert.ok(!hrefs.some((h) => h.startsWith("/workspace") || h.startsWith("/admin") || h.startsWith("/auth")));
});

test("drafts are never searchable", () => {
  assert.ok(!index.some((i) => i.href === "/journal/how-houcine-world-is-built"), "the draft post is in the index");
});

test("hrefs are unique per kind and every item has a title", () => {
  const keys = index.map((i) => `${i.kind} ${i.href} ${i.title}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const i of index) assert.ok(i.title.trim() !== "");
});

test("an empty query returns nothing; matching ignores case and accents; titles rank first", () => {
  assert.deepEqual(searchItems(index, "   "), []);
  const studio = searchItems(index, "STUDIO");
  assert.ok(studio.length > 0);
  assert.match(studio[0].title, /studio/i, "a title match comes first");
  const items = [
    { kind: "Page", title: "Café", description: "", href: "/a" },
    { kind: "Page", title: "Other", description: "A cafe nearby", href: "/b" },
  ];
  assert.deepEqual(searchItems(items, "cafe").map((i) => i.href), ["/a", "/b"]);
});

test("every word of the query must match somewhere", () => {
  const items = [
    { kind: "Page", title: "Brand", description: "Colours and type", href: "/brand" },
    { kind: "Page", title: "Brand story", description: "", href: "/x" },
  ];
  assert.deepEqual(searchItems(items, "brand colours").map((i) => i.href), ["/brand"]);
});

test("results are capped", () => {
  const many = Array.from({ length: 50 }, (_, n) => ({ kind: "Page", title: `Page ${n}`, description: "", href: `/p${n}` }));
  assert.equal(searchItems(many, "page").length, 12);
});

test("the search module names no private app", () => {
  const text = readFileSync(join(root, "src/content/search.ts"), "utf8").toLowerCase();
  const host = readFileSync(join(root, "src/config/trades.ts"), "utf8").match(/TRADES_URL\s*=\s*"https:\/\/([^/"]+)/)?.[1];
  assert.ok(host && !text.includes(host.split(".")[0]));
});
