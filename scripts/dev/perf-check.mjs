// Offline performance check of the built site (serve dist/, headless Chromium, no network) on key routes at
// phone (390px, 4x slower CPU) and desktop (1366px) sizes. Reports, per route:
//   LCP   largest contentful paint (ms)          CLS   cumulative layout shift
//   FCP   first contentful paint (ms)            TBT   total blocking time, from long tasks (ms)
//   JS    JavaScript bytes loaded before the page settled, and image bytes
// These are lab numbers on this computer, with outside hosts (fonts) blocked: use them to compare before and
// after a change, not as the numbers real visitors see. Budgets: CLS < 0.1 is an error above it.
//
//   node --experimental-strip-types scripts/dev/perf-check.mjs [--build] [--routes=/,/dev] [--json=out.json]
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { ROOT, flags, launch, serveDist, sleep } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const ROUTES = typeof flags.routes === "string" ? flags.routes.split(",") : ["/", "/dev", "/designs", "/larosaview", "/work"];
const OBSERVE = `(() => {
  window.__perf = { lcp: 0, cls: 0, tbt: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.tbt += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true });
})()`;

const server = await serveDist();
const page = await launch();
const rows = [];
let over = 0;
try {
  await page.send("Page.enable");
  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVE });
  for (const [label, width, height, cpu] of [["phone", 390, 844, 4], ["desktop", 1366, 900, 1]]) {
    await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await page.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    for (const path of ROUTES) {
      await page.send("Network.clearBrowserCache");
      page.events.length = 0;
      await page.send("Page.navigate", { url: server.url + path });
      await sleep(5000);
      const m = await page.evaluate(`(() => ({ ...window.__perf, fcp: performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0 }))()`);
      const done = page.events.filter((e) => e.method === "Network.loadingFinished");
      const types = new Map(page.events.filter((e) => e.method === "Network.responseReceived").map((e) => [e.params.requestId, e.params.type]));
      const bytes = (t) => done.filter((e) => types.get(e.params.requestId) === t).reduce((s, e) => s + e.params.encodedDataLength, 0);
      const row = { label, path, lcp: Math.round(m.lcp), fcp: Math.round(m.fcp), cls: +m.cls.toFixed(3), tbt: Math.round(m.tbt), js: bytes("Script"), img: bytes("Image") };
      if (row.cls >= 0.1) over++;
      rows.push(row);
    }
  }
} finally {
  await page.close();
  server.close();
}

const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log("size     route          LCP     FCP     CLS     TBT     JS        images");
for (const r of rows) {
  console.log(`${r.label.padEnd(8)} ${r.path.padEnd(14)} ${String(r.lcp).padStart(5)}  ${String(r.fcp).padStart(5)}   ${r.cls.toFixed(3)}  ${String(r.tbt).padStart(5)}   ${kb(r.js).padStart(7)}   ${kb(r.img).padStart(8)}`);
}
if (typeof flags.json === "string") writeFileSync(flags.json, JSON.stringify(rows, null, 2));
console.log(over ? `\n${over} route(s) with CLS of 0.1 or more.` : "\nCLS under 0.1 on every route.");
process.exit(over ? 1 : 0);
