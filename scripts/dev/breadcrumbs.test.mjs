// Breadcrumb trails (src/routes/breadcrumbs.ts): public pages only, labels from the manifest and content.
import { test } from "node:test";
import assert from "node:assert/strict";

const { breadcrumbTrail } = await import("../../src/routes/breadcrumbs.ts");
const { CONTENT_PAGES, MANIFEST } = await import("../../src/routes/manifest.ts");

test("a top-level page: Home, then the page", () => {
  assert.deepEqual(breadcrumbTrail("/team"), [{ path: "/", label: "Home" }, { path: "/team", label: "Team" }]);
  assert.deepEqual(breadcrumbTrail("/brand-kit/"), [{ path: "/", label: "Home" }, { path: "/brand-kit", label: "Brand kit" }]);
});

test("a content entry: Home, its list, then the entry", () => {
  for (const page of CONTENT_PAGES) {
    const trail = breadcrumbTrail(page.path);
    assert.equal(trail.length, 3, page.path);
    assert.equal(trail[1].path, `/${page.path.split("/")[1]}`);
    assert.equal(trail[2].label, page.title.split(" | ")[0]);
  }
});

test("no trail for the home page, private, owner-only, unknown or template addresses", () => {
  const none = ["/", "/workspace", "/workspace/ecosystem", "/admin", "/auth/callback", "/no-such-page", "/work/:slug", "/work/not-a-real-entry", "/journal/a/b"];
  for (const p of none) assert.equal(breadcrumbTrail(p), null, p);
  for (const r of MANIFEST.filter((m) => m.ownerOnly || !m.indexable)) assert.equal(breadcrumbTrail(r.path), null, r.path);
});

test("every label is plain text without the site name", () => {
  for (const r of MANIFEST.filter((m) => m.indexable && m.path !== "/")) {
    const trail = breadcrumbTrail(r.path);
    assert.ok(trail, r.path);
    for (const c of trail) assert.ok(c.label && !c.label.includes("|"), `${r.path}: ${c.label}`);
  }
});

test("the public page layouts show the breadcrumb and the back-to-top button", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["src/components/service/ServicePage.tsx", "src/components/legal/LegalPageLayout.tsx"]) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    assert.match(src, /<Breadcrumbs /, f);
    assert.match(src, /<BackToTop \/>/, f);
  }
  const btn = readFileSync(new URL("../../src/components/BackToTop.tsx", import.meta.url), "utf8");
  assert.match(btn, /type="button"/);
  assert.match(btn, /sr-only">Back to top/);
  assert.match(btn, /prefers-reduced-motion: reduce/);
  assert.match(btn, /h-11 w-11/, "the button keeps a 44 px target");
  const crumbs = readFileSync(new URL("../../src/components/Breadcrumbs.tsx", import.meta.url), "utf8");
  assert.match(crumbs, /aria-label="Breadcrumb"/);
  assert.match(crumbs, /aria-current="page"/);
});
