// In-memory stand-ins for Knowledge Studio's repository (git) and database, with the same rules as the real ones
// (fast-forward-only commits, draft versions, one publication in flight). Used by scripts/ci/knowledge-studio.test.mjs
// and by browser checks that run the real Studio logic against them. Never used by the deployed functions.
import { createHash } from "node:crypto";
import { join } from "node:path";
import { readBrainFiles } from "./lib.mjs";

const root = new URL("../../", import.meta.url).pathname;
const { BRAIN_DIR } = await import(join(root, "supabase/functions/knowledge-studio/core.ts"));

export const brainFiles = readBrainFiles(join(root, "houcine-world-brain"));
const blobSha = (text) => createHash("sha1").update(text).digest("hex");
const commitSha = (n) => createHash("sha1").update(`commit-${n}`).digest("hex");

/** An in-memory git repository with one branch. */
export const fakeRepo = () => {
  let n = 0;
  const commits = new Map();
  const first = commitSha(n++);
  const files = new Map(brainFiles.map((f) => [`${BRAIN_DIR}/${f.path}`, f.text]));
  commits.set(first, files);
  const state = { head: first, commits, deploy: "in_progress", dispatched: 0, failCommitWith: null, moveBranchOnce: false, log: [] };
  const repo = {
    mode: "github",
    async head() { return { ok: true, commit: state.head }; },
    async files(commit) {
      const tree = commits.get(commit);
      return { ok: true, files: [...tree.entries()].filter(([p]) => p.startsWith(`${BRAIN_DIR}/`)).map(([p, text]) => ({ path: p.slice(BRAIN_DIR.length + 1), sha: blobSha(text), text })) };
    },
    async commit({ parent, message, changes }) {
      if (state.failCommitWith) return { ok: false, error: state.failCommitWith };
      if (state.moveBranchOnce) {
        state.moveBranchOnce = false;
        externalCommit("README-unrelated.txt", "someone else");
      }
      if (parent !== state.head) return { ok: false, error: "conflict" };
      const tree = new Map(commits.get(parent));
      for (const c of changes) c.content === null ? tree.delete(c.path) : tree.set(c.path, c.content);
      const sha = commitSha(n++);
      commits.set(sha, tree);
      state.head = sha;
      state.log.push({ sha, message, changes });
      return { ok: true, commit: sha };
    },
    async history() { return []; },
    async fileAt(commit, path) { return commits.get(commit)?.get(path) ?? null; },
    async deployRun() { return state.deploy; },
    async dispatchDeploy() { state.dispatched++; return true; },
  };
  const externalCommit = (path, text) => {
    const tree = new Map(commits.get(state.head));
    tree.set(path, text);
    const sha = commitSha(n++);
    commits.set(sha, tree);
    state.head = sha;
  };
  return { repo, state, externalCommit, tree: () => commits.get(state.head) };
};

/** An in-memory database with the same rules as the migration (versions, one publication in flight). */
export const fakeStore = () => {
  const drafts = new Map();
  const pubs = [];
  const events = [];
  const feedback = [];
  let id = 0;
  const now = () => new Date().toISOString();
  return {
    eventLog: events,
    async drafts() { return [...drafts.values()]; },
    async draft(p) { return drafts.get(p) ?? null; },
    async saveDraft(d, expected, actor) {
      const cur = drafts.get(d.path) ?? null;
      if (expected === null) {
        if (cur) return { ok: false, current: cur };
        const row = { ...d, version: 1, created_at: now(), updated_at: now() };
        drafts.set(d.path, row);
        return { ok: true, draft: row };
      }
      if (!cur || cur.version !== expected) return { ok: false, current: cur };
      const row = { ...cur, ...d, version: cur.version + 1, updated_at: now() };
      drafts.set(d.path, row);
      return { ok: true, draft: row };
    },
    async deleteDraft(p, v) {
      const cur = drafts.get(p);
      if (!cur || (v !== null && cur.version !== v)) return false;
      drafts.delete(p);
      return true;
    },
    async createPublication(p) {
      if (pubs.some((x) => x.status === "committing" || x.status === "deploying")) return null;
      const row = { id: `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`, status: "committing", requested_by: p.requested_by, requested_at: now(), deploy_started_at: null, finished_at: null, paths: p.paths, commit_sha: null, expected_fingerprint: null, error_code: null, attempts: 1 };
      pubs.unshift(row);
      return row;
    },
    async updatePublication(pid, patch) {
      const row = pubs.find((x) => x.id === pid);
      if (!row) return null;
      if ((patch.status === "committing" || patch.status === "deploying") && pubs.some((x) => x.id !== pid && (x.status === "committing" || x.status === "deploying"))) return null;
      Object.assign(row, patch);
      return { ...row };
    },
    async publication(pid) { const r = pubs.find((x) => x.id === pid); return r ? { ...r } : null; },
    async publications(limit) { return pubs.slice(0, limit).map((r) => ({ ...r })); },
    async addEvent(e) { events.unshift({ id: events.length + 1, at: now(), actor_email: e.actor?.email ?? null, kind: e.kind, path: e.path ?? null, publication_id: e.publication_id ?? null, detail: e.detail ?? {} }); },
    async events({ path, limit }) { return events.filter((e) => !path || e.path === path).slice(0, limit); },
    async addFeedback(f, actor) { const row = { id: `00000000-0000-4000-9000-${String(feedback.length + 1).padStart(12, "0")}`, created_at: now(), created_by_email: actor.email, status: "open", resolution: null, resolved_at: null, ...f }; feedback.push(row); return row; },
    async feedback(status) { return feedback.filter((f) => status === "all" || f.status === "open"); },
    async resolveFeedback(fid, status, resolution) { const f = feedback.find((x) => x.id === fid); if (!f) return null; Object.assign(f, { status, resolution }); return f; },
  };
};

