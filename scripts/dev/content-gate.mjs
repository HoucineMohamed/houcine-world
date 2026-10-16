// Content quality gate on the rendered site (serve dist/, headless Chromium, no network): every public page of
// the manifest and every published work entry and journal post is opened, and its visible text is checked
// for words that mean "not written yet" (lorem ipsum, TODO, TBD, TBC, FIXME, XXX, "placeholder", or text in
// [SQUARE CAPITALS]). It also fails on a console error or exception on any of those pages.
//
// Two things are reported but not counted, because the owner fills them in (docs/PROGRAM-STATUS.md,
// "Owner must fill"): the legal placeholders in square brackets on /terms, /privacy and /data-deletion, and
// "Coming soon" empty states, which are deliberate.
//
//   node --experimental-strip-types scripts/dev/content-gate.mjs [--build] [--chrome=/path/to/chrome]
import { spawnSync } from "node:child_process";
import { ROOT, flags, launch, loadRoutes, open, serveDist } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const WORDS = /\b(lorem ipsum|todo|tbd|tbc|fixme|xxx+)\b|placeholder|\[[A-Z][A-Z0-9 /_.,'-]{3,}\]/gi;
const LEGAL = new Set(["/terms", "/privacy", "/data-deletion"]);
const OWNER_PLACEHOLDERS = /^\[(LEGAL ENTITY NAME|GOVERNING JURISDICTION|CONTACT EMAIL FOR PRIVACY \/ LEGAL REQUESTS|POSTAL ADDRESS)\]$/;

const { PUBLIC_PAGES } = await loadRoutes();
const paths = Object.keys(PUBLIC_PAGES);
const server = await serveDist();
const page = await launch();
const errors = [];
const known = [];
let comingSoon = 0;
try {
  for (const path of paths) {
    const r = await open(page, server.url, path, { width: 1366 });
    for (const p of r.problems) errors.push(`${path}: ${p}`);
    // Visible text only: hidden inputs' placeholder attributes and scripts are not text.
    const text = await page.evaluate(`document.body.innerText`);
    comingSoon += (text.match(/coming soon/gi) ?? []).length;
    for (const m of text.matchAll(WORDS)) {
      const hit = m[0];
      if (LEGAL.has(path) && OWNER_PLACEHOLDERS.test(hit)) known.push(`${path}: ${hit}`);
      else errors.push(`${path}: "${hit}" in the visible text`);
    }
  }
} finally {
  await page.close();
  server.close();
}

console.log(`Pages checked: ${paths.length} (including published work entries and journal posts)`);
console.log(`"Coming soon" empty states seen: ${comingSoon}`);
if (known.length) console.log(`\nOwner placeholders, not counted (${known.length}):\n  ${[...new Set(known)].join("\n  ")}`);
console.log(`\nErrors (${errors.length}):${errors.length ? "\n  " + errors.join("\n  ") : " none"}`);
process.exit(errors.length ? 1 : 0);
