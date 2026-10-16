// Checks that a fixed set of files (program item 0.6: trivial lint fixes) have zero ESLint
// errors. Scope is deliberately narrow: only errors that are a pure style/type-level change with
// no behavior difference, and only in files outside the HARD-RULE/critical-path list (so
// src/integrations/supabase/previewAuthStorage.ts, which also has a lint error, is excluded on
// purpose and left untouched -- never edit src/integrations/supabase/**).
//
//   node --experimental-strip-types --test scripts/test/lint-trivial-fixes.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FIXED_FILES = [
  "src/components/ui/command.tsx",
  "src/components/ui/textarea.tsx",
  "src/pages/Dev.tsx",
  "src/pages/Reads.tsx",
  "tailwind.config.ts",
];

test("the five trivially-fixed files have zero ESLint errors", () => {
  const run = spawnSync("npx", ["eslint", "--format", "json", ...FIXED_FILES], { cwd: root, encoding: "utf8" });
  const results = JSON.parse(run.stdout);
  const withErrors = results.filter((r) => r.errorCount > 0);
  assert.deepEqual(
    withErrors.map((r) => r.filePath.replace(root + "/", "")),
    [],
    `files still reporting ESLint errors: ${JSON.stringify(withErrors.map((r) => r.messages), null, 2)}`,
  );
});
