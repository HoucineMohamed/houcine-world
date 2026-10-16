// Fails if src/design/tokens.json disagrees with src/index.css (colours of :root and .dark, the radius).
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
