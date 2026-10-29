// The Houcine.tech "What I Use to Build" data (src/content/techStack.ts).
//   node --experimental-strip-types --test scripts/dev/tech-stack.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { CORE_STACK, STACK_CATEGORIES, isCoreTool } from "../../src/content/techStack.ts";

test("the section has the 12 specified categories, in order", () => {
  assert.deepEqual(STACK_CATEGORIES.map((c) => c.name), [
    "Frontend Engineering", "Backend Engineering", "Databases & Data Management", "AI & Intelligent Systems",
    "APIs & Integrations", "Automation & Workflows", "UI Engineering & Design Systems", "E-commerce & Payments",
    "Cloud, Hosting & Deployment", "Security & Reliability", "Testing & Performance", "Development & Collaboration",
  ]);
});

test("the core stack is exactly the eight specified tools", () => {
  assert.deepEqual(CORE_STACK.map((t) => t.name), [
    "React", "TypeScript", "Tailwind CSS", "Supabase", "PostgreSQL", "GitHub", "Lovable", "Netlify",
  ]);
});

test("every core tool appears inside a category", () => {
  const all = new Set(STACK_CATEGORIES.flatMap((c) => c.tools));
  for (const t of CORE_STACK) assert.ok(all.has(t.name), t.name);
});

test("tools outside the core stack are not marked core", () => {
  assert.equal(isCoreTool("Next.js"), false);
  assert.equal(isCoreTool("AWS"), false);
  assert.equal(isCoreTool("React"), true);
});

test("every category has a description and something to show", () => {
  for (const c of STACK_CATEGORIES) {
    assert.ok(c.description.length > 0, c.name);
    assert.ok(c.tools.length + c.capabilities.length > 0, c.name);
  }
});
