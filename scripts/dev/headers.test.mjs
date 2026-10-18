// The security headers in public/_headers (docs/owner-review-guide.md, topic 5).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { siteHeaders } = await import("./lib/browser.mjs");
const text = readFileSync(new URL("../../public/_headers", import.meta.url), "utf8");
const h = siteHeaders(new URL("../../public", import.meta.url).pathname);
const directives = (policy) => Object.fromEntries(policy.split(";").map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));

test("the enforced policy: no framing, no plugins, forms and base address on the site only", () => {
  const p = directives(h["content-security-policy"]);
  assert.deepEqual(p["frame-ancestors"], ["'none'"]);
  assert.deepEqual(p["object-src"], ["'none'"]);
  assert.deepEqual(p["base-uri"], ["'self'"]);
  assert.deepEqual(p["form-action"], ["'self'"]);
  assert.equal(h["x-frame-options"], "DENY");
  assert.equal(h["x-content-type-options"], "nosniff");
  assert.equal(h["referrer-policy"], "strict-origin-when-cross-origin");
  for (const f of ["camera=()", "microphone=()", "geolocation=()", "payment=()"]) assert.ok(h["permissions-policy"].includes(f), f);
});

test("HSTS is safe: one year, no subdomains, no preload", () => {
  const line = text.split("\n").find((l) => l.trim().startsWith("Strict-Transport-Security:"));
  assert.ok(line, "HSTS is set");
  assert.match(line, /max-age=31536000\s*$/);
  assert.doesNotMatch(line, /includeSubDomains|preload/i);
});

test("the report-only policy names only hosts the site already uses, and no wildcard script source", () => {
  const p = directives(h["content-security-policy-report-only"]);
  const KNOWN = new Set([
    "https://pcdkfpardswfwoiclvtm.supabase.co", "wss://pcdkfpardswfwoiclvtm.supabase.co",
    "https://fonts.googleapis.com", "https://fonts.gstatic.com",
    "https://us.i.posthog.com", "https://eu.i.posthog.com", "https://us-assets.i.posthog.com", "https://eu-assets.i.posthog.com",
    "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://w.soundcloud.com",
  ]);
  for (const [name, values] of Object.entries(p)) {
    for (const v of values) {
      if (v.startsWith("'") || ["data:", "blob:", "https:"].includes(v)) continue;
      assert.ok(KNOWN.has(v), `${name} names a new host: ${v}`);
    }
  }
  for (const v of p["script-src"]) assert.ok(!["https:", "*", "'unsafe-inline'", "'unsafe-eval'", "data:"].includes(v), `script-src ${v}`);
  assert.ok(!("frame-ancestors" in p), "frame-ancestors is ignored in a report-only policy (it is enforced above)");
});

test("no header for a single path weakens the site-wide rule", () => {
  const rules = text.split("\n").filter((l) => l && !l.startsWith("#") && !/^\s/.test(l));
  assert.deepEqual(rules, ["/*"]);
});
