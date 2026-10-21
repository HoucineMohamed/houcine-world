// Early fetching of page code (src/routes/prefetchTarget.ts): public pages only, never a private area.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { PREFETCHABLE, prefetchTarget, IDLE_PREFETCH } = await import("../../src/routes/prefetchTarget.ts");
const { MANIFEST } = await import("../../src/routes/manifest.ts");
const O = "https://houcine.world";

test("public pages and content entries are matched", () => {
  assert.equal(prefetchTarget("/about", O), "/about");
  assert.equal(prefetchTarget(`${O}/work/`, O), "/work");
  assert.equal(prefetchTarget("/work/some-case?x=1#top", O), "/work/:slug");
  assert.equal(prefetchTarget("/journal/a-post", O), "/journal/:slug");
  assert.equal(prefetchTarget("/", O), "/");
});

test("private areas, owner pages, unknown and outside addresses are never matched", () => {
  for (const href of ["/workspace", "/workspace/ecosystem", "/workspace/x/dashboard", "/admin", "/admin/login", "/auth/callback", "/workspace/login", "/nope", "/work/a/b", "/work/", "https://example.com/about", "mailto:a@b.c", "javascript:void(0)", "http://["]) {
    const t = prefetchTarget(href, O);
    assert.ok(t === null || (href === "/work/" && t === "/work"), `${href} matched ${t}`);
  }
  assert.equal(prefetchTarget("/work/a/b", O), null);
  assert.equal(prefetchTarget("https://example.com/about", O), null);
});

test("nothing owner-only or private is prefetchable", () => {
  for (const p of PREFETCHABLE) {
    const r = MANIFEST.find((m) => m.path === p);
    assert.ok(r && !r.ownerOnly, p);
    assert.ok(!/^\/(workspace|admin|auth)(\/|$)/.test(p), p);
  }
  for (const p of IDLE_PREFETCH) assert.ok(PREFETCHABLE.includes(p), p);
});

test("every prefetchable path has a loader, and App.tsx loads pages through the same loaders", () => {
  const loaders = readFileSync(new URL("../../src/routes/pageLoaders.ts", import.meta.url), "utf8");
  for (const p of PREFETCHABLE) assert.ok(loaders.includes(`"${p}": () => import(`), `no loader for ${p}`);
  assert.doesNotMatch(loaders, /import\("[^"]*(workspace|Admin|AuthCallback|owner)/i, "a private page has a loader");
  const app = readFileSync(new URL("../../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /React\.lazy\(PAGE_LOADERS\["\/"\]\)/);
  assert.match(app, /^\s*usePrefetch\(\);/m, "src/App.tsx mounts usePrefetch()");
  const hook = readFileSync(new URL("../../src/lib/prefetch.ts", import.meta.url), "utf8");
  assert.match(hook, /saveData/, "data saver is respected");
  assert.match(hook, /link\.target === "_blank" \|\| link\.hasAttribute\("download"\)/, "new-tab and download links are skipped");
});
