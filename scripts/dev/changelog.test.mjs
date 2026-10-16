// The public changelog (src/content/changelog.ts) is generated, up to date and free of private matters.
//
//   node --experimental-strip-types --test scripts/dev/changelog.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("src/content/changelog.ts is what scripts/dev/changelog.mjs produces", () => {
  execFileSync("node", ["scripts/dev/changelog.mjs", "--check"], { cwd: root, stdio: "pipe" });
});

test("the changelog names no private app, workspace, owner or security matter", () => {
  const text = readFileSync(join(root, "src/content/changelog.ts"), "utf8").toLowerCase();
  const host = readFileSync(join(root, "src/config/trades.ts"), "utf8").match(/TRADES_URL\s*=\s*"https:\/\/([^/"]+)/)?.[1];
  for (const word of [host.split(".")[0], "trades", "workspace", "owner", "super", "admin", "security", "token", "secret", "rls"]) {
    assert.ok(!text.includes(word), `the changelog mentions "${word}"`);
  }
});
