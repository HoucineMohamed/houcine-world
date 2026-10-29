// Rebuilds the knowledge index from houcine-world-brain/ (docs/knowledge-brain.md).
//
//   node --experimental-strip-types scripts/brain/build.mjs           check the notes and write the index
//   node --experimental-strip-types scripts/brain/build.mjs --check   only report whether the index is current (CI)
//
// Exit code 1 on any invalid note, or (with --check) when the committed index differs from the notes.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBrain, renderIndexModule } from "./lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const brain = join(root, "houcine-world-brain");
const target = join(root, "supabase/functions/_shared/brain/index.generated.ts");
const check = process.argv.includes("--check");

const { index, notes, errors } = buildBrain(brain);
if (errors.length) {
  console.error(`The knowledge brain has ${errors.length} problem(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const module = renderIndexModule(index);
const current = existsSync(target) ? readFileSync(target, "utf8") : "";
const hidden = notes.filter((n) => n.fields.visibility !== "public").length;
const summary = `${index.notes.length} public notes, ${index.chunks.length} passages (${hidden} non-public note(s) left out), fingerprint ${index.fingerprint}`;

if (check) {
  if (current !== module) {
    console.error("The knowledge index is out of date. Run: node --experimental-strip-types scripts/brain/build.mjs");
    process.exit(1);
  }
  console.log(`Knowledge index is current: ${summary}.`);
} else {
  if (current !== module) writeFileSync(target, module);
  console.log(`${current === module ? "Unchanged" : "Wrote"} supabase/functions/_shared/brain/index.generated.ts: ${summary}.`);
}
