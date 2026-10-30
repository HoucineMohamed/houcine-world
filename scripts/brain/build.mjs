// Rebuilds the knowledge index from houcine-world-brain/ (docs/knowledge-brain.md), the Knowledge Studio's
// snapshot of the notes (docs/knowledge-studio.md), and the list of the site's public pages the notes may name. A Studio publication writes the same two files, byte for byte.
//
//   node --experimental-strip-types scripts/brain/build.mjs           check the notes and write both files
//   node --experimental-strip-types scripts/brain/build.mjs --check   only report whether they are current (CI)
//
// Exit code 1 on any invalid note, or (with --check) when a committed file differs from the notes.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrain, readBrainFiles, renderIndexModule, renderSitePathsModule, renderSnapshotModule, sitePaths } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const brain = join(root, "houcine-world-brain");
const targets = {
  index: "supabase/functions/_shared/brain/index.generated.ts",
  snapshot: "supabase/functions/knowledge-studio/snapshot.generated.ts",
  sitePaths: "supabase/functions/_shared/brain/site-paths.generated.ts",
};
const check = process.argv.includes("--check");

const { index, notes, errors } = buildBrain(brain);
if (errors.length) {
  console.error(`The knowledge brain has ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const wanted = { index: renderIndexModule(index), snapshot: renderSnapshotModule(readBrainFiles(brain)), sitePaths: renderSitePathsModule(sitePaths()) };
const hidden = notes.filter((n) => n.fields.visibility !== "public" || n.archived).length;
const summary = `${index.notes.length} public notes, ${index.chunks.length} passages (${hidden} non-public or archived note(s) left out), fingerprint ${index.fingerprint}`;

let stale = false;
for (const [key, rel] of Object.entries(targets)) {
  const file = join(root, rel);
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (current === wanted[key]) continue;
  stale = true;
  if (!check) {
    writeFileSync(file, wanted[key]);
    console.log(`Wrote ${rel}`);
  }
}
if (check && stale) {
  console.error("The knowledge index, the Studio snapshot or the site's page list is out of date. Run: node --experimental-strip-types scripts/brain/build.mjs");
  process.exit(1);
}
console.log(`${check ? "Knowledge index is current" : stale ? "Rebuilt" : "Unchanged"}: ${summary}.`);
