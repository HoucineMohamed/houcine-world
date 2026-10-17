// Fails if src/design/tokens.json disagrees with src/index.css (colours of :root and .dark, the radius), or with
// the tables of docs/ecosystem-design-tokens.md (the design-drift guard; section 11 of that doc is the protocol).
//
//   node --test scripts/dev/tokens.test.mjs
//
// src/index.css is the source of truth; after changing a colour there, update tokens.json to match
// (docs/ecosystem-design-tokens.md says how).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = readFileSync(join(root, "src/index.css"), "utf8");
const tokens = JSON.parse(readFileSync(join(root, "src/design/tokens.json"), "utf8"));

/** The custom properties of one selector block, as "H S% L%" strings. */
const cssBlock = (selector) => {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `${selector} block not found in src/index.css`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)].map((m) => [m[1], `${m[2]} ${m[3]}% ${m[4]}%`]),
  );
};

for (const [name, selector] of [["root", ":root"], ["darkClass", ".dark"]]) {
  test(`colours.${name} match ${selector} in src/index.css`, () => {
    assert.deepEqual(tokens.colors[name], cssBlock(selector));
  });
}

test("the radius matches --radius in src/index.css", () => {
  assert.equal(tokens.radius.base, css.match(/--radius:\s*([\d.]+rem)/)?.[1]);
});

test("every colour the Tailwind config names exists in src/index.css", () => {
  const config = readFileSync(join(root, "tailwind.config.ts"), "utf8");
  const used = new Set([...config.matchAll(/var\(--([\w-]+)\)/g)].map((m) => m[1]).filter((n) => n !== "radius" && !n.startsWith("radix-")));
  for (const name of used) assert.ok(name in tokens.colors.root, `--${name} is used by tailwind.config.ts but missing`);
});

test("the comparison itself catches a difference (guard against a check that always passes)", () => {
  const changed = { ...tokens.colors.root, background: "1 2% 3%" };
  assert.notDeepEqual(changed, cssBlock(":root"));
});

/**
 * Every disagreement between tokens.json and the colour and radius tables of the doc, as readable lines (empty
 * when they agree). Both directions: a token missing from the doc, a doc row for a token that does not exist,
 * a different value in either palette, a radius that differs.
 */
const docDrift = (doc, t) => {
  const problems = [];
  const rows = new Map(
    [...doc.matchAll(/^\| `--([\w-]+)` \| `([^`]+)` \| `#[0-9a-f]{6}` \| `([^`]+)` \| `#[0-9a-f]{6}` \|$/gm)].map((m) => [m[1], { root: m[2], dark: m[3] }]),
  );
  for (const [name, value] of Object.entries(t.colors.root)) {
    const row = rows.get(name);
    if (!row) problems.push(`--${name} is missing from the colour table`);
    else {
      if (row.root !== value) problems.push(`--${name}: the doc says ${row.root}, tokens.json says ${value}`);
      if (t.colors.darkClass[name] !== undefined && row.dark !== t.colors.darkClass[name]) problems.push(`--${name} (.dark): the doc says ${row.dark}, tokens.json says ${t.colors.darkClass[name]}`);
    }
  }
  for (const name of rows.keys()) if (!(name in t.colors.root)) problems.push(`--${name} is in the doc but not in tokens.json`);
  const radius = doc.match(/^\| `--radius` \| `([^`]+)`/m)?.[1];
  if (radius !== t.radius.base) problems.push(`--radius: the doc says ${radius}, tokens.json says ${t.radius.base}`);
  return problems;
};

const doc = readFileSync(join(root, "docs/ecosystem-design-tokens.md"), "utf8");

test("docs/ecosystem-design-tokens.md and tokens.json agree (colours of both palettes, the radius)", () => {
  assert.deepEqual(docDrift(doc, tokens), []);
});

test("the drift check catches a changed value, a missing row, an extra row and a changed radius", () => {
  const first = Object.keys(tokens.colors.root)[0];
  const changed = structuredClone(tokens);
  changed.colors.root[first] = "1 2% 3%";
  assert.ok(docDrift(doc, changed).length > 0, "changed value");
  const extra = structuredClone(tokens);
  extra.colors.root["brand-new"] = "1 2% 3%";
  assert.ok(docDrift(doc, extra).length > 0, "token missing from the doc");
  const fewer = structuredClone(tokens);
  delete fewer.colors.root[first];
  assert.ok(docDrift(doc, fewer).length > 0, "row in the doc for a token that does not exist");
  const radius = structuredClone(tokens);
  radius.radius.base = "1rem";
  assert.ok(docDrift(doc, radius).length > 0, "radius");
});

test("the doc has the token change protocol", () => {
  assert.match(doc, /^## 11\. Token change protocol$/m);
});
