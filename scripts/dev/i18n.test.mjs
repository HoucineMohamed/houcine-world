// Tests for the language structure (src/content/i18n.ts): English fallback, and no French text shipped
// until the owner adds reviewed copy (this test then needs updating on purpose).
//
//   node --experimental-strip-types --test scripts/dev/i18n.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { LOCALES, DEFAULT_LOCALE, pick, UI } = await import(join(root, "src/content/i18n.ts"));

test("English and French are the two languages, English the default", () => {
  assert.deepEqual([...LOCALES], ["en", "fr"]);
  assert.equal(DEFAULT_LOCALE, "en");
});

test("pick() returns French when it exists and English otherwise", () => {
  assert.equal(pick({ en: "Hello", fr: "Bonjour" }, "fr"), "Bonjour");
  assert.equal(pick({ en: "Hello" }, "fr"), "Hello");
  assert.equal(pick({ en: "Hello", fr: "" }, "fr"), "Hello", "an empty French text falls back to English");
  assert.equal(pick({ en: "Hello", fr: "Bonjour" }, "en"), "Hello");
});

test("every interface key has English text, and no French text is shipped without review", () => {
  for (const [key, value] of Object.entries(UI)) {
    assert.ok(value.en.trim() !== "", `${key}: no English text`);
    assert.equal(value.fr, undefined, `${key}: French text present; it must come from a native reviewer, then update this test`);
  }
});
