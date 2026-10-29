// The Supabase project guard (scripts/ci/supabase-ref.mjs) and the workflow that runs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const G = await import("./supabase-ref.mjs");
const OK = G.EXPECTED_REF;
const OTHER = "uxixfhthdgwxqfltvudt";
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("config.toml: the expected project passes; another, a missing id or a missing file fails", () => {
  assert.deepEqual(G.checkConfigToml(`project_id = "${OK}"\n`), []);
  assert.equal(G.checkConfigToml(`project_id = "${OTHER}"\n`).length, 1);
  assert.equal(G.checkConfigToml(`[api]\nport = 1\n`).length, 1);
  assert.equal(G.checkConfigToml(null).length, 1);
});

test(".env, when present, gets the same checks as before (quoted or not)", () => {
  assert.deepEqual(G.checkEnvFile(`VITE_SUPABASE_PROJECT_ID="${OK}"\nVITE_SUPABASE_URL="https://${OK}.supabase.co"\n`), []);
  assert.deepEqual(G.checkEnvFile(`VITE_SUPABASE_PROJECT_ID=${OK}\nVITE_SUPABASE_URL=https://${OK}.supabase.co\n`), []);
  assert.equal(G.checkEnvFile(`VITE_SUPABASE_PROJECT_ID="${OTHER}"\nVITE_SUPABASE_URL="https://${OTHER}.supabase.co"\n`).length, 2);
  assert.equal(G.checkEnvFile("").length, 2);
});

test("tracked files: another project's host fails, the expected one passes, test fixtures are skipped", () => {
  assert.deepEqual(G.checkTrackedFile("src/x.ts", `const u = "https://${OK}.supabase.co";`), []);
  assert.equal(G.checkTrackedFile("src/x.ts", `const u = "https://${OTHER}.supabase.co";`).length, 1);
  assert.equal(G.checkTrackedFile("public/_headers", `connect-src wss://${OTHER}.supabase.co`).length, 1);
  assert.deepEqual(G.checkTrackedFile("src/a.test.mjs", `https://${OTHER}.supabase.co`), []);
  assert.deepEqual(G.checkTrackedFile("docs/x.md", `the old project ${OTHER} broke the site`), []);
});

test("build: on Netlify the URL must be set and point at the project; elsewhere a missing URL is only a warning", () => {
  const url = `https://${OK}.supabase.co`;
  assert.deepEqual(G.checkBuildEnv({ NETLIFY: "true", VITE_SUPABASE_URL: url, VITE_SUPABASE_PROJECT_ID: OK }).errors, []);
  assert.equal(G.checkBuildEnv({ NETLIFY: "true" }).errors.length, 1);
  assert.equal(G.checkBuildEnv({ NETLIFY: "true", VITE_SUPABASE_URL: `https://${OTHER}.supabase.co` }).errors.length, 1);
  assert.equal(G.checkBuildEnv({ VITE_SUPABASE_URL: `https://${OTHER}.supabase.co` }).errors.length, 1);
  assert.equal(G.checkBuildEnv({ VITE_SUPABASE_URL: url, VITE_SUPABASE_PROJECT_ID: OTHER }).errors.length, 1);
  assert.equal(G.checkBuildEnv({ VITE_SUPABASE_URL: `https://${OK}.supabase.co.${OTHER}.supabase.co` }).errors.length, 1);
  const off = G.checkBuildEnv({});
  assert.deepEqual(off.errors, []);
  assert.equal(off.warnings.length, 1);
});

test("this repository passes the repo check today", () => {
  const out = execFileSync("node", ["scripts/ci/supabase-ref.mjs", "repo"], {
    cwd: new URL("../../", import.meta.url),
    encoding: "utf8",
  });
  assert.match(out, /OK: the Supabase project is/);
});

test("the workflow runs the repo check with the expected ref; the build runs the build check first", () => {
  const wf = read(".github/workflows/guard-supabase-project.yml");
  assert.match(wf, /EXPECTED_PROJECT_REF: pcdkfpardswfwoiclvtm/);
  assert.match(wf, /run: node scripts\/ci\/supabase-ref\.mjs repo/);
  assert.match(wf, /branches: \[main\]/);
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts.build, /^node scripts\/ci\/supabase-ref\.mjs build && vite build$/);
});
