// The legal pages print as plain text: the layout carries the class the print rules use, and the rules hide
// everything but the page's main content and write out the address of each outside link.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../../src/index.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../../src/components/legal/LegalPageLayout.tsx", import.meta.url), "utf8");
const print = css.slice(css.indexOf("@media print"));

test("the legal layout carries the legal-page class", () => {
  assert.match(layout, /className="legal-page /);
});

test("the print rules hide everything but main and show outside link addresses", () => {
  assert.ok(css.includes("@media print"), "no print rules");
  assert.match(print, /\.legal-page > \*:not\(main\)\s*\{\s*display: none !important;/);
  assert.match(print, /a\[href\^="http"\]::after/);
  assert.match(print, /content: " \(" attr\(href\) "\)"/);
});

test("the print rules are scoped to the legal pages", () => {
  const selectors = [...print.matchAll(/^\s*([^@{}\n][^{}\n]*)\{/gm)].map((m) => m[1].trim());
  for (const s of selectors) assert.ok(s.startsWith(".legal-page") || s === "body", `unscoped print selector: ${s}`);
});
