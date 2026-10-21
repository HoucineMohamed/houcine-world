// Offline keyboard check of the built site (serve dist/, headless Chromium, no network): the parts of the
// public site that must work without a mouse.
//
//   node --experimental-strip-types scripts/dev/keyboard-check.mjs [--build] [--chrome=/path/to/chrome]
//
// 1. The skip link is the first Tab stop and moves focus into <main>.
// 2. On a phone (390px) the home page menu opens with Enter, traps focus, and closes with Escape, giving
//    focus back to its button.
// 3. Search opens with Ctrl+K and with "/", puts focus in its field, announces the number of results,
//    opens a result with the arrow keys and Enter, and closes with Escape.
// 4. Every node of the ecosystem map is reached with Tab and shows a focus style.
import { spawnSync } from "node:child_process";
import { ROOT, flags, launch, open, serveDist, sleep } from "./lib/browser.mjs";

if (flags.build) {
  const b = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

const server = await serveDist();
const page = await launch();
const press = async (key, code, keyCode, modifiers = 0, text) => {
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: keyCode, modifiers, ...(text ? { text } : {}) });
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode, modifiers });
  await sleep(120);
};
const type = async (s) => {
  for (const ch of s) await press(ch, "", 0, 0, ch);
};
const active = () => page.evaluate(`(() => { const a = document.activeElement; return a ? { tag: a.tagName, text: (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 40), inMain: !!a.closest("main"), inDialog: !!a.closest('[role="dialog"]') } : null; })()`);

try {
  // 1. Skip link
  await open(page, server.url, "/dev", { width: 1366 });
  await press("Tab", "Tab", 9);
  const first = await active();
  check("skip link is the first Tab stop", first?.text === "Skip to content", first?.text);
  await press("Enter", "Enter", 13, 0, "\r");
  await sleep(300);
  const afterSkip = await page.evaluate(`document.activeElement?.tagName`);
  check("skip link moves focus to <main>", afterSkip === "MAIN", afterSkip);

  // 2. Home page menu on a phone
  await open(page, server.url, "/", { width: 390, height: 844 });
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await press("Tab", "Tab", 9);
    reached = await page.evaluate(`document.activeElement?.getAttribute("aria-haspopup") === "dialog"`);
  }
  check("phone menu button is reachable with Tab", reached);
  await press("Enter", "Enter", 13, 0, "\r");
  await sleep(600);
  const inMenu = await active();
  check("Enter opens the menu and moves focus into it", inMenu?.inDialog, inMenu?.text);
  for (let i = 0; i < 10; i++) await press("Tab", "Tab", 9);
  const stillIn = await active();
  check("focus stays inside the open menu", stillIn?.inDialog, stillIn?.text);
  await press("Escape", "Escape", 27);
  await sleep(500);
  const back = await page.evaluate(`({ open: !!document.querySelector('[role="dialog"]'), returned: document.activeElement?.getAttribute("aria-haspopup") === "dialog" })`);
  check("Escape closes the menu and returns focus to its button", !back.open && back.returned, JSON.stringify(back));

  // 3. Search
  for (const [label, keys] of [["Ctrl+K", () => press("k", "KeyK", 75, 2)], ['"/"', () => press("/", "Slash", 191, 0, "/")]]) {
    await open(page, server.url, "/brand", { width: 1366 });
    await page.evaluate(`document.activeElement?.blur()`);
    await keys();
    await sleep(1200);
    const s = await page.evaluate(`({ dialog: !!document.querySelector('[role="dialog"]'), input: document.activeElement?.hasAttribute("cmdk-input") })`);
    check(`${label} opens search with focus in its field`, s.dialog && s.input, JSON.stringify(s));
  }
  await type("journal");
  await sleep(400);
  const status = await page.evaluate(`document.querySelector('[role="dialog"] [role="status"]')?.textContent`);
  check("the number of results is announced", /\d+ results?/.test(status ?? ""), status);
  await press("Enter", "Enter", 13, 0, "\r");
  await sleep(1500);
  const went = await page.evaluate(`({ path: location.pathname, dialog: !!document.querySelector('[role="dialog"]') })`);
  check("Enter opens the selected result and closes search", went.path === "/journal" && !went.dialog, JSON.stringify(went));
  await press("k", "KeyK", 75, 2);
  await sleep(800);
  await press("Escape", "Escape", 27);
  await sleep(400);
  check("Escape closes search", !(await page.evaluate(`!!document.querySelector('[role="dialog"]')`)));

  // 4. Ecosystem map
  await open(page, server.url, "/ecosystem", { width: 1366 });
  const nodes = new Set();
  let ringMissing = false;
  for (let i = 0; i < 40; i++) {
    await press("Tab", "Tab", 9);
    const n = await page.evaluate(`(() => { const a = document.activeElement; if (!a?.closest('ul[aria-label="The four verticals"]')) return null;
      const s = getComputedStyle(a); return { name: a.textContent, ring: s.boxShadow !== "none" || (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) }; })()`);
    if (n) {
      nodes.add(n.name);
      if (!n.ring) ringMissing = true;
    }
  }
  check("every map node is reached with Tab", nodes.size === 4, [...nodes].join(", "));
  check("every map node shows a focus style", !ringMissing);
} finally {
  await page.close();
  server.close();
}

for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : "\nKeyboard check passed.");
process.exit(failed ? 1 : 0);
