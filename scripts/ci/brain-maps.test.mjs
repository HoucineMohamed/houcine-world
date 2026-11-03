// The brain's maps (houcine-world-brain/maps/, docs/knowledge-brain.md "Maps and charts"): the generated dashboard and
// canvas are current and counted from the notes, the canvas points only at real notes, the hand-drawn maps are
// internal and never reach any AI, and the diagrams use only Mermaid types Obsidian and GitHub draw without plugins.
//
//   node --experimental-strip-types --test scripts/ci/brain-maps.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBrain, buildMaps, readBrainFiles, DASHBOARD_PATH, CANVAS_PATH } from "../brain/lib.mjs";

const root = new URL("../../", import.meta.url).pathname;
const brainDir = join(root, "houcine-world-brain");
const { compileBrain, isNotePath } = await import(join(root, "supabase/functions/_shared/brain/compile.ts"));
const files = readBrainFiles(brainDir);
const built = buildBrain(brainDir);
const maps = buildMaps(files, built.index);
const mapNotes = files.filter((f) => f.path.startsWith("maps/") && isNotePath(f.path));
const mermaidBlocks = (text) => [...text.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);

test("the generated dashboard and canvas are current (rebuild with scripts/brain/build.mjs)", () => {
  assert.equal(readFileSync(join(brainDir, DASHBOARD_PATH), "utf8"), maps.dashboard);
  assert.equal(readFileSync(join(brainDir, CANVAS_PATH), "utf8"), maps.canvas);
  assert.deepEqual(buildMaps(files, built.index), maps, "deterministic");
});

test("the generated files are not notes and never change the AI's index", () => {
  assert.equal(isNotePath(DASHBOARD_PATH), false);
  const without = compileBrain(files.filter((f) => !f.path.startsWith("maps/generated/")));
  assert.equal(without.index.fingerprint, built.index.fingerprint);
});

test("the hand-drawn maps are internal notes: never compiled, so no AI reads them", () => {
  assert.ok(mapNotes.length >= 7, String(mapNotes.length));
  for (const f of mapNotes) assert.match(f.text, /\nvisibility: internal\n/, f.path);
  for (const n of built.index.notes) assert.ok(!n.id.startsWith("maps-"), n.id);
  for (const c of built.index.chunks) assert.ok(!c.text.includes("```mermaid"), c.id);
});

test("the dashboard's numbers are the notes' own", () => {
  assert.ok(maps.dashboard.includes(`| Passages the public AI can read | ${built.index.chunks.length} |`));
  const lrv = built.notes.filter((n) => !n.archived && n.fields.brand === "la-rosa-view").length;
  assert.ok(maps.dashboard.includes(`  "La Rosa View" : ${lrv}`));
  assert.ok(maps.dashboard.includes(built.index.fingerprint));
});

test("the canvas points only at real notes, and its arrows are the notes' links", () => {
  const canvas = JSON.parse(maps.canvas);
  const ids = new Set(canvas.nodes.map((n) => n.id));
  const paths = new Set(files.map((f) => f.path));
  for (const n of canvas.nodes.filter((x) => x.type === "file")) assert.ok(paths.has(n.file) && isNotePath(n.file), n.file);
  for (const e of canvas.edges) assert.ok(ids.has(e.fromNode) && ids.has(e.toNode), e.id);
  const byId = new Map(built.notes.map((n) => [n.fields.id, n]));
  for (const e of canvas.edges) {
    const from = e.fromNode.replace(/^note-/, "");
    assert.ok(byId.get(from).links.includes(e.toNode.replace(/^note-/, "")), e.id);
  }
});

test("diagrams use only built-in Mermaid types, hold no wiki link, and name no private project", () => {
  const allowed = /^(pie|flowchart|mindmap|timeline|sequenceDiagram|stateDiagram-v2)\b/;
  for (const f of [...mapNotes, { path: DASHBOARD_PATH, text: maps.dashboard }]) {
    const blocks = mermaidBlocks(f.text);
    assert.ok(blocks.length >= 1, `${f.path} has a diagram`);
    for (const b of blocks) {
      assert.match(b.trimStart(), allowed, f.path);
      assert.ok(!b.includes("[["), `${f.path}: a [[ in a diagram would be read as a link`);
    }
    assert.ok(!/houcine\.trades|trading|payout/i.test(f.text), f.path);
  }
});

test("Obsidian's graph colours are valid settings", () => {
  const graph = JSON.parse(readFileSync(join(brainDir, ".obsidian/graph.json"), "utf8"));
  assert.ok(graph.colorGroups.length >= 5);
  for (const g of graph.colorGroups) assert.ok(g.query.startsWith("path:") && Number.isInteger(g.color.rgb), g.query);
});
