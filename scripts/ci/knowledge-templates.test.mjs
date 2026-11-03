// "Teach the AI", guided mode (src/lib/knowledge/templates.ts): every category has questions, the templates hold
// questions only (no value that could be taken as a fact), and a note built from the answers compiles, with every
// question left empty saved as "awaiting confirmation" so the AI never states it.
//
//   node --experimental-strip-types --test scripts/ci/knowledge-templates.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const { TEMPLATES, templateSections, answersText, pendingLine } = await import(join(root, "src/lib/knowledge/templates.ts"));
const { compileBrain, TYPES } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
const { readBrainFiles } = await import("../brain/lib.mjs");

test("every category a person can teach has a template, with distinct headings", () => {
  for (const type of TYPES.filter((t) => !["index", "source", "agent"].includes(t))) {
    const t = TEMPLATES[type];
    assert.ok(t && t.length >= 2, type);
    assert.equal(new Set(t.map((s) => s.heading)).size, t.length, type);
  }
});

test("templates are questions only: no number, price, email, link or phone that could pass for a fact", () => {
  for (const [type, sections] of Object.entries(TEMPLATES)) {
    for (const s of sections) {
      const text = `${s.heading} ${s.prompt} ${s.hint}`;
      assert.ok(!/\d|€|\$|@|https?:|www\./.test(text), `${type}: ${text}`);
      assert.match(s.prompt, /\?$/, `${type}: a prompt is a question`);
    }
  }
});

test("a guided note compiles; empty answers are 'awaiting confirmation' passages, answers are the owner's words", () => {
  const answers = { "What it is": "  Example answer one.  ", "Who it is for": "Example answer two." };
  const body = `# Template example\n\n${templateSections("service", answers)}`;
  assert.ok(body.includes("## What it is\nExample answer one."));
  assert.ok(body.includes(`## Prices and quotes\n${pendingLine("Is a price published? If not, how is a quote given?")}`));
  const note = `---\nid: lrv-template-example\ntitle: Template example\nbrand: la-rosa-view\ntype: service\nvisibility: public\nstatus: verified\nsources: [site-larosaview]\nupdated: 2026-10-30\n---\n\n${body}\n`;
  const files = [...readBrainFiles(join(root, "houcine-world-brain")), { path: "brands/la-rosa-view/template-example.md", text: note }];
  const { index, errors } = compileBrain(files);
  assert.deepEqual(errors, []);
  const chunks = index.chunks.filter((c) => c.note === "lrv-template-example");
  const status = Object.fromEntries(chunks.map((c) => [c.heading, c.status]));
  assert.equal(status["What it is"], "verified");
  assert.equal(status["Who it is for"], "verified");
  for (const h of ["What is included", "Prices and quotes", "How to ask for it"]) assert.equal(status[h], "pending", h);
  assert.equal(answersText("service", answers), "What is this service, in one or two sentences?\nExample answer one.\n\nWho is it for?\nExample answer two.");
});
