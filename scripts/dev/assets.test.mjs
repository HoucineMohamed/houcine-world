// Image size budget: every image under src/assets and public is at most 500 KB, except the files listed
// below, which are already in the site and need smaller copies from the owner (sessions add no image
// files). A new image over the budget fails; so does a listed file that has grown.
//
//   node --test scripts/dev/assets.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BUDGET = 500 * 1024;

/** Oversized images that predate the budget, with their size today (bytes). Remove a line once replaced. */
const KNOWN = {
  "src/assets/the-view-cover.png": 2922109,
  "src/assets/houcine-photo.jpg": 1539726,
  "src/assets/banner-designs.png": 1492951,
  "src/assets/n30-cover.png": 1302311,
  "src/assets/banner-reads.png": 1246085,
  "src/assets/timbre-cover.jpg": 1193266,
  "src/assets/hajri-photo.jpeg": 1109965,
  "src/assets/images/larosaview-logo.png": 1096275,
  "src/assets/brand-background.png": 587628,
  "src/assets/larosa-logo.png": 553145,
};

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const images = ["src/assets", "public"]
  .flatMap((d) => walk(join(root, d)))
  .filter((f) => /\.(png|jpe?g|webp|gif|svg|avif)$/i.test(f))
  .map((f) => ({ path: relative(root, f).split("\\").join("/"), size: statSync(f).size }));

test("every image is within the 500 KB budget, or listed as known and not grown", () => {
  assert.ok(images.length > 0, "no images found");
  for (const { path, size } of images) {
    if (path in KNOWN) assert.ok(size <= KNOWN[path], `${path} grew to ${size} bytes`);
    else assert.ok(size <= BUDGET, `${path} is ${Math.round(size / 1024)} KB, over the 500 KB budget`);
  }
});

test("the known list names only files that still exist", () => {
  const paths = new Set(images.map((i) => i.path));
  for (const p of Object.keys(KNOWN)) assert.ok(paths.has(p), `${p} is listed but no longer exists: remove the line`);
});
