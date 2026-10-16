// The small content helpers: src/content/format.ts and shortTitle in src/routes/manifest.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const { formatDate, isInternalHref } = await import("../../src/content/format.ts");
const { shortTitle, MANIFEST } = await import("../../src/routes/manifest.ts");

test("formatDate writes the day in words, in UTC", () => {
  assert.equal(formatDate("2026-10-16"), "16 October 2026");
  assert.equal(formatDate("2026-01-01"), "1 January 2026");
  assert.equal(formatDate("2024-02-29"), "29 February 2024");
});

test("isInternalHref: site paths only", () => {
  for (const h of ["/", "/about", "/work#top", "/journal?x=1"]) assert.equal(isInternalHref(h), true, h);
  for (const h of ["//evil.example/x", "https://houcine.world/about", "mailto:a@b.c", "about", "", "javascript:alert(1)"]) assert.equal(isInternalHref(h), false, h);
});

test("shortTitle drops the site name only", () => {
  assert.equal(shortTitle("Team | Houcine.world"), "Team");
  assert.equal(shortTitle("About the DJ | La Rosa View"), "About the DJ");
  assert.equal(shortTitle("Houcine.world"), "Houcine.world");
  for (const r of MANIFEST) assert.ok(shortTitle(r.title).length > 0, r.path);
});

test("pages and components use the shared helpers instead of their own copies", () => {
  const src = new URL("../../src/", import.meta.url);
  const files = readdirSync(src, { recursive: true }).filter((f) => /^(pages|components)\/.*\.tsx?$/.test(f.replaceAll("\\", "/")));
  assert.ok(files.length > 20, "found the page and component files");
  for (const f of files) {
    if (f.includes("workspace") || f.includes("admin")) continue; // the workspace keeps its own date formats
    const text = readFileSync(new URL(f, src), "utf8");
    assert.doesNotMatch(text, /const (isInternal|formatDate) =/, `src/${f} defines its own helper`);
  }
});
