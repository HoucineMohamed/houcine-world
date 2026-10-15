// Tests for the scheduled / manual auto-merge path (runScheduled), with a fake GitHub client.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runScheduled, conclusionFromChecks } from "./automerge-run.mjs";
import { REQUIRED_CHECK_RUNS, REQUIRED_STATUSES } from "./automerge-decision.mjs";

const REPO = "o/r";
const sha = (c) => c.repeat(40);
const now = () => new Date();
const b64 = (t) => Buffer.from(t, "utf8").toString("base64");

/** Open pull requests: a merge-ready auto one, one without the label, one from another branch prefix, one from a fork. */
const defaultPrs = () => [
  { number: 1, ref: "claude/a", sha: sha("1"), labels: ["auto"] },
  { number: 2, ref: "claude/b", sha: sha("2"), labels: [] },
  { number: 3, ref: "feature/c", sha: sha("3"), labels: ["auto"] },
  { number: 4, ref: "claude/d", sha: sha("4"), labels: ["auto"], fork: true },
];

const fakeGithub = (opts = {}) => {
  const prs = opts.prs ?? defaultPrs();
  const calls = { merge: [], get: [], addLabels: [], createComment: [] };
  const toApi = (p) => ({
    number: p.number, state: "open", draft: false, labels: p.labels.map((name) => ({ name })),
    head: { ref: p.ref, sha: p.sha, repo: { full_name: p.fork ? "someone/fork" : REPO } }, base: { ref: "main" },
    changed_files: (p.files ?? [{}]).length,
  });
  const byNumber = (n) => prs.find((p) => p.number === n);
  const rest = {
    pulls: {
      list: async () => { if (opts.failList) throw new Error("HTTP 500"); return { data: prs.map(toApi) }; },
      get: async ({ pull_number }) => {
        calls.get.push(pull_number);
        if (opts.failGetFor === pull_number) throw new Error("HTTP 502");
        return { data: toApi(byNumber(pull_number)) };
      },
      listFiles: async ({ pull_number, page }) => ({
        data: page === 1 ? (byNumber(pull_number).files ?? [{ filename: "src/pages/Manages.tsx", status: "modified", patch: "+ok" }]) : [],
      }),
      merge: async (args) => { calls.merge.push(args); return { data: { merged: true } }; },
    },
    checks: {
      listForRef: async ({ ref }) => {
        const p = prs.find((x) => x.sha === ref);
        const conclusion = p.checkConclusion ?? "success";
        const runs = p.noChecks ? [] : REQUIRED_CHECK_RUNS.map((name, i) => ({ id: i + 1, name, status: p.checkStatus ?? "completed", conclusion }));
        return { data: { check_runs: runs } };
      },
    },
    repos: {
      getCombinedStatusForRef: async ({ ref }) => {
        const p = prs.find((x) => x.sha === ref);
        return { data: { statuses: REQUIRED_STATUSES.map((context) => ({ context, state: p.statusState ?? "success" })) } };
      },
      getContent: async ({ path }) => ({
        data: { type: "file", encoding: "base64", content: b64(path.endsWith("critical-paths.txt") ? ".github/**\n" : "super_admin\n") },
      }),
    },
    issues: {
      addLabels: async (args) => { calls.addLabels.push(args); return { data: [] }; },
      listComments: async () => ({ data: [] }),
      createComment: async (args) => { calls.createComment.push(args); return { data: {} }; },
    },
  };
  return { github: { rest }, calls };
};

const go = (github) => runScheduled({ github, owner: "o", repo: "r", now });

test("the scheduled path evaluates only open auto pull requests from claude/ branches of this repository", async () => {
  const { github, calls } = fakeGithub();
  const out = await go(github);
  assert.deepEqual(out.map((o) => o.prNumber), [1]);
  assert.deepEqual([...new Set(calls.get)], [1]);
  assert.deepEqual(calls.merge.map((m) => m.pull_number), [1]);
  assert.equal(calls.merge[0].sha, sha("1"));
});

test("every open auto pull request is evaluated, each on its own", async () => {
  const prs = [
    { number: 10, ref: "claude/x", sha: sha("a"), labels: ["auto"] },
    { number: 11, ref: "claude/y", sha: sha("b"), labels: ["auto"], statusState: "pending" },
    { number: 12, ref: "claude/z", sha: sha("c"), labels: ["auto", "hold"] },
  ];
  const { github, calls } = fakeGithub({ prs });
  const out = await go(github);
  assert.deepEqual(out.map((o) => [o.prNumber, o.action]), [[10, "merged"], [11, "skip"], [12, "skip"]]);
  assert.deepEqual(calls.merge.map((m) => m.pull_number), [10]);
});

test("a late Netlify preview is picked up: pending first, merged on a later run", async () => {
  const prs = [{ number: 20, ref: "claude/late", sha: sha("e"), labels: ["auto"], statusState: "pending" }];
  const first = fakeGithub({ prs });
  await go(first.github);
  assert.equal(first.calls.merge.length, 0);
  prs[0].statusState = "success";
  const second = fakeGithub({ prs });
  await go(second.github);
  assert.equal(second.calls.merge.length, 1);
});

test("fail closed: listing error means nothing is merged", async () => {
  const { github, calls } = fakeGithub({ failList: true });
  const out = await go(github);
  assert.equal(out[0].action, "skip");
  assert.equal(calls.merge.length, 0);
});

test("fail closed: an API error on one pull request skips it", async () => {
  const { github, calls } = fakeGithub({ failGetFor: 1 });
  const out = await go(github);
  assert.equal(out[0].action, "skip");
  assert.equal(calls.merge.length, 0);
});

test("fail closed: missing, running or failed CI checks mean no merge", async () => {
  for (const extra of [{ noChecks: true }, { checkStatus: "in_progress" }, { checkConclusion: "failure" }]) {
    const prs = [{ number: 30, ref: "claude/c", sha: sha("f"), labels: ["auto"], ...extra }];
    const { github, calls } = fakeGithub({ prs });
    await go(github);
    assert.equal(calls.merge.length, 0, JSON.stringify(extra));
  }
});

test("the scheduled path still flags critical changes for the owner", async () => {
  const prs = [{ number: 40, ref: "claude/w", sha: sha("9"), labels: ["auto"], files: [{ filename: ".github/workflows/ci.yml", status: "modified", patch: "+x" }] }];
  const { github, calls } = fakeGithub({ prs });
  const out = await go(github);
  assert.equal(out[0].action, "needs-owner");
  assert.equal(calls.merge.length, 0);
  assert.equal(calls.createComment.length, 1);
});

test("no open auto pull request: nothing happens", async () => {
  const { github, calls } = fakeGithub({ prs: [{ number: 2, ref: "claude/b", sha: sha("2"), labels: [] }] });
  const out = await go(github);
  assert.equal(out[0].action, "skip");
  assert.equal(calls.merge.length + calls.addLabels.length, 0);
});

test("conclusionFromChecks: success only when every required check succeeded", () => {
  const ok = REQUIRED_CHECK_RUNS.map((name, i) => ({ id: i + 1, name, status: "completed", conclusion: "success" }));
  assert.equal(conclusionFromChecks(ok), "success");
  assert.equal(conclusionFromChecks([]), "missing");
  assert.equal(conclusionFromChecks(undefined), "unknown");
  assert.equal(conclusionFromChecks(ok.map((r) => ({ ...r, status: "queued" }))), "pending");
  assert.equal(conclusionFromChecks(ok.map((r) => ({ ...r, conclusion: "cancelled" }))), "cancelled");
});
