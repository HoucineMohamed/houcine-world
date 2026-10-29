// The branded fallback (docs/fallback.md): the self-contained maintenance page, the boot watchdog that sends a
// visitor there when the app cannot start, and the in-app twin used by the error boundaries.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const page = read("public/maintenance.html");
const watchdog = read("public/boot-watchdog.js");
const index = read("index.html");
const twin = read("src/components/BrandedFallback.tsx");
const main = read("src/main.tsx");

const COPY = [
  "Something Better Is Taking Shape.",
  "Houcine is currently working behind the scenes to improve your experience. We'll be back shortly with something better.",
  "Refining the experience",
  "Thank you for your patience.",
  "Houcine.world",
];

test("the maintenance page carries the agreed words, and the in-app fallback the same ones", () => {
  for (const line of COPY) {
    assert.ok(page.includes(line), `maintenance.html: ${line}`);
    assert.ok(twin.includes(line), `BrandedFallback.tsx: ${line}`);
  }
});

test("the maintenance page needs no other file: no outside address, no linked script, style, font or image", () => {
  assert.doesNotMatch(page, /<script[^>]*\ssrc=/i);
  assert.doesNotMatch(page, /<link[^>]*rel="?stylesheet/i);
  const css = page.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(css, /@import|@font-face|url\(/i);
  assert.doesNotMatch(page, /https?:\/\//i, "no absolute address at all");
  for (const [, src] of page.matchAll(/<img[^>]*\ssrc="([^"]+)"/gi)) assert.match(src, /^data:image\/webp;base64,/);
  for (const [, href] of page.matchAll(/\shref="([^"]+)"/gi)) assert.equal(href, "/");
  assert.ok(Buffer.byteLength(page) < 40_000, "stays light");
});

test("the embedded logo is the H mark, resized: a real WebP picture", () => {
  const b64 = page.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/)[1];
  const img = Buffer.from(b64, "base64");
  assert.equal(img.subarray(0, 4).toString(), "RIFF");
  assert.equal(img.subarray(8, 12).toString(), "WEBP");
  assert.match(page, /alt="Houcine logo"/);
});

test("the maintenance page tells nothing technical, is not indexed and respects reduced motion", () => {
  const visible = page.replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, "");
  assert.doesNotMatch(visible, /\b(error|failure|failed|server|deploy|outage|database|5\d\d|4\d\d)\b/i);
  assert.doesNotMatch(visible, /minutes?|hours?|countdown/i, "no promised return time");
  assert.match(page, /<meta name="robots" content="noindex, nofollow"/);
  assert.match(page, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(page, /<html lang="en" data-houcine-fallback="1">/);
  assert.match(page, /<main\b/);
  assert.equal((page.match(/<h1\b/g) || []).length, 1);
});

test("the recovery check is gentle: spaced out, capped, and never reloads on its own", () => {
  const script = page.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.match(script, /delay = 30000/);
  assert.match(script, /Math\.min\(delay \* 2, 300000\)/);
  assert.match(script, /tries >= 12/);
  assert.match(script, /document\.hidden/);
  assert.doesNotMatch(script, /location\.(reload|replace|assign)|location\.href\s*=/);
  // The return address is checked to be on this site.
  assert.match(script, /u\.origin === location\.origin/);
});

test("index.html loads the watchdog as a plain script before the app", () => {
  const w = index.indexOf('<script src="/boot-watchdog.js"></script>');
  const app = index.indexOf('<script type="module" src="/src/main.tsx"></script>');
  assert.ok(w > 0 && app > w);
});

test("the watchdog only acts while nothing is drawn, and only sends to the maintenance page", () => {
  assert.match(watchdog, /function mounted\(\)/);
  assert.match(watchdog, /if \(done \|\| mounted\(\)\) return;/);
  const targets = watchdog.match(/location\.(replace|assign)\(|location\.href\s*=/g) || [];
  assert.equal(targets.length, 1);
  assert.match(watchdog, /location\.replace\("\/maintenance\.html\?return=" \+ encodeURIComponent\(here\)\);/);
  assert.doesNotMatch(watchdog, /fetch\(|sendBeacon|XMLHttpRequest|localStorage|cookie/);
});

test("the whole app sits inside the outermost boundary", () => {
  assert.match(main, /<AppErrorBoundary>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<App \/>/);
});
