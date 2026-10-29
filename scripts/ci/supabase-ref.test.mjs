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

test("build: on a Netlify production build all three values must be set and clean; elsewhere having none is only a warning", () => {
  const url = `https://${OK}.supabase.co`;
  // a fake, key-shaped value built at run time (never a real key)
  const key = ["sb", "publishable", "x".repeat(24)].join("_");
  const prod = { NETLIFY: "true", CONTEXT: "production" };
  const full = { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_SUPABASE_PROJECT_ID: OK };
  assert.deepEqual(G.checkBuildEnv({ ...prod, ...full }).errors, []);
  assert.deepEqual(G.checkBuildEnv({ ...prod, ...full, VITE_SUPABASE_URL: `${url}/` }).errors, []);
  assert.deepEqual(G.checkBuildEnv(full).errors, []);
  // production with nothing set: each of the three is named
  assert.deepEqual(G.checkBuildEnv(prod).errors, [
    "VITE_SUPABASE_URL is not set",
    "VITE_SUPABASE_PUBLISHABLE_KEY is not set",
    "VITE_SUPABASE_PROJECT_ID is not set",
  ]);
  for (const name of Object.keys(full)) {
    const errors = G.checkBuildEnv({ ...prod, ...full, [name]: "" }).errors;
    assert.deepEqual(errors, [`${name} is not set`], name);
  }
  assert.equal(G.checkBuildEnv({ ...prod, ...full, VITE_SUPABASE_URL: `https://${OTHER}.supabase.co` }).errors.length, 1);
  const preview = G.checkBuildEnv({ NETLIFY: "true", CONTEXT: "deploy-preview" });
  assert.deepEqual(preview.errors, []);
  assert.equal(preview.warnings.length, 1);
  // once any value is set (preview or not), all three are required and checked
  assert.ok(
    G.checkBuildEnv({ NETLIFY: "true", CONTEXT: "deploy-preview", VITE_SUPABASE_URL: `https://${OTHER}.supabase.co` }).errors.length >= 1,
  );
  assert.ok(G.checkBuildEnv({ VITE_SUPABASE_URL: `https://${OTHER}.supabase.co` }).errors.some((e) => /must point at/.test(e)));
  assert.deepEqual(G.checkBuildEnv({ ...full, VITE_SUPABASE_PROJECT_ID: OTHER }).errors, [
    `VITE_SUPABASE_PROJECT_ID is '${OTHER}', expected '${OK}'`,
  ]);
  assert.equal(G.checkBuildEnv({ ...full, VITE_SUPABASE_URL: `https://${OK}.supabase.co.${OTHER}.supabase.co` }).errors.length, 1);
  assert.deepEqual(G.checkBuildEnv({ VITE_SUPABASE_PUBLISHABLE_KEY: key }).errors, [
    "VITE_SUPABASE_URL is not set",
    "VITE_SUPABASE_PROJECT_ID is not set",
  ]);
  const off = G.checkBuildEnv({});
  assert.deepEqual(off.errors, []);
  assert.equal(off.warnings.length, 1);
});

test("build: a value pasted with its .env quoting, or with whitespace, fails; the URL must be exactly the project's https address", () => {
  const url = `https://${OK}.supabase.co`;
  const key = ["sb", "publishable", "y".repeat(24)].join("_");
  const prod = { NETLIFY: "true", CONTEXT: "production" };
  const full = { VITE_SUPABASE_URL: url, VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_SUPABASE_PROJECT_ID: OK };
  const urlErrors = (u) => G.checkBuildEnv({ ...prod, ...full, VITE_SUPABASE_URL: u }).errors;
  const dirty = /contains a quote or whitespace/;
  // the incident: a leading double quote copied from a .env line (the old check passed it: the ref is in the string)
  assert.match(urlErrors(`"${url}`).join(), dirty);
  assert.match(urlErrors(`"${url}"`).join(), dirty);
  assert.match(urlErrors(`'${url}'`).join(), dirty);
  assert.match(urlErrors(`${url}\n`).join(), dirty);
  assert.match(urlErrors(`${url}\r\n`).join(), dirty);
  assert.match(urlErrors(` ${url}`).join(), dirty);
  assert.match(urlErrors(`${url} `).join(), dirty);
  // wrong host, wrong scheme, not a URL, extra parts
  assert.match(urlErrors(`https://${OTHER}.supabase.co`).join(), /must point at/);
  assert.match(urlErrors(`https://${OK}.supabase.co.evil.example`).join(), /must point at/);
  assert.match(urlErrors(`https://evil.example/${OK}.supabase.co`).join(), /must point at/);
  assert.match(urlErrors(`https://${OK}.supabase.com`).join(), /must point at/);
  assert.match(urlErrors(`http://${OK}.supabase.co`).join(), /https/);
  assert.match(urlErrors(`${OK}.supabase.co`).join(), /not a valid URL/);
  assert.match(urlErrors("not a url").join(), dirty);
  assert.match(urlErrors(`https://${OK}.supabase.co/rest/v1`).join(), /bare project address/);
  assert.match(urlErrors(`https://${OK}.supabase.co:8443`).join(), /bare project address/);
  assert.match(urlErrors(`https://u:p@${OK}.supabase.co`).join(), /bare project address/);
  assert.match(urlErrors(`https://${OK}.supabase.co/?x=1`).join(), /bare project address/);
  // the key and the project id: quotes or whitespace fail, the key itself is never in a message
  for (const bad of [`"${key}`, `${key}"`, `'${key}'`, `${key}\n`, ` ${key}`, `${key.slice(0, 10)} ${key.slice(10)}`]) {
    const errors = G.checkBuildEnv({ ...prod, ...full, VITE_SUPABASE_PUBLISHABLE_KEY: bad }).errors;
    assert.equal(errors.length, 1);
    assert.match(errors[0], /VITE_SUPABASE_PUBLISHABLE_KEY contains a quote or whitespace/);
    assert.ok(!errors[0].includes(key.slice(0, 12)), "the key is never printed");
  }
  for (const bad of [`"${OK}`, `${OK}"`, `${OK}\n`, ` ${OK}`]) {
    const errors = G.checkBuildEnv({ ...prod, ...full, VITE_SUPABASE_PROJECT_ID: bad }).errors;
    assert.deepEqual(errors, ["VITE_SUPABASE_PROJECT_ID contains a quote or whitespace (paste the value only, without quotes)"]);
  }
});

test("build: the command never prints the publishable key, on success or failure", () => {
  const key = ["sb", "publishable", "z".repeat(24)].join("_");
  const run = (extra) => {
    try {
      return execFileSync("node", ["scripts/ci/supabase-ref.mjs", "build"], {
        cwd: new URL("../../", import.meta.url),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { PATH: process.env.PATH, NETLIFY: "true", CONTEXT: "production", ...extra },
      });
    } catch (e) {
      return `${e.stdout}${e.stderr}FAILED`;
    }
  };
  const ok = run({ VITE_SUPABASE_URL: `https://${OK}.supabase.co`, VITE_SUPABASE_PUBLISHABLE_KEY: key, VITE_SUPABASE_PROJECT_ID: OK });
  assert.match(ok, /OK: the Supabase project is/);
  const bad = run({ VITE_SUPABASE_URL: `"https://${OK}.supabase.co`, VITE_SUPABASE_PUBLISHABLE_KEY: `"${key}"`, VITE_SUPABASE_PROJECT_ID: OK });
  assert.match(bad, /FAILED/);
  for (const out of [ok, bad]) assert.ok(!out.includes(key.slice(0, 14)), "the key is never printed");
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
