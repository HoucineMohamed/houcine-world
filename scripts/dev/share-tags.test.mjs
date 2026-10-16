// The static share tags in index.html: what a link preview shows before any script runs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const meta = (attr, name) => html.match(new RegExp(`<meta ${attr}="${name.replace(".", "\\.")}" content="([^"]*)"`))?.[1];

test("canonical and share addresses are https://houcine.world/", () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/houcine\.world\/" \/>/);
  assert.equal(meta("property", "og:url"), "https://houcine.world/");
  assert.equal(meta("name", "twitter:url"), "https://houcine.world/");
});

test("no preview address anywhere, and no builder-hosted file in a share tag", () => {
  assert.doesNotMatch(html, /lovableproject|lovable\.app/i);
  for (const tag of html.match(/<meta [^>]*>|<link rel="canonical"[^>]*>/g) ?? []) assert.doesNotMatch(tag, /gpt-engineer|storage\.googleapis/i, tag);
});

test("share images are files of this repository, served from the site", () => {
  for (const [attr, name] of [["property", "og:image"], ["name", "twitter:image"]]) {
    const url = meta(attr, name);
    assert.ok(url?.startsWith("https://houcine.world/"), `${name}: ${url}`);
    assert.ok(existsSync(new URL(`../../public/${url.slice("https://houcine.world/".length)}`, import.meta.url)), `${name}: no such file in public/`);
  }
  assert.equal(meta("property", "og:image:width"), "1200");
  assert.equal(meta("property", "og:image:height"), "630");
});
