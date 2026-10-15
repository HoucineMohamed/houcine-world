// Tests for the I/O side of auto-merge, with a fake GitHub client (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAutoMerge, COMMENT_MARKER } from "./automerge-run.mjs";
import { NO_MERGE_BEFORE, REQUIRED_CHECK_RUNS, REQUIRED_STATUSES } from "./automerge-decision.mjs";

const SHA = "d".repeat(40);
const LATER = () => new Date(Date.parse(NO_MERGE_BEFORE) + 3_600_000);
const noSleep = async () => {};
const b64 = (text) => Buffer.from(text, "utf8").toString("base64");

/** A fake octokit. `opts` changes one behaviour; `calls` records every write. */
const fakeGithub = (opts = {}) => {
  const calls = { merge: [], addLabels: [], createComment: [], deleteRef: [] };
  const files = opts.files ?? [{ filename: "src/pages/Manages.tsx", status: "modified", patch: "+ok" }];
  const labels = opts.labels ?? [];
  const pr = { number: 9, state: "open", draft: false, labels: labels.map((name) => ({ name })), head: { sha: SHA }, base: { ref: "main" }, changed_files: files.length };
  let getCount = 0;
  const rest = {
    pulls: {
      list: async () => ({ data: opts.noPr ? [] : [{ number: 9, head: { sha: SHA } }] }),
      get: async () => {
        getCount++;
        if (opts.failGet) throw new Error("HTTP 502");
        if (opts.headMovesAfterFirstGet && getCount > 1) return { data: { ...pr, head: { sha: "e".repeat(40) } } };
        return { data: pr };
      },
      listFiles: async ({ page }) => ({ data: page === 1 ? files : [] }),
      merge: async (args) => { calls.merge.push(args); return { data: { merged: true } }; },
    },
    checks: {
      listForRef: async () => ({ data: { check_runs: REQUIRED_CHECK_RUNS.map((name, i) => ({ id: i + 1, name, status: "completed", conclusion: opts.checkConclusion ?? "success" })) } }),
    },
    repos: {
      getCombinedStatusForRef: async () => ({ data: { statuses: REQUIRED_STATUSES.map((context) => ({ context, state: "success" })) } }),
      getContent: async ({ path, ref }) => {
        if (opts.missingLists) throw new Error("HTTP 404");
        assert.equal(ref, "main", "lists must be read from the base branch");
        const text = path.endsWith("critical-paths.txt") ? ".github/**\nsupabase/**\n" : "platform_role\nsuper_admin\n";
        return { data: { type: "file", encoding: "base64", content: b64(text) } };
      },
    },
    issues: {
      addLabels: async (args) => { calls.addLabels.push(args); return { data: [] }; },
      listComments: async () => ({ data: opts.existingComment ? [{ body: COMMENT_MARKER }] : [] }),
      createComment: async (args) => { calls.createComment.push(args); return { data: {} }; },
    },
    git: { deleteRef: async (args) => { calls.deleteRef.push(args); } },
  };
  return { github: { rest }, calls };
};

const run = { head_sha: SHA, conclusion: "success" };
const go = (github, extra = {}) => runAutoMerge({ github, owner: "o", repo: "r", run, now: LATER, sleep: noSleep, attempts: 2, waitMs: 0, ...extra });

test("merges with squash, pinned to the head SHA, and never deletes the branch", async () => {
  const { github, calls } = fakeGithub();
  const out = await go(github);
  assert.equal(out[0].action, "merged");
  assert.deepEqual(calls.merge, [{ owner: "o", repo: "r", pull_number: 9, merge_method: "squash", sha: SHA }]);
  assert.equal(calls.deleteRef.length, 0);
});

test("an API error means no merge", async () => {
  const { github, calls } = fakeGithub({ failGet: true });
  const out = await go(github);
  assert.equal(out[0].action, "skip");
  assert.equal(calls.merge.length, 0);
});

test("missing critical-path or watch-list files mean no merge", async () => {
  const { github, calls } = fakeGithub({ missingLists: true });
  await go(github);
  assert.equal(calls.merge.length, 0);
});

test("a head pushed during the checks means no merge", async () => {
  const { github, calls } = fakeGithub({ headMovesAfterFirstGet: true });
  await go(github);
  assert.equal(calls.merge.length, 0);
});

test("a failing check means no merge", async () => {
  const { github, calls } = fakeGithub({ checkConclusion: "failure" });
  await go(github);
  assert.equal(calls.merge.length, 0);
});

test("a critical path adds needs-owner and ONE comment naming the path", async () => {
  const { github, calls } = fakeGithub({ files: [{ filename: ".github/workflows/ci.yml", status: "modified", patch: "+x" }] });
  const out = await go(github);
  assert.equal(out[0].action, "needs-owner");
  assert.equal(calls.merge.length, 0);
  assert.deepEqual(calls.addLabels[0].labels, ["needs-owner"]);
  assert.equal(calls.createComment.length, 1);
  assert.match(calls.createComment[0].body, /\.github\/workflows\/ci\.yml/);
});

test("no second comment when the PR already has the label or the comment", async () => {
  const touched = [{ filename: "supabase/config.toml", status: "modified", patch: "+x" }];
  const labelled = fakeGithub({ files: touched, labels: ["needs-owner"] });
  await go(labelled.github);
  assert.equal(labelled.calls.createComment.length, 0);
  const commented = fakeGithub({ files: touched, existingComment: true });
  await go(commented.github);
  assert.equal(commented.calls.createComment.length, 0);
});

test("no open pull request for the commit: nothing happens", async () => {
  const { github, calls } = fakeGithub({ noPr: true });
  const out = await go(github);
  assert.equal(out[0].action, "skip");
  assert.equal(calls.merge.length + calls.addLabels.length + calls.createComment.length, 0);
});

test("before the time gate: no merge", async () => {
  const { github, calls } = fakeGithub();
  await go(github, { now: () => new Date(Date.parse(NO_MERGE_BEFORE) - 1000) });
  assert.equal(calls.merge.length, 0);
});
