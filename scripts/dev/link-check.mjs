// Offline link check of the built site: serves dist/, renders every public route of src/config/routes.ts
// in headless Chromium (the app draws its links in the browser, so the HTML files alone hold none), and
// reports:
//   broken internal links   a link to a path that is not a public route, an app route or a file in dist/
//   broken anchors          "#id" or "/path#id" where the target page has no element with that id
//   missing images          an <img> that did not load, or a local file that answered 404
//   orphan pages            public routes that no other public page links to (the home page excepted)
// Outside links are listed by host only and never fetched (offline).
//
//   node --experimental-strip-types scripts/dev/link-check.mjs [--build] [--chrome=/path/to/chrome]
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, flags, launch, loadRoutes, open, serveDist } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const COLLECT = `(() => ({
  links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
  ids: [...document.querySelectorAll("[id]")].map((e) => e.id),
  badImages: [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && !/^https?:/.test(i.getAttribute("src") || ""))
    .map((i) => i.getAttribute("src")),
}))()`;

const { PUBLIC_PAGES, PRIVATE_PREFIXES } = await loadRoutes();
const publicPaths = Object.keys(PUBLIC_PAGES);
const isAppRoute = (p) => PRIVATE_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));
const isFile = (p) => p !== "/" && existsSync(join(ROOT, "dist", p));

const server = await serveDist();
const page = await launch();
const pages = new Map();
const broken = [];
const external = new Map();
const other = new Set();
const known = [];
try {
  for (const path of publicPaths) {
    const r = await open(page, server.url, path, { width: 1366 });
    const data = await page.evaluate(COLLECT);
    pages.set(path, data);
    for (const src of data.badImages) broken.push(`${path}: image did not load: ${src}`);
    for (const p of r.problems) if (/404/.test(p)) broken.push(`${path}: ${p}`);
  }
  const inbound = new Map(publicPaths.map((p) => [p, new Set()]));
  for (const [from, data] of pages) {
    for (const href of new Set(data.links)) {
      if (/^(mailto|tel):/i.test(href)) { other.add(href.split(":")[0].toLowerCase()); continue; }
      const url = new URL(href, server.url + from);
      if (url.origin !== server.url) {
        external.set(url.host, (external.get(url.host) ?? 0) + 1);
        continue;
      }
      const target = url.pathname.length > 1 ? url.pathname.replace(/\/$/, "") : "/";
      if (inbound.has(target) && target !== from) inbound.get(target).add(from);
      if (!inbound.has(target) && !isAppRoute(target) && !isFile(target)) {
        broken.push(`${from}: link to unknown page ${href}`);
        continue;
      }
      if (url.hash.length > 1 && inbound.has(target)) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (!pages.get(target).ids.includes(id)) {
          // Known: /booking (src/pages/BookingForm.tsx, a critical file) has no <main> yet, so the skip link's
          // #main has no target there; the critical bundle adds it. Remove this once it is merged.
          if (target === "/booking" && id === "main") known.push(`${from}: anchor ${href} (known: BookingForm has no <main> yet)`);
          else broken.push(`${from}: anchor ${href} not found on ${target}`);
        }
      }
    }
  }
  const orphans = publicPaths.filter((p) => p !== "/" && inbound.get(p).size === 0);

  console.log(`Pages rendered: ${publicPaths.length}`);
  console.log(`\nBroken (${broken.length}):${broken.length ? "\n  " + [...new Set(broken)].join("\n  ") : " none"}`);
  if (known.length) console.log(`\nKnown, not counted (${known.length}):\n  ${[...new Set(known)].join("\n  ")}`);
  console.log(`\nOrphan pages, linked from no other public page (${orphans.length}):${orphans.length ? "\n  " + orphans.join("\n  ") : " none"}`);
  console.log(`\nOutside links by host (not fetched):${external.size ? "\n  " + [...external].sort().map(([h, n]) => `${h} (${n})`).join("\n  ") : " none"}`);
  if (other.size) console.log(`\nOther link kinds: ${[...other].join(", ")}`);
  process.exit(broken.length ? 1 : 0);
} finally {
  await page.close();
  server.close();
}
