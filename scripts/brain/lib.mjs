// The knowledge-brain compiler for Node: reads houcine-world-brain/ from disk and hands the files to the ONE compiler
// (supabase/functions/_shared/brain/compile.ts), which the Knowledge Studio function also runs, so a build on a
// computer, in CI and in a Studio publication produce the same bytes. Run with --experimental-strip-types.
// docs/knowledge-brain.md.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { compileBrain, renderIndexModule, renderSnapshotModule, BRANDS, TYPES, VISIBILITY, STATUSES } from "../../supabase/functions/_shared/brain/compile.ts";
import { renderMaps, DASHBOARD_PATH, CANVAS_PATH } from "../../supabase/functions/_shared/brain/dashboard.ts";
import { scoreCoverage } from "../../supabase/functions/_shared/brain/coverage.ts";
import { COVERAGE_QUESTIONS } from "../../supabase/functions/_shared/brain/coverage-questions.ts";

export { renderIndexModule, renderSnapshotModule, BRANDS, TYPES, VISIBILITY, STATUSES, DASHBOARD_PATH, CANVAS_PATH };

/** The generated dashboard and canvas (maps/generated/) for these brain files, as a Studio publication writes them. */
export const buildMaps = (files, index) =>
  renderMaps(compileBrain(files, { audience: "admin" }), index, scoreCoverage(index, COVERAGE_QUESTIONS, BRANDS));

/** Every file under the brain folder, as { path, text } with "/" separators (the compiler decides which are notes). */
export const readBrainFiles = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
      if (name.startsWith(".")) continue;
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".md")) out.push({ path: relative(dir, p).split(sep).join("/"), text: readFileSync(p, "utf8") });
    }
  };
  walk(dir);
  return out;
};

/** Reads and checks every note, then compiles the public ones. `index` is null when there is any error. */
export const buildBrain = (dir) => compileBrain(readBrainFiles(dir));
