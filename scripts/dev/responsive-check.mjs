// Offline responsive check of the built site (serve dist/, headless Chromium, no network): every public route
// of the manifest at 360, 390, 768, 1024 and 1366 px wide.
//   errors    sideways scrolling (the page is wider than the window)
//   warnings  tap targets under 44 x 44 px on touch screens (360 to 1024 px are checked as touch screens):
//             buttons, and links that stand on their own (not inside a sentence or the footer's text links)
// With --shots=<folder> it also saves a full-page screenshot of each route and width there (keep that
// folder outside the repository: screenshots are never committed).
//
//   node --experimental-strip-types scripts/dev/responsive-check.mjs [--build] [--shots=/tmp/shots] [--only=/path]
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, flags, launch, loadRoutes, open, serveDist, sleep } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}
const WIDTHS = [360, 390, 768, 1024, 1366];
// Pages whose sideways scroll is known and waiting for a fix in a critical file (none today).
const KNOWN_SCROLL = new Set([]);

const TARGETS = `(() => {
  const small = [];
  for (const el of document.querySelectorAll("a[href], button, [role=button], input[type=checkbox], input[type=radio]")) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    if (r.width <= 1 || r.height <= 1 || s.visibility === "hidden" || el.closest("[aria-hidden=true]")) continue;
    // Tabs keep their designed size (they are at least 24 px, the WCAG 2.2 minimum).
    if (el.getAttribute("role") === "tab") continue;
    // A link inside running text is exempt (WCAG 2.5.8): its parent paragraph or list item holds other text.
    const parent = el.parentElement;
    if (el.tagName === "A" && parent && ["P", "LI", "SPAN", "DD"].includes(parent.tagName) && parent.textContent.trim() !== el.textContent.trim()) continue;
    if (el.closest("footer") && el.tagName === "A" && el.textContent.trim()) continue;
    if (r.width < 44 || r.height < 44) {
      const name = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 30);
      small.push(name + " " + Math.round(r.width) + "x" + Math.round(r.height));
    }
  }
  return { scroll: document.documentElement.scrollWidth - window.innerWidth, small };
})()`;

const { PUBLIC_PAGES } = await loadRoutes();
const paths = typeof flags.only === "string" ? [flags.only] : Object.keys(PUBLIC_PAGES);
const shots = typeof flags.shots === "string" ? flags.shots : null;
if (shots) mkdirSync(shots, { recursive: true });

const server = await serveDist();
const page = await launch();
const errors = [];
const known = [];
const warnings = new Map();
try {
  for (const path of paths) {
    for (const width of WIDTHS) {
      const touch = width <= 1024;
      await open(page, server.url, path, { width, height: 900, wait: 2000, coarse: touch });
      const r = await page.evaluate(TARGETS);
      if (!touch) r.small = []; // tap targets are judged on touch sizes only
      if (r.scroll > 0) (KNOWN_SCROLL.has(path) ? known : errors).push(`${path} @${width}: sideways scroll of ${r.scroll}px`);
      if (KNOWN_SCROLL.has(path)) r.small = []; // a known critical file: its fix comes with its own pull request
      for (const s of r.small) {
        const key = `${path}: ${s.replace(/ \d+x\d+$/, "")}`;
        if (!warnings.has(key)) warnings.set(key, `${s.match(/\d+x\d+$/)?.[0]} at ${width}px`);
      }
      if (shots) {
        await page.evaluate(`(async()=>{for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}scrollTo(0,0);})()`);
        await sleep(400);
        const h = await page.evaluate(`document.documentElement.scrollHeight`);
        await page.send("Emulation.setDeviceMetricsOverride", { width, height: Math.min(h, 8000), deviceScaleFactor: 1, mobile: width < 600 });
        await sleep(300);
        const shot = await page.send("Page.captureScreenshot", { format: "jpeg", quality: 50 });
        writeFileSync(join(shots, `${path === "/" ? "home" : path.slice(1).replace(/\//g, "_")}-${width}.jpg`), Buffer.from(shot.result.data, "base64"));
      }
    }
  }
} finally {
  await page.close();
  server.close();
}

console.log(`Routes: ${paths.length}, widths: ${WIDTHS.join(", ")}`);
console.log(`\nErrors (${errors.length}):${errors.length ? "\n  " + errors.join("\n  ") : " none"}`);
if (known.length) console.log(`\nKnown, not counted (${known.length}):\n  ${known.join("\n  ")}`);
console.log(`\nTap targets under 44 px (${warnings.size}, first width seen):${warnings.size ? "\n  " + [...warnings].map(([k, v]) => `${k} (${v})`).join("\n  ") : " none"}`);
process.exit(errors.length ? 1 : 0);
