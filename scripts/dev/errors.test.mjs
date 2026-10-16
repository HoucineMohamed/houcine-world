// Error states: which failures show "This page could not load", and how the route boundary resets.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { isChunkLoadError } = await import("../../src/lib/chunkError.ts");

test("a page file that cannot be downloaded is recognised in every main browser", () => {
  for (const m of [
    "Failed to fetch dynamically imported module: https://houcine.world/assets/Work-abc.js", // Chrome
    "error loading dynamically imported module: https://houcine.world/assets/Work-abc.js", // Firefox
    "Importing a module script failed.", // Safari
    "Unable to preload CSS for /assets/Work-abc.css", // Vite, after a deploy
    "Loading chunk 12 failed.",
  ]) assert.equal(isChunkLoadError(new Error(m)), true, m);
});

test("other errors are not mistaken for a download failure", () => {
  for (const e of [new Error("Cannot read properties of undefined"), "Failed to fetch dynamically imported module", null, undefined]) {
    assert.equal(isChunkLoadError(e), false, String(e));
  }
});

test("the boundary around every route resets in place, never by remounting the routes", () => {
  const app = readFileSync(new URL("../../src/App.tsx", import.meta.url), "utf8");
  assert.match(app, /<PageErrorBoundary resetKey=\{pathname\}>/);
  assert.doesNotMatch(app, /<PageErrorBoundary key=/, "a key would remount the workspace guards on every navigation");
  const shell = readFileSync(new URL("../../src/components/PublicShell.tsx", import.meta.url), "utf8");
  assert.match(shell, /prev\.resetKey !== this\.props\.resetKey/);
});
