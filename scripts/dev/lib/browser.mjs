// Shared helpers for the scripts in scripts/dev: a static server for dist/, a local headless Chromium
// and a minimal DevTools client. No dependency (Node 22 has fetch and WebSocket built in).
//
// Offline by design: Chromium is started with every host except 127.0.0.1 resolved to "not found", so
// the checks never reach the internet. Requests to outside hosts are still RECORDED (they are attempted),
// which is how the scripts report which hosts a page would load.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Command-line flags: --name=value or --name (true). */
export const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...v] = a.slice(2).split("=");
    return [k, v.length ? v.join("=") : true];
  }),
);

/** The public pages and private prefixes from src/config/routes.ts (needs --experimental-strip-types). */
export const loadRoutes = async () => import(join(ROOT, "src/config/routes.ts"));

/**
 * Hosts the public site already loads (docs/security-review.md, "Third-party scripts and hosts", plus the
 * video and audio embeds on the La Rosa View pages). A host outside this list is reported as new.
 */
export const KNOWN_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "storage.googleapis.com",
  "pcdkfpardswfwoiclvtm.supabase.co",
  "www.youtube.com",
  "i.ytimg.com",
  "w.soundcloud.com",
]);

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".woff2": "font/woff2",
};

/** Serves dist/ on 127.0.0.1 with the SPA fallback that public/_redirects gives on Netlify. */
export const serveDist = (dir = join(ROOT, "dist")) =>
  new Promise((ok, fail) => {
    if (!existsSync(join(dir, "index.html"))) return fail(new Error(`${dir}/index.html not found: build first`));
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = normalize(join(dir, path));
      if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
      if (!existsSync(file) || statSync(file).isDirectory()) {
        if (extname(path)) { res.writeHead(404).end("not found"); return; }
        file = join(dir, "index.html");
      }
      res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(readFileSync(file));
    });
    server.listen(0, "127.0.0.1", () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() }));
  });

/** Finds a Chromium: --chrome=path, then the preinstalled Playwright browsers, then common names. */
const findChrome = () => {
  if (typeof flags.chrome === "string") return flags.chrome;
  for (const base of ["/opt/pw-browsers", join(process.env.HOME ?? "", ".cache/ms-playwright")]) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base).filter((n) => n.startsWith("chromium-")).sort().reverse()) {
      const p = join(base, d, "chrome-linux", "chrome");
      if (existsSync(p)) return p;
    }
  }
  for (const p of ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"]) if (existsSync(p)) return p;
  throw new Error("No Chromium found; pass --chrome=/path/to/chrome");
};

/** Starts headless Chromium and returns a connected page. */
export const launch = async () => {
  const profile = mkdtempSync(join(tmpdir(), "hw-check-"));
  const env = { ...process.env };
  for (const k of ["HTTPS_PROXY", "HTTP_PROXY", "https_proxy", "http_proxy"]) delete env[k];
  const proc = spawn(findChrome(), [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--no-proxy-server", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",
    `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
  ], { env, stdio: "ignore" });
  const portFile = join(profile, "DevToolsActivePort");
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  if (!existsSync(portFile)) throw new Error("Chromium did not start");
  const port = readFileSync(portFile, "utf8").split("\n")[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = await connect(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  page.close = async () => { page.ws.close(); proc.kill(); await sleep(200); rmSync(profile, { recursive: true, force: true }); };
  return page;
};

const connect = async (wsUrl) => {
  const ws = new WebSocket(wsUrl);
  await new Promise((r, f) => { ws.addEventListener("open", r); ws.addEventListener("error", f); });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else events.push(d);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result?.result?.value;
  };
  const key = async (k, code, keyCode) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: keyCode, ...(k === "Enter" ? { text: "\r" } : {}) });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: keyCode });
    await sleep(80);
  };
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  return { ws, send, evaluate, key, events };
};

/** Opens a path at a viewport width and waits for the page to settle. Returns what happened on the way. */
export const open = async (page, base, path, { width = 1366, height = 900, reducedMotion = false, wait = 2500 } = {}) => {
  await page.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" }] });
  page.events.length = 0;
  await page.send("Page.navigate", { url: base + path });
  await sleep(wait);
  const outside = new Set();
  const problems = [];
  for (const e of page.events) {
    if (e.method === "Network.requestWillBeSent") {
      const u = new URL(e.params.request.url);
      if ((u.protocol === "http:" || u.protocol === "https:") && u.hostname !== "127.0.0.1") outside.add(u.host);
    } else if (e.method === "Runtime.exceptionThrown") {
      problems.push(`exception: ${e.params.exceptionDetails.exception?.description?.split("\n")[0] ?? e.params.exceptionDetails.text}`);
    } else if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") {
      problems.push(`console.error: ${e.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200)}`);
    } else if (e.method === "Log.entryAdded" && e.params.entry.level === "error") {
      // Outside hosts are blocked on purpose here, so their load failures are not page problems.
      const url = e.params.entry.url ?? "";
      if (url && !url.startsWith(base)) continue;
      if (/ERR_NAME_NOT_RESOLVED/.test(e.params.entry.text)) continue;
      problems.push(`${e.params.entry.source}: ${e.params.entry.text.slice(0, 200)} ${url}`);
    }
  }
  // Errors that only happen because outside hosts are blocked (a failed fetch to the database, for
  // example) are reported apart, so that they do not hide or fake real page errors.
  const offline = /Failed to fetch|NetworkError|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|AuthRetryableFetchError/;
  return {
    outsideHosts: [...outside].sort(),
    problems: problems.filter((p) => !offline.test(p)),
    offlineNoise: problems.filter((p) => offline.test(p)),
  };
};
