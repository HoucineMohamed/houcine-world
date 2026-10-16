// Smoke check of the built site: builds (unless --no-build), serves dist/ on 127.0.0.1, opens every
// public route of src/config/routes.ts in headless Chromium at 1366px and 390px, and checks:
//   the page title, exactly one <h1>, no horizontal scroll, no console error or exception,
//   no outside host beyond the known ones, and no trace of the owner-only entries
//   (in the rendered HTML, dist/index.html, the sitemap, robots.txt and the main bundle).
//
//   node --experimental-strip-types scripts/dev/smoke.mjs [--no-build] [--chrome=/path/to/chrome]
//
// Offline: Chromium resolves every host except 127.0.0.1 to "not found" (scripts/dev/lib/browser.mjs).
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { KNOWN_HOSTS, ROOT, flags, launch, loadRoutes, open, serveDist } from "./lib/browser.mjs";

if (!flags["no-build"]) {
  console.log("Building…");
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

// The owner-only entries are recognised by the private app's host, read from its config file, so this
// script does not have to name it. The owner chunk is the one file in dist/assets that contains it.
const tradesSource = readFileSync(join(ROOT, "src/config/trades.ts"), "utf8");
const privateHost = tradesSource.match(/TRADES_URL\s*=\s*"https:\/\/([^/"]+)/)?.[1];
if (!privateHost) throw new Error("Could not read the private host from src/config/trades.ts");
const assets = join(ROOT, "dist/assets");
const jsFiles = readdirSync(assets).filter((f) => f.endsWith(".js"));
const ownerChunks = jsFiles.filter((f) => readFileSync(join(assets, f), "utf8").includes(privateHost));
const mainBundle = jsFiles.sort((a, b) => statSync(join(assets, b)).size - statSync(join(assets, a)).size)[0];

const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

// Known problems in files a session may not change (critical paths). Reported, not counted as failures.
// Remove an entry once it is fixed, so that a return of the problem fails again.
const KNOWN = {
  "/booking": {
    scroll: "the floating dots of src/pages/BookingForm.tsx (a critical file) reach past the right edge; " +
      "the fix is overflow-hidden on that page's outer wrapper (docs/MORNING-REPORT.md)",
  },
};
const known = [];

for (const f of ["dist/index.html", "dist/sitemap.xml", "dist/robots.txt", `dist/assets/${mainBundle}`]) {
  if (readFileSync(join(ROOT, f), "utf8").includes(privateHost)) fail(f, "contains the private host");
}
if (ownerChunks.includes(mainBundle)) fail("main bundle", "is the owner chunk");

const { PUBLIC_PAGES } = await loadRoutes();
const server = await serveDist();
const page = await launch();
const rows = [];
try {
  const checks = [...Object.entries(PUBLIC_PAGES).map(([path, meta]) => [path, meta.title]), ["/this-page-does-not-exist", null]];
  for (const [path, expectedTitle] of checks) {
    for (const width of [1366, 390]) {
      const where = `${path} @${width}`;
      const r = await open(page, server.url, path, { width, height: width === 390 ? 844 : 900 });
      const s = await page.evaluate(`({
        title: document.title,
        h1: document.querySelectorAll("h1").length,
        scroll: document.documentElement.scrollWidth - window.innerWidth,
        html: document.documentElement.outerHTML.includes(${JSON.stringify(privateHost)}),
      })`);
      const ownerChunkLoaded = page.events.some((e) => e.method === "Network.requestWillBeSent" && ownerChunks.some((c) => e.params.request.url.endsWith(c)));
      if (expectedTitle !== null && s.title !== expectedTitle) fail(where, `title "${s.title}", expected "${expectedTitle}"`);
      if (expectedTitle === null && !/^Page not found/.test(s.title)) fail(where, `unknown path title "${s.title}"`);
      if (s.h1 !== 1) fail(where, `${s.h1} <h1> elements`);
      if (s.scroll > 0 && KNOWN[path]?.scroll) known.push(`${where}: horizontal scroll of ${s.scroll}px, known: ${KNOWN[path].scroll}`);
      else if (s.scroll > 0) fail(where, `horizontal scroll of ${s.scroll}px`);
      if (s.html) fail(where, "rendered HTML contains the private host");
      if (ownerChunkLoaded) fail(where, "downloaded the owner chunk");
      for (const p of r.problems) fail(where, p);
      for (const h of r.outsideHosts) if (!KNOWN_HOSTS.has(h)) fail(where, `new outside host ${h}`);
      rows.push(`${s.h1 === 1 && s.scroll <= 0 && !r.problems.length ? "ok  " : "FAIL"} ${where.padEnd(32)} h1=${s.h1} scroll=${Math.max(0, s.scroll)} hosts=${r.outsideHosts.join(",") || "-"}`);
    }
  }
} finally {
  await page.close();
  server.close();
}

console.log(rows.join("\n"));
if (known.length) console.log(`\nKnown, not counted (${known.length}):\n  ${known.join("\n  ")}`);
console.log(`\nOwner chunk(s): ${ownerChunks.join(", ") || "none"}; main bundle: ${mainBundle}`);
if (failures.length) {
  console.log(`\n${failures.length} problem(s):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("\nSmoke check passed.");
