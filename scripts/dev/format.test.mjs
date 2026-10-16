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

test("the pages use the shared helpers instead of their own copies", () => {
  const dir = new URL("../../src/pages/", import.meta.url);
  for (const f of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
    const src = readFileSync(new URL(f, dir), "utf8");
    assert.doesNotMatch(src, /const (isInternal|formatDate) =/, `src/pages/${f} defines its own helper`);
  }
});
