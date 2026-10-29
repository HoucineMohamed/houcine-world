// The Supabase project guard (.github/workflows/guard-supabase-project.yml and the build). The site's Supabase settings are
// baked into the bundle at build time, and an automated tool has twice swapped them for another, inaccessible project. Since
// `.env` is no longer in git (the values live in Netlify), the guard checks two places:
//   repo:  supabase/config.toml must name the expected project; a `.env` that is still present must too; and no tracked file
//          (tests aside) may name the host of any other project.
//   build: the values the build receives (on Netlify: the site's environment variables) must be clean and name the expected
//          project: the URL exactly https://<ref>.supabase.co, the key and project id present, with no quote or whitespace.
//          On Netlify's production build all three are required; elsewhere (CI, deploy previews) having none is a warning.
// FAIL CLOSED: an unreadable config file, a missing project id or any other project means failure.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const EXPECTED_REF = "pcdkfpardswfwoiclvtm";
const HOST = /\b([a-z0-9]{20})\.supabase\.co\b/g;

/** Every project ref named as a `<ref>.supabase.co` host in the text. */
export function refsIn(text) {
  return [...new Set([...String(text).matchAll(HOST)].map((m) => m[1]))];
}

/** supabase/config.toml: `project_id` must be present and equal the expected ref. */
export function checkConfigToml(text, expected = EXPECTED_REF) {
  if (typeof text !== "string") return ["supabase/config.toml is missing or unreadable"];
  const m = text.match(/^project_id\s*=\s*"([^"]*)"/m);
  if (!m) return ["supabase/config.toml has no project_id"];
  return m[1] === expected ? [] : [`supabase/config.toml project_id is '${m[1]}', expected '${expected}'`];
}

const value = (text, name) => {
  const m = String(text).match(new RegExp(`^${name}\\s*=\\s*"?([^"\\r\\n]*)"?\\s*$`, "m"));
  return m ? m[1].trim() : "";
};

/** A `.env` file (only when one exists): the same checks the guard made before `.env` left git. */
export function checkEnvFile(text, expected = EXPECTED_REF) {
  const errors = [];
  const id = value(text, "VITE_SUPABASE_PROJECT_ID");
  const url = value(text, "VITE_SUPABASE_URL");
  if (!id) errors.push(".env has no VITE_SUPABASE_PROJECT_ID");
  else if (id !== expected) errors.push(`.env VITE_SUPABASE_PROJECT_ID is '${id}', expected '${expected}'`);
  if (!url) errors.push(".env has no VITE_SUPABASE_URL");
  else if (!url.includes(expected)) errors.push(`.env VITE_SUPABASE_URL does not name '${expected}'`);
  return errors;
}

/** A tracked file must not name the host of another project. Test files keep their fake hosts. */
export function checkTrackedFile(name, text, expected = EXPECTED_REF) {
  if (/\.test\.[cm]?[jt]sx?$/.test(name)) return [];
  return refsIn(text)
    .filter((r) => r !== expected)
    .map((r) => `${name} names the Supabase project '${r}', expected '${expected}'`);
}

// A quote, a backtick or any whitespace (a line break included) in a value: the sign of a value pasted together with its
// `.env` quoting. Vite bakes the value in as it is, and supabase-js then throws at start-up ("Invalid supabaseUrl") before
// anything is drawn, which is how the site went blank once.
const DIRTY = /["'`\s]/;

/** VITE_SUPABASE_URL: exactly `https://<expected>.supabase.co` (one optional trailing slash), nothing pasted around it. */
export function checkSupabaseUrl(url, expected = EXPECTED_REF) {
  if (DIRTY.test(url)) return ["VITE_SUPABASE_URL contains a quote or whitespace (paste the value only, without quotes)"];
  let u;
  try {
    u = new URL(url);
  } catch {
    return ["VITE_SUPABASE_URL is not a valid URL"];
  }
  const errors = [];
  if (u.protocol !== "https:") errors.push("VITE_SUPABASE_URL must start with https://");
  if (u.hostname !== `${expected}.supabase.co`) errors.push(`VITE_SUPABASE_URL must point at ${expected}.supabase.co`);
  if (u.username || u.password || u.port || u.search || u.hash || u.pathname !== "/")
    errors.push("VITE_SUPABASE_URL must be the bare project address, with no path, port, query or credentials");
  return errors;
}

/** The values a build receives. They are checked whenever any of them is set, and always on Netlify's production build (where
 *  all three are required). A build with none of them outside Netlify production (CI, deploy previews) only warns. The
 *  publishable key is never printed. */
export function checkBuildEnv(env, expected = EXPECTED_REF) {
  const errors = [];
  const warnings = [];
  const url = env.VITE_SUPABASE_URL ?? "";
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
  const id = env.VITE_SUPABASE_PROJECT_ID ?? "";
  const production = env.NETLIFY === "true" && env.CONTEXT === "production";
  if (!production && url === "" && key === "" && id === "") {
    warnings.push("the VITE_SUPABASE_* values are not set (not a Netlify production build: allowed)");
    return { errors, warnings };
  }
  if (url === "") errors.push("VITE_SUPABASE_URL is not set");
  else errors.push(...checkSupabaseUrl(url, expected));
  if (key === "") errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is not set");
  else if (DIRTY.test(key)) errors.push("VITE_SUPABASE_PUBLISHABLE_KEY contains a quote or whitespace (paste the value only, without quotes)");
  if (id === "") errors.push("VITE_SUPABASE_PROJECT_ID is not set");
  else if (DIRTY.test(id)) errors.push("VITE_SUPABASE_PROJECT_ID contains a quote or whitespace (paste the value only, without quotes)");
  else if (id !== expected) errors.push(`VITE_SUPABASE_PROJECT_ID is '${id}', expected '${expected}'`);
  return { errors, warnings };
}

function readOrNull(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function repoErrors(expected) {
  const errors = [...checkConfigToml(readOrNull("supabase/config.toml"), expected)];
  if (existsSync(".env")) errors.push(...checkEnvFile(readOrNull(".env") ?? "", expected));
  const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
  for (const f of files) {
    if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|lockb)$/i.test(f)) continue;
    const text = readOrNull(f);
    if (text !== null) errors.push(...checkTrackedFile(f, text, expected));
  }
  return errors;
}

function main() {
  const mode = process.argv[2];
  const expected = process.env.EXPECTED_PROJECT_REF || EXPECTED_REF;
  let errors = [];
  let warnings = [];
  try {
    if (mode === "repo") errors = repoErrors(expected);
    else if (mode === "build") ({ errors, warnings } = checkBuildEnv(process.env, expected));
    else errors = ["usage: supabase-ref.mjs repo|build"];
  } catch {
    errors = ["the Supabase project check could not run"];
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  if (errors.length > 0) {
    for (const e of errors) console.error(`::error::${e}`);
    console.error(`A different Supabase project has broken the live site twice before. Point everything back at '${expected}'.`);
    process.exit(1);
  }
  console.log(`OK: the Supabase project is '${expected}' (${mode}).`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
