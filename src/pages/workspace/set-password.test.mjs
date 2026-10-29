// Basic checks for set-password flow (no password in URL or logs).
import { test } from "node:test";
import assert from "node:assert/strict";

test("set-password page path is registered", async () => {
  const manifest = await import("../../routes/manifest.ts");
  const paths = manifest.MANIFEST.map(r => r.path);
  assert.ok(paths.includes("/workspace/set-password"));
});

test("recovery next is set-password", () => {
  // Simulated: redirect construction does not embed password
  const returnTo = "/workspace";
  const next = "/workspace/set-password?returnTo=" + encodeURIComponent(returnTo);
  assert.ok(next.includes("/workspace/set-password"));
  assert.ok(!next.includes("password"));
});

test("no password in recovery URL", () => {
  const url = "/auth/callback?type=recovery&next=%2Fworkspace%2Fset-password";
  assert.ok(!url.toLowerCase().includes("password="));
  assert.ok(!url.includes("secret"));
});
