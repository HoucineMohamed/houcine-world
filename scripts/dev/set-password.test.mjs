// Static checks for the "choose a new password" page (no packages needed).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const page = read("src/pages/workspace/SetPassword.tsx");
const login = read("src/pages/workspace/WorkspaceLogin.tsx");
const callback = read("src/pages/AuthCallback.tsx");
const app = read("src/App.tsx");
const manifest = read("src/routes/manifest.ts");

test("the set-password route is registered in the app and the manifest", () => {
  assert.match(app, /\/workspace\/set-password/);
  assert.match(manifest, /path: "\/workspace\/set-password"/);
});

test("the page saves the password with updateUser and needs a live session", () => {
  assert.match(page, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(page, /if \(!session\)/);
});

test("the page never logs or echoes the password", () => {
  assert.doesNotMatch(page, /console\./);
  assert.doesNotMatch(page, /toast\.[a-z]+\([^)]*\bpassword\b[^)]*\)/);
  assert.doesNotMatch(page, /navigate\([^)]*password/);
});

test("the page sends only same-site return paths", () => {
  assert.match(page, /startsWith\("\/"\) && !requested\.startsWith\("\/\/"\)/);
});

test("the reset email lands on the set-password page", () => {
  assert.match(login, /resetPasswordForEmail/);
  assert.match(login, /\/workspace\/set-password\?returnTo=/);
});

test("a recovery link always routes to the set-password page", () => {
  assert.match(callback, /=== "recovery"/);
  assert.match(callback, /"\/workspace\/set-password"/);
});

test("the login page shows the real logo image, not a text letter", () => {
  assert.match(login, /import logoH from "@\/assets\/logo-h\.png"/);
  assert.match(login, /<img src=\{logoH\}/);
  assert.doesNotMatch(login, />H<\/Link>/);
});
