// Opens every public page and the two sign-in pages with the site's own headers (public/_headers, served by
// scripts/dev/lib/browser.mjs like Netlify does) and fails on any Content Security Policy message, enforced or
// report-only. Run it after changing public/_headers, a host the site loads, or an embed.
//
//   node --experimental-strip-types scripts/dev/csp-check.mjs [--build]
import { spawnSync } from "node:child_process";
import { ROOT, flags, launch, loadRoutes, open, serveDist } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const { PUBLIC_PAGES } = await loadRoutes();
const paths = [...Object.keys(PUBLIC_PAGES), "/workspace/login", "/admin/login"];
const server = await serveDist();
const page = await launch();
const found = new Map();
let headers = [];
try {
  for (const path of paths) {
    await open(page, server.url, path, { width: 1366 });
    // Raw browser messages: a violation about an outside address is reported too.
    for (const e of page.events) {
      if (e.method !== "Log.entryAdded" && e.method !== "Runtime.consoleAPICalled") continue;
      const text = e.params.entry?.text ?? JSON.stringify(e.params.args);
      if (/Content Security Policy/i.test(text)) found.set(text.slice(0, 200), path);
    }
  }
  headers = await page.evaluate(`fetch("/").then((r) => [...r.headers.keys()])`);
} finally {
  await page.close();
  server.close();
}

const required = ["content-security-policy", "content-security-policy-report-only", "x-frame-options", "referrer-policy", "permissions-policy", "x-content-type-options"];
const missing = required.filter((h) => !headers.includes(h));
console.log(`Pages checked: ${paths.length}`);
console.log(`Headers missing (${missing.length}):${missing.length ? " " + missing.join(", ") : " none"}`);
console.log(`Policy messages (${found.size}):${found.size ? "" : " none"}`);
for (const [m, p] of found) console.log(`  ${p}: ${m}`);
process.exit(missing.length || found.size ? 1 : 0);
