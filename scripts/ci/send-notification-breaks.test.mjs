// Deliberate breaks of the send-notification rules: each entry changes ONE piece of
// supabase/functions/send-notification/core.ts in a temporary copy, then runs send-notification.test.mjs
// against that copy. Every break must make the tests FAIL; if one passes, the tests no longer protect that rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../../supabase/functions/send-notification/core.ts"), "utf8");
const testFile = join(here, "send-notification.test.mjs");

export const BREAKS = [
  { name: "< no longer escaped", find: '.replace(/</g, "&lt;")', replace: "" },
  { name: "> no longer escaped", find: '.replace(/>/g, "&gt;")', replace: "" },
  { name: "& no longer escaped", find: 's.replace(/&/g, "&amp;")', replace: "s" },
  { name: "quotes no longer escaped", find: '.replace(/"/g, "&quot;")', replace: "" },
  { name: "message not escaped", find: "${escapeHtml(s.message)}", replace: "${s.message}" },
  { name: "rows not escaped", find: "${escapeHtml(value)}</p>", replace: "${value}</p>" },
  { name: "subject keeps control characters", find: 's.replace(CONTROL, " ")', replace: "s" },
  { name: "subject not made header-safe", find: "subject: headerSafe(`New ${s.formType} from ${s.pageName}`),", replace: "subject: `New ${s.formType} from ${s.pageName}\\r\\n`," },
  { name: "unknown fields accepted", find: 'if (extra !== undefined) return { ok: false, error: "Unexpected field" };', replace: "" },
  { name: "unknown additionalData keys accepted", find: 'if (!(ADDITIONAL_KEYS as readonly string[]).includes(k)) return { ok: false, error: "Unexpected field" };', replace: "" },
  { name: "no length limit", find: 'if (s === "" || s.length > max) return null;', replace: 'if (s === "") return null;' },
  { name: "control and invisible characters allowed", find: "if (FORBIDDEN.test(s)) return null;", replace: "" },
  { name: "line breaks allowed everywhere", find: "if (!multiline && /[\\r\\n\\t]/.test(s)) return null;", replace: "" },
  { name: "any email accepted", find: "return s && EMAIL.test(s) ? s : null;", replace: "return s;" },
  { name: "any page accepted", find: "if (!(PAGES as readonly unknown[]).includes(body.pageName) || !(FORM_TYPES as readonly unknown[]).includes(body.formType)) {", replace: "if (typeof body.pageName !== \"string\" || typeof body.formType !== \"string\") {" },
  { name: "trap field ignored", find: 'return typeof w === "string" ? true : null;', replace: 'return typeof w === "string" ? false : null;' },
  { name: "any origin allowed", find: "origin !== null &&\n  (origin", replace: "true ||\n  (origin" },
  { name: "preview pattern not anchored", find: "/^https:\\/\\/[a-z0-9-]+--houcineworld\\.netlify\\.app$/", replace: "/^https:\\/\\/[a-z0-9.-]+--houcineworld\\.netlify\\.app/" },
  { name: "unknown address allowed", find: "if (!address) return false;", replace: "if (!address) return true;" },
  { name: "rate limit off by one", find: "if (times.length >= max) return false;", replace: "if (times.length > max) return false;" },
  { name: "rate window never expires", find: "times.filter((t) => now - t < windowMs)", replace: "times" },
  { name: "rate table unbounded", find: "if (!hits.has(address) && hits.size >= maxAddresses) return false;", replace: "" },
  { name: "recipient not checked", find: "return to && EMAIL.test(to) ? to : null;", replace: "return to ?? null;" },
  { name: "La Rosa View sent to the default inbox", find: 'page === "La Rosa View" || page === "Booking" ? secrets.toLaRosaView || secrets.toDefault : secrets.toDefault', replace: "secrets.toDefault" },
];

/** Run the tests against `moduleSource` in a temporary folder; returns the exit status. */
const runTestsAgainst = (moduleSource) => {
  const dir = mkdtempSync(join(tmpdir(), "send-notification-break-"));
  try {
    const copy = join(dir, "core.ts");
    writeFileSync(copy, moduleSource);
    // NODE_TEST_CONTEXT is set by the outer test runner; a child that inherits it always exits 0.
    const { NODE_TEST_CONTEXT: _ignored, ...env } = process.env;
    const result = spawnSync(process.execPath, ["--experimental-strip-types", "--no-warnings", "--test", testFile], {
      env: { ...env, SEND_NOTIFICATION_CORE_PATH: copy },
      encoding: "utf8",
    });
    return result.status;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("at least 15 breaks are listed", () => {
  assert.ok(BREAKS.length >= 15);
});

test("control: an unbroken copy passes the tests", () => {
  assert.equal(runTestsAgainst(source), 0);
});

for (const brk of BREAKS) {
  test(`break fails the tests: ${brk.name}`, () => {
    const count = source.split(brk.find).length - 1;
    assert.equal(count, 1, `the break's target text must appear exactly once in the module (found ${count})`);
    assert.notEqual(runTestsAgainst(source.replace(brk.find, brk.replace)), 0, `tests still pass with the break "${brk.name}"`);
  });
}
