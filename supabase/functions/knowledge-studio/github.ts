// The repository adapter of Knowledge Studio: GitHub's REST API over fetch (no SDK, no new dependency). It reads the
// brain's Markdown at the branch head and publishes by writing ONE commit (Git Data API: blobs -> tree -> commit ->
// fast-forward the branch, never forced), so a publication is atomic: the notes and the rebuilt index change together
// or not at all. Pure apart from the injected fetch; tested with a fake (scripts/ci/knowledge-studio.test.mjs).
//
// Token: KNOWLEDGE_GITHUB_TOKEN, a fine-grained token for this one repository with Contents read/write and Actions
// read/write (docs/knowledge-studio.md). It is only ever sent in the Authorization header; errors are reduced to
// short codes and never carry the token, a URL with it, or GitHub's message.

import type { Commit, Repo, RepoErrorCode, RepoFile } from "./core.ts";

export interface GithubOptions {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  /** The deploy workflow's file name. */
  workflow: string;
  /** Only files under this folder are read. */
  brainDir: string;
  fetch: typeof fetch;
  timeoutMs?: number;
}

const API = "https://api.github.com";

export const createGithubRepo = (o: GithubOptions): Repo => {
  const base = `${API}/repos/${encodeURIComponent(o.owner)}/${encodeURIComponent(o.repo)}`;
  const blobCache = new Map<string, string>(); // a blob sha always names the same bytes

  const call = async (path: string, init: { method?: string; body?: unknown; accept?: string } = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), o.timeoutMs ?? 15_000);
    try {
      const res = await o.fetch(`${base}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Authorization: `Bearer ${o.token}`,
          Accept: init.accept ?? "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "houcine-world-knowledge-studio",
          ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      });
      return res;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const errorFor = async (res: Response | null): Promise<RepoErrorCode> => {
    if (!res) return "unavailable";
    let message = "";
    try {
      const data = await res.json();
      message = typeof data?.message === "string" ? data.message.toLowerCase() : "";
    } catch {
      // not JSON
    }
    if (message.includes("protected branch") || message.includes("protected") && res.status !== 401) return "protected";
    if (res.status === 401 || res.status === 403) return "auth";
    if (res.status === 404) return "not_found";
    if (res.status === 409 || (res.status === 422 && message.includes("fast forward"))) return "conflict";
    return "unavailable";
  };

  const json = async (path: string) => {
    const res = await call(path);
    if (!res || !res.ok) return { ok: false as const, error: await errorFor(res) };
    try {
      return { ok: true as const, data: await res.json() };
    } catch {
      return { ok: false as const, error: "unavailable" as RepoErrorCode };
    }
  };

  const decode = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

  return {
    mode: "github",

    async head() {
      const r = await json(`/git/ref/heads/${encodeURIComponent(o.branch)}`);
      if (!r.ok) return r;
      const sha = r.data?.object?.sha;
      return typeof sha === "string" ? { ok: true, commit: sha } : { ok: false, error: "unavailable" };
    },

    async files(commit) {
      const c = await json(`/git/commits/${commit}`);
      if (!c.ok) return c;
      const tree = await json(`/git/trees/${c.data?.tree?.sha}?recursive=1`);
      if (!tree.ok) return tree;
      if (tree.data?.truncated) return { ok: false, error: "unavailable" };
      const prefix = `${o.brainDir}/`;
      const entries = (Array.isArray(tree.data?.tree) ? tree.data.tree : []).filter(
        (e: { path?: string; type?: string }) =>
          e.type === "blob" && typeof e.path === "string" && e.path.startsWith(prefix) && e.path.endsWith(".md") &&
          !e.path.slice(prefix.length).split("/").some((part: string) => part.startsWith(".")),
      );
      const out: RepoFile[] = [];
      for (let i = 0; i < entries.length; i += 8) {
        const batch = entries.slice(i, i + 8);
        const texts = await Promise.all(batch.map(async (e: { path: string; sha: string }) => {
          const hit = blobCache.get(e.sha);
          if (hit !== undefined) return hit;
          const b = await json(`/git/blobs/${e.sha}`);
          if (!b.ok || typeof b.data?.content !== "string") return null;
          const text = decode(b.data.content);
          blobCache.set(e.sha, text);
          return text;
        }));
        for (let j = 0; j < batch.length; j++) {
          const text = texts[j];
          if (text === null || text === undefined) return { ok: false, error: "unavailable" };
          out.push({ path: batch[j].path.slice(prefix.length), sha: batch[j].sha, text });
        }
      }
      return { ok: true, files: out };
    },

    async commit({ parent, message, changes }) {
      const parentCommit = await json(`/git/commits/${parent}`);
      if (!parentCommit.ok) return parentCommit;
      const tree: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];
      for (const change of changes) {
        if (change.content === null) {
          tree.push({ path: change.path, mode: "100644", type: "blob", sha: null });
          continue;
        }
        const blob = await call("/git/blobs", { method: "POST", body: { content: change.content, encoding: "utf-8" } });
        if (!blob || !blob.ok) return { ok: false, error: await errorFor(blob) };
        const sha = (await blob.json())?.sha;
        if (typeof sha !== "string") return { ok: false, error: "unavailable" };
        tree.push({ path: change.path, mode: "100644", type: "blob", sha });
      }
      const newTree = await call("/git/trees", { method: "POST", body: { base_tree: parentCommit.data?.tree?.sha, tree } });
      if (!newTree || !newTree.ok) return { ok: false, error: await errorFor(newTree) };
      const treeSha = (await newTree.json())?.sha;
      const newCommit = await call("/git/commits", { method: "POST", body: { message, tree: treeSha, parents: [parent] } });
      if (!newCommit || !newCommit.ok) return { ok: false, error: await errorFor(newCommit) };
      const commitSha = (await newCommit.json())?.sha;
      if (typeof commitSha !== "string") return { ok: false, error: "unavailable" };
      // Fast-forward only: if the branch moved since `parent`, GitHub refuses and nothing changes.
      const ref = await call(`/git/refs/heads/${encodeURIComponent(o.branch)}`, { method: "PATCH", body: { sha: commitSha, force: false } });
      if (!ref || !ref.ok) return { ok: false, error: await errorFor(ref) };
      return { ok: true, commit: commitSha };
    },

    async history(path) {
      const r = await json(`/commits?path=${encodeURIComponent(path)}&sha=${encodeURIComponent(o.branch)}&per_page=20`);
      if (!r.ok || !Array.isArray(r.data)) return [];
      return r.data.map((c: { sha: string; commit?: { message?: string; author?: { name?: string; date?: string } } }): Commit => ({
        sha: c.sha,
        date: c.commit?.author?.date ?? "",
        message: (c.commit?.message ?? "").split("\n")[0]!.slice(0, 200),
        author: c.commit?.author?.name ?? "",
      }));
    },

    async fileAt(commit, path) {
      const res = await call(`/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${commit}`, { accept: "application/vnd.github.raw+json" });
      if (!res || !res.ok) return null;
      return await res.text();
    },

    async deployRun(commit, since) {
      const r = await json(`/actions/workflows/${encodeURIComponent(o.workflow)}/runs?branch=${encodeURIComponent(o.branch)}&per_page=10`);
      if (!r.ok) return "unknown";
      const after = Date.parse(since) - 120_000;
      const runs = (Array.isArray(r.data?.workflow_runs) ? r.data.workflow_runs : []).filter(
        (run: { created_at?: string }) => Date.parse(run.created_at ?? "") >= after,
      );
      const run = runs.find((x: { head_sha?: string }) => x.head_sha === commit) ?? runs[0];
      if (!run) return "none";
      if (run.status !== "completed") return run.status === "queued" || run.status === "waiting" || run.status === "pending" ? "queued" : "in_progress";
      return run.conclusion === "success" ? "success" : "failure";
    },

    async dispatchDeploy() {
      const res = await call(`/actions/workflows/${encodeURIComponent(o.workflow)}/dispatches`, { method: "POST", body: { ref: o.branch } });
      return Boolean(res && (res.status === 204 || res.ok));
    },
  };
};

/** Read-only repository over the notes bundled with this deployment (no GitHub token configured). */
export const createSnapshotRepo = (files: { path: string; text: string }[]): Repo => ({
  mode: "snapshot",
  head: async () => ({ ok: true, commit: "snapshot" }),
  files: async () => ({ ok: true, files: files.map((f) => ({ ...f, sha: "" })) }),
  commit: async () => ({ ok: false, error: "not_configured" }),
  history: async () => [],
  fileAt: async () => null,
  deployRun: async () => "unknown",
  dispatchDeploy: async () => false,
});
