// The browser's start-up check of the Supabase settings (src/integrations/supabase/configCheck.ts) and its use in src/main.tsx.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { supabaseConfigProblems: check } = await import("../../src/integrations/supabase/configCheck.ts");
const URL_OK = "https://pcdkfpardswfwoiclvtm.supabase.co";
// a fake, key-shaped value built at run time (never a real key)
const KEY = ["sb", "publishable", "k".repeat(24)].join("_");

test("clean settings pass", () => {
  assert.deepEqual(check(URL_OK, KEY), []);
  assert.deepEqual(check(`${URL_OK}/`, KEY), []);
});

test("a value pasted with its quoting or with whitespace is refused, never crashes", () => {
  for (const u of [`"${URL_OK}`, `"${URL_OK}"`, `'${URL_OK}'`, `${URL_OK}\n`, ` ${URL_OK}`]) assert.deepEqual(check(u, KEY), ["url-dirty"], u);
  for (const k of [`"${KEY}`, `${KEY}"`, `${KEY}\n`, ` ${KEY}`]) assert.deepEqual(check(URL_OK, k), ["key-dirty"]);
});

test("missing, invalid or plain-http settings are refused", () => {
  assert.deepEqual(check(undefined, undefined), ["url-missing", "key-missing"]);
  assert.deepEqual(check("", KEY), ["url-missing"]);
  assert.deepEqual(check("pcdkfpardswfwoiclvtm.supabase.co", KEY), ["url-invalid"]);
  assert.deepEqual(check("http://pcdkfpardswfwoiclvtm.supabase.co", KEY), ["url-not-https"]);
  assert.deepEqual(check(URL_OK, ""), ["key-missing"]);
});

test("the reasons never contain the values", () => {
  const out = JSON.stringify(check(`"${URL_OK}`, `"${KEY}`));
  assert.ok(!out.includes("pcdkf") && !out.includes(KEY.slice(0, 12)));
});

test("the entry checks the settings before it loads the app, and shows the error screen instead of a blank page", () => {
  const main = readFileSync(new URL("../../src/main.tsx", import.meta.url), "utf8");
  assert.ok(!/^import App\b/m.test(main), "App is not imported statically (its Supabase client would throw first)");
  assert.ok(!/integrations\/supabase\/client|lib\/supabaseClient/.test(main), "the entry does not load the client itself");
  const checkAt = main.indexOf("supabaseConfigProblems(");
  const appAt = main.indexOf('import("./App.tsx")');
  assert.ok(checkAt > 0 && appAt > checkAt, "the check runs before the app is loaded");
  assert.match(main, /Configuration error, please contact the owner/);
});
