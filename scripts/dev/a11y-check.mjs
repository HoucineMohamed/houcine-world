// Offline accessibility check of the built public pages (serve dist/, headless Chromium, no network).
//
//   node --experimental-strip-types scripts/dev/a11y-check.mjs [--build] [--chrome=/path/to/chrome] [--only=/path]
//
// Errors (exit code 1):
//   heading order    the first heading is an <h1>, there is one <h1>, and no level is skipped going down
//   form labels      every visible input, select and textarea has a label, aria-label or aria-labelledby
//   image alt        every <img> has an alt attribute (alt="" is fine for decoration)
//   names            every link and button has an accessible name (text, aria-label, alt of an image inside)
//   token contrast   text/background pairs of the design tokens (src/index.css) reach 4.5:1, the focus ring 3:1
//   reduced motion   with "prefers-reduced-motion: reduce" no CSS animation keeps running forever
//   landmarks        exactly one <main>, a page language, a title, no duplicate ids, and the skip link as
//                    the first Tab stop
// Warnings (reported, not fatal; check them by eye):
//   focus visible    an element reached with Tab shows no outline and no box-shadow
//   text contrast    computed text colour against the nearest solid background below 4.5:1 (gradients,
//                    images and translucent layers make this an estimate)
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, flags, launch, loadRoutes, open, serveDist } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

// ── Token contrast, straight from the CSS variables ─────────────────────────────────────────────
const hslToRgb = (h, s, l) => {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
};
const luminance = ([r, g, b]) => {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const css = readFileSync(join(ROOT, "src/index.css"), "utf8");
const block = (selector) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return {};
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)].map((m) => [m[1], hslToRgb(+m[2], +m[3], +m[4])]));
};
const TEXT_PAIRS = [
  ["foreground", "background"], ["card-foreground", "card"], ["popover-foreground", "popover"],
  ["primary-foreground", "primary"], ["secondary-foreground", "secondary"], ["muted-foreground", "background"],
  ["muted-foreground", "muted"], ["muted-foreground", "card"], ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"], ["sidebar-foreground", "sidebar-background"],
];
const errors = [];
const warnings = [];
// Known errors in files a session may not change (critical paths): reported, not counted.
// Remove an entry once it is fixed, so that a return of the problem fails again.
const KNOWN = [];
const known = [];
const tokenRows = [];
for (const theme of [":root", ".dark"]) {
  const t = block(theme);
  for (const [fg, bg] of [...TEXT_PAIRS, ["ring", "background"]]) {
    if (!t[fg] || !t[bg]) continue;
    const r = ratio(t[fg], t[bg]);
    const need = fg === "ring" ? 3 : 4.5;
    tokenRows.push(`${r >= need ? "ok  " : "FAIL"} ${theme.padEnd(6)} ${`--${fg} on --${bg}`.padEnd(48)} ${r.toFixed(2)}:1 (needs ${need})`);
    if (r < need) errors.push(`tokens ${theme}: --${fg} on --${bg} is ${r.toFixed(2)}:1, needs ${need}:1`);
  }
}

