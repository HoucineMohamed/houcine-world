// Checks the real .github/critical-paths.txt and .github/content-watchlist.txt:
// every pattern has an example path it must match, every file that exists today for an exact
// pattern is really there, the owner's required entries are present, and ordinary pages stay safe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { matchesGlob, parsePatternList, findCriticalHits } from "./automerge-decision.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const patterns = parsePatternList(readFileSync(join(root, ".github/critical-paths.txt"), "utf8"));
const watchList = parsePatternList(readFileSync(join(root, ".github/content-watchlist.txt"), "utf8"));

/** One example path per pattern. A new pattern without an example fails the first test. */
const EXAMPLES = {
  ".github/**": ".github/workflows/auto-merge.yml",
  "scripts/ci/**": "scripts/ci/automerge-decision.mjs",
  ".env*": ".env.production.local",
  "src/integrations/**": "src/integrations/supabase/client.ts",
  "supabase/**": "supabase/migrations/20260808035658_b003fe84-8413-46dc-af8c-e644d3e9019b.sql",
  "src/lib/supabaseClient.ts": "src/lib/supabaseClient.ts",
  "src/pages/AdminLogin.tsx": "src/pages/AdminLogin.tsx",
  "src/pages/Admin.tsx": "src/pages/Admin.tsx",
  "src/pages/AuthCallback.tsx": "src/pages/AuthCallback.tsx",
  "src/pages/workspace/WorkspaceLogin.tsx": "src/pages/workspace/WorkspaceLogin.tsx",
  "src/hooks/useAuth*": "src/hooks/useAuth.ts",
  "src/hooks/useSession*": "src/hooks/useSession.ts",
  "src/hooks/useMemberships*": "src/hooks/useMemberships.ts",
  "src/hooks/useActiveBrand*": "src/hooks/useActiveBrand.ts",
  "src/lib/roles.ts": "src/lib/roles.ts",
  "src/components/workspace/AuthGuard.tsx": "src/components/workspace/AuthGuard.tsx",
  "src/components/workspace/BrandGuard.tsx": "src/components/workspace/BrandGuard.tsx",
  "src/components/workspace/WorkspaceContext.ts": "src/components/workspace/WorkspaceContext.ts",
  "src/services/memberships.ts": "src/services/memberships.ts",
  "src/services/brands.ts": "src/services/brands.ts",
  "src/pages/workspace/BrandSettings.tsx": "src/pages/workspace/BrandSettings.tsx",
  "src/pages/workspace/PlatformCredentials.tsx": "src/pages/workspace/PlatformCredentials.tsx",
  "src/components/workspace/settings/**": "src/components/workspace/settings/ConnectedAccountsCard.tsx",
  "src/services/connectedAccounts.ts": "src/services/connectedAccounts.ts",
  "src/services/platformCredentials.ts": "src/services/platformCredentials.ts",
  "src/pages/BookingForm.tsx": "src/pages/BookingForm.tsx",
  "src/pages/workspace/BrandBookings.tsx": "src/pages/workspace/BrandBookings.tsx",
  "src/services/bookings.ts": "src/services/bookings.ts",
  "src/hooks/useFormSubmission*": "src/hooks/useFormSubmission.ts",
  "src/hooks/useAnalytics*": "src/hooks/useAnalytics.ts",
  "src/lib/analytics.ts": "src/lib/analytics.ts",
  "src/services/analytics.ts": "src/services/analytics.ts",
  "src/components/owner/**": "src/components/owner/card/WorkspaceEntries.tsx",
  "src/config/trades.ts": "src/config/trades.ts",
  "src/config/publicTeaser.ts": "src/config/publicTeaser.ts",
  "package.json": "package.json",
  "package-lock.json": "package-lock.json",
  "bun.lock": "bun.lock",
  "bun.lockb": "bun.lockb",
  "vite.config.ts": "vite.config.ts",
  "tsconfig*.json": "tsconfig.app.json",
  "netlify.toml": "netlify.toml",
  "netlify/functions/**": "netlify/functions/assert/core.mjs",
  "public/_redirects": "public/_redirects",
  "public/_headers": "public/_headers",
  "index.html": "index.html",
};

/** Files that may legitimately not exist yet (protected in advance). */
const MAY_NOT_EXIST = new Set([".env.production.local", "netlify.toml", "public/_headers"]);

test("every critical pattern has an example that it matches", () => {
  for (const pattern of patterns) {
    assert.ok(pattern in EXAMPLES, `add an example path for the new pattern "${pattern}"`);
    assert.equal(matchesGlob(EXAMPLES[pattern], pattern), true, `"${pattern}" must match "${EXAMPLES[pattern]}"`);
  }
  for (const pattern of Object.keys(EXAMPLES)) {
    assert.ok(patterns.includes(pattern), `example for "${pattern}" but the pattern is not in the file`);
  }
});

test("the example files exist in the repository (no typo in a path)", () => {
  for (const [pattern, example] of Object.entries(EXAMPLES)) {
    if (MAY_NOT_EXIST.has(example)) continue;
    assert.ok(existsSync(join(root, example)), `${example} (for "${pattern}") does not exist`);
  }
});

test("the owner's required entries are present", () => {
  for (const required of [
    ".github/**", ".env*", "src/integrations/**", "supabase/**", "src/hooks/useMemberships*",
    "src/components/owner/**", "src/config/trades.ts", "package.json", "package-lock.json",
    "netlify.toml", "netlify/functions/**", "public/_redirects", "public/_headers", "index.html",
  ]) {
    assert.ok(patterns.includes(required), `${required} must be a critical path`);
  }
  assert.ok(matchesGlob("src/integrations/supabase/types.ts", "src/integrations/**"));
});

test("ordinary public pages and docs are not critical", () => {
  const files = ["src/pages/Manages.tsx", "src/pages/Privacy.tsx", "docs/automation.md", "public/sitemap.xml", "src/components/Footer.tsx"]
    .map((filename) => ({ filename }));
  assert.deepEqual(findCriticalHits(files, patterns), []);
});

test("the content watch-list holds exactly the agreed identifiers", () => {
  assert.deepEqual([...watchList].sort(), ["platform_role", "service_role", "super_admin", "supabase.auth"].sort());
});
