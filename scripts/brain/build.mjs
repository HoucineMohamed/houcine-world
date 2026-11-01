// Rebuilds the knowledge index from houcine-world-brain/ (docs/knowledge-brain.md), the Knowledge Studio's
// snapshot of the notes (docs/knowledge-studio.md), the list of the site's public pages the notes may name, and the
// generated maps (maps/generated/: a dashboard of charts and an Obsidian Canvas board; docs/knowledge-brain.md). A Studio
// publication writes the same index and snapshot, byte for byte.
//
//   node --experimental-strip-types scripts/brain/build.mjs           check the notes and write both files
//   node --experimental-strip-types scripts/brain/build.mjs --check   only report whether they are current (CI)
//
// Exit code 1 on any invalid note, or (with --check) when a committed file differs from the notes.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrain, buildMaps, CANVAS_PATH, DASHBOARD_PATH, readBrainFiles, renderIndexModule, renderSitePathsModule, renderSnapshotModule, sitePaths } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const brain = join(root, "houcine-world-brain");
const targets = {
  index: "supabase/functions/_shared/brain/index.generated.ts",
  snapshot: "supabase/functions/knowledge-studio/snapshot.generated.ts",
  sitePaths: "supabase/functions/_shared/brain/site-paths.generated.ts",
  dashboard: `houcine-world-brain/${DASHBOARD_PATH}`,
  canvas: `houcine-world-brain/${CANVAS_PATH}`,
};
const check = process.argv.includes("--check");

const { index, notes, errors } = buildBrain(brain);
if (errors.length) {
  console.error(`The knowledge brain has ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const files = readBrainFiles(brain);
const maps = buildMaps(files, index);
const wanted = { index: renderIndexModule(index), snapshot: renderSnapshotModule(files), sitePaths: renderSitePathsModule(sitePaths()), dashboard: maps.dashboard, canvas: maps.canvas };
const hidden = notes.filter((n) => n.fields.visibility !== "public" || n.archived).length;
const summary = `${index.notes.length} public notes, ${index.chunks.length} passages (${hidden} non-public or archived note(s) left out), fingerprint ${index.fingerprint}`;

let stale = false;
for (const [key, rel] of Object.entries(targets)) {
  const file = join(root, rel);
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current === wanted[key]) continue;
  stale = true;
  if (!check) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, wanted[key]);
    console.log(`Wrote ${rel}`);
  }
}
if (check && stale) {
  console.error("The knowledge index, the Studio snapshot, the site's page list or the generated maps are out of date. Run: node --experimental-strip-types scripts/brain/build.mjs");
  process.exit(1);
}
console.log(`${check ? "Knowledge index is current" : stale ? "Rebuilt" : "Unchanged"}: ${summary}.`);
