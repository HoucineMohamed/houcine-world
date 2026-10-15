// Structural, text-level checks for src/App.tsx's route-level code-splitting (program item 0.5):
// every page under src/pages/** should be loaded via React.lazy(() => import(...)), not a static
// top-level import, and the route tree should render inside a <Suspense> fallback. This is a
// source-text check, not a real bundler run — it can't see whether a chunk actually splits at
// build time, only whether the source is written the way that requires it to.
//
// Not wired into any CI workflow yet (scripts/ci/** is a critical path; wiring this up is a
// separate, owner-approved change -- program item "critical (a)"). Run it by hand:
//
//   node --experimental-strip-types --test scripts/test/app-lazy-routes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const appSource = readFileSync(join(root, "src/App.tsx"), "utf8");

// Every page component actually rendered by a <Route> in src/App.tsx, by its module name under
// src/pages/ (kept here, by hand, for the same reason link-check.mjs keeps its own route list --
// this must stay a plain text check, not a JSX parse). Update this list if a route's page module
// changes name; a route pointing at a name missing here would otherwise pass unnoticed.
const PAGE_MODULES = [
  "Index", "AboutMe", "Dev", "Designs", "Reads", "Manages", "LaRosaView", "BookingForm", "AboutDJ",
  "Review", "Terms", "Privacy", "DataDeletion", "Contact", "Ecosystem", "NotFound",
  "Admin", "AdminLogin", "AuthCallback",
  "WorkspaceLogin", "WorkspaceResolver", "BrandSelect", "BrandDashboard", "BrandBookings",
  "BrandNotifications", "BrandAnalytics", "BrandMessages", "BrandSettings", "EcosystemView",
  "PlatformCredentials", "WorkspaceDenied", "WorkspaceNotFound",
];

test("no page module is imported statically from src/pages/**", () => {
  const staticImports = [];
  for (const name of PAGE_MODULES) {
    const re = new RegExp(`^import\\s+${name}\\s+from\\s+["']\\.\\/pages\\/`, "m");
    if (re.test(appSource)) staticImports.push(name);
  }
  assert.deepEqual(staticImports, [], `found static top-level imports for: ${staticImports.join(", ")}`);
});

test("every page module is loaded through React.lazy(() => import(...))", () => {
  const missing = [];
  for (const name of PAGE_MODULES) {
    const re = new RegExp(`${name}\\s*=\\s*React\\.lazy\\(\\s*\\(\\)\\s*=>\\s*import\\(["']\\.\\/pages\\/`);
    if (!re.test(appSource)) missing.push(name);
  }
  assert.deepEqual(missing, [], `not lazy-loaded: ${missing.join(", ")}`);
});

test("the route tree renders inside a <Suspense> with a fallback", () => {
  assert.match(appSource, /\bSuspense\b/, "React's Suspense is not referenced at all");
  assert.match(appSource, /<Suspense[^>]*fallback=/, "<Suspense> has no fallback prop");
});
