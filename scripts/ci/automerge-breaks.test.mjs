// Deliberate breaks: each entry changes ONE line of automerge-decision.mjs in a temporary copy,
// then runs automerge-decision.test.mjs against that copy. Every break must make the tests FAIL.
// If a break ever passes, the tests no longer protect that rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "automerge-decision.mjs"), "utf8");
const testFile = join(here, "automerge-decision.test.mjs");

export const BREAKS = [
  { name: "** no longer crosses directories", find: 'out += "(?:.*/)?";', replace: 'out += "(?:[^/]*/)?";' },
  { name: "* crosses directories", find: 'out += "[^/]*";', replace: 'out += ".*";' },
  { name: "file-name-anywhere rule removed", find: "const anywhere = !body.includes(\"/\");", replace: "const anywhere = false;" },
  { name: "renamed-from paths ignored", find: "const paths = [file.filename, file.previous_filename]", replace: "const paths = [file.filename]" },
  { name: "watch-list ignored", find: "if (text.includes(id)) hits.add(id);", replace: "if (false) hits.add(id);" },
  { name: "errors ignored", find: "if (facts.errors.length > 0) {", replace: "if (false) {" },
  { name: "draft allowed", find: 'if (pr.draft !== false) blocked("pull request is a draft");', replace: "" },
  { name: "hold label ignored", find: 'if (labels.includes("hold")) blocked("label hold");', replace: "" },
  { name: "stale head allowed", find: "if (facts.latestHeadSha !== pr.headSha) blocked(", replace: "if (false) blocked(" },
  { name: "truncation allowed", find: "if (facts.filesComplete !== true) blocked(", replace: "if (false) blocked(" },
  { name: "missing check counts as success", find: 'if (!latest) { pending(`required check ${name} missing`); continue; }', replace: "if (!latest) continue;" },
  { name: "time gate off by one", find: "if (!(now > gate)) blocked(", replace: "if (now < gate) blocked(" },
  { name: "time gate removed", find: "const gate = Date.parse(NO_MERGE_BEFORE);", replace: "const gate = 0;" },
  { name: "empty critical list accepted", find: "facts.criticalPatterns.length === 0", replace: "false" },
];

for (const brk of BREAKS) {
  test(`break fails the tests: ${brk.name}`, () => {
    const count = source.split(brk.find).length - 1;
    assert.equal(count, 1, `the break's target text must appear exactly once in the module (found ${count})`);
    const dir = mkdtempSync(join(tmpdir(), "automerge-break-"));
    try {
      const broken = join(dir, "automerge-decision.mjs");
      writeFileSync(broken, source.replace(brk.find, brk.replace));
      const result = spawnSync(process.execPath, ["--test", testFile], {
        env: { ...process.env, AUTOMERGE_DECISION_PATH: broken },
        encoding: "utf8",
      });
      assert.notEqual(result.status, 0, `tests still pass with the break "${brk.name}"`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("at least 8 deliberate breaks", () => {
  assert.ok(BREAKS.length >= 8);
});