// ── Page checks, in the browser ─────────────────────────────────────────────────────────────────
const PAGE_CHECK = `(() => {
  const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && (r.width > 0 || r.height > 0); };
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") +
    (el.getAttribute("aria-label") ? '[aria-label="' + el.getAttribute("aria-label") + '"]' : "") +
    ' "' + (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40) + '"';
  const out = { errors: [], warnings: [] };
  const mains = document.querySelectorAll("main").length;
  if (mains !== 1) out.errors.push("landmarks: " + mains + " <main> elements (one expected)");
  if (!document.documentElement.lang) out.errors.push("landmarks: <html> has no lang");
  if (!document.title.trim()) out.errors.push("landmarks: empty <title>");
  const ids = [...document.querySelectorAll("[id]")].map((e) => e.id).filter(Boolean);
  const dup = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (dup.length) out.errors.push("duplicate ids: " + dup.slice(0, 5).join(", "));
  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(visible);
  const h1s = document.querySelectorAll("h1").length;
  if (h1s !== 1) out.errors.push("heading order: " + h1s + " <h1> elements");
  if (hs[0] && hs[0].tagName !== "H1") out.errors.push("heading order: first heading is " + describe(hs[0]));
  for (let i = 1; i < hs.length; i++) {
    const a = +hs[i - 1].tagName[1], b = +hs[i].tagName[1];
    if (b > a + 1) out.errors.push("heading order: " + hs[i - 1].tagName + " then " + describe(hs[i]));
  }
  const name = (el) => {
    const by = el.getAttribute("aria-labelledby");
    if (by) return by.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" ").trim();
    return (el.getAttribute("aria-label") || el.textContent || "").trim() ||
      [...el.querySelectorAll("img[alt]")].map((i) => i.alt).join(" ").trim() || (el.getAttribute("title") || "").trim();
  };
  for (const el of document.querySelectorAll("input, select, textarea")) {
    // aria-hidden controls are stand-ins of custom widgets (the Radix select keeps a hidden native one).
    if (el.type === "hidden" || !visible(el) || el.closest("[aria-hidden=true]")) continue;
    const labelled = (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')) || el.closest("label") ||
      el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
    if (!labelled) out.errors.push("form labels: no label for " + el.tagName.toLowerCase() + '[name="' + (el.name || "") + '"][placeholder="' + (el.placeholder || "") + '"]');
  }
  for (const img of document.querySelectorAll("img")) if (!img.hasAttribute("alt")) out.errors.push("image alt: missing on " + img.src.split("/").pop());
  for (const el of document.querySelectorAll("a[href], button, [role=button]")) {
    if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
    if (!name(el)) out.errors.push("names: no accessible name for " + el.outerHTML.slice(0, 120));
  }
  // Computed text contrast (estimate): direct text only, against the nearest solid background.
  const rgb = (c) => (c.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el);
    if (s.backgroundClip === "text" || s.webkitBackgroundClip === "text") continue;
    const fg = rgb(s.color); if (fg.length > 3 && fg[3] === 0) continue;
    let bg = null, node = el, alpha = fg[3] ?? 1, layered = false;
    for (let p = el; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (+ps.opacity < 1) alpha *= +ps.opacity;
      if (ps.backgroundImage !== "none") { layered = true; break; }
      const c = rgb(ps.backgroundColor);
      if (c.length && (c[3] ?? 1) >= 0.95) { bg = c; break; }
      if (c.length && (c[3] ?? 1) > 0) layered = true;
    }
    // Skip layers and text that is (still) transparent, such as content waiting for its scroll animation.
    if (layered || !bg || alpha < 0.2) continue;
    const f = fg.slice(0, 3).map((v, i) => v * alpha + bg[i] * (1 - alpha));
    const [x, y] = [lum(f), lum(bg)].sort((a, b) => b - a);
    const r = (x + 0.05) / (y + 0.05);
    const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (r < (big ? 3 : 4.5)) {
      const key = s.color + "|" + bg.join(",");
      if (seen.has(key)) continue; seen.add(key);
      out.warnings.push("text contrast: " + r.toFixed(2) + ":1 " + describe(el));
    }
  }
  return out;
})()`;

const FOCUS_STEP = `(() => { const el = document.activeElement; if (!el || el === document.body) return null;
  const s = getComputedStyle(el);
  const shown = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
  return { shown, what: el.tagName.toLowerCase() + ' "' + ((el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40)) + '"' }; })()`;

const MOTION = `document.getAnimations().filter((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations === Infinity).length`;

const { PUBLIC_PAGES } = await loadRoutes();
const paths = typeof flags.only === "string" ? [flags.only] : Object.keys(PUBLIC_PAGES);
const server = await serveDist();
const page = await launch();
try {
  for (const path of paths) {
    await open(page, server.url, path, { width: 1366 });
    const r = await page.evaluate(PAGE_CHECK);
    for (const e of r.errors) {
      const k = KNOWN.find((x) => x.page === path && x.kind.test(e));
      if (k) known.push(`${path}: ${e} (known: ${k.why})`);
      else errors.push(`${path}: ${e}`);
    }
    r.warnings.forEach((w) => warnings.push(`${path}: ${w}`));
    await page.key("Tab", "Tab", 9);
    const first = await page.evaluate(`document.activeElement?.textContent?.trim()`);
    if (first !== "Skip to content") errors.push(`${path}: skip link: the first Tab stop is "${first}"`);
    const noRing = new Set();
    for (let i = 0; i < 25; i++) {
      await page.key("Tab", "Tab", 9);
      const f = await page.evaluate(FOCUS_STEP);
      if (f && !f.shown) noRing.add(f.what);
    }
    noRing.forEach((w) => warnings.push(`${path}: focus visible: no outline or shadow on ${w}`));
    await open(page, server.url, path, { width: 1366, reducedMotion: true });
    const running = await page.evaluate(MOTION);
    if (running > 0) errors.push(`${path}: reduced motion: ${running} CSS animation(s) still repeat forever`);
  }
} finally {
  await page.close();
  server.close();
}

console.log("Design token contrast\n  " + tokenRows.join("\n  "));
console.log(`\nPages checked: ${paths.length}`);
console.log(`\nErrors (${errors.length}):${errors.length ? "\n  " + errors.join("\n  ") : " none"}`);
if (known.length) console.log(`\nKnown, not counted (${known.length}):\n  ${known.join("\n  ")}`);
console.log(`\nWarnings (${warnings.length}):${warnings.length ? "\n  " + warnings.join("\n  ") : " none"}`);
process.exit(errors.length ? 1 : 0);
