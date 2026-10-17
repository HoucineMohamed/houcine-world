// public/_redirects: the app rule is active and last; the future-domain redirects are written, inactive, and
// correct once switched on (docs/owner-review-guide.md, topic 15).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8");
const rules = (t) => t.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => l.split(/\s+/));
const FUTURE = ["https://www.houcine.world/* https://houcine.world/:splat 301!", "https://houcineworld.netlify.app/* https://houcine.world/:splat 301!"];

test("today: only the app rule is active", () => {
  assert.deepEqual(rules(text), [["/*", "/index.html", "200"]]);
});

test("the future-domain redirects are written, commented out, once each", () => {
  for (const line of FUTURE) assert.equal(text.split(`\n# ${line}\n`).length - 1, 1, line);
});

test("switched on, they come before the app rule, keep the path and are permanent", () => {
  const on = FUTURE.reduce((t, l) => t.replace(`# ${l}`, l), text);
  const r = rules(on);
  assert.equal(r.length, 3);
  assert.deepEqual(r.at(-1), ["/*", "/index.html", "200"], "the app rule stays last");
  for (const [from, to, status] of r.slice(0, 2)) {
    assert.match(from, /^https:\/\/(www\.houcine\.world|houcineworld\.netlify\.app)\/\*$/);
    assert.equal(to, "https://houcine.world/:splat");
    assert.equal(status, "301!");
  }
});
