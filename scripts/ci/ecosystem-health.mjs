// The ecosystem health check (.github/workflows/ecosystem-health.yml, every 30 minutes). It makes two read-only
// GET requests, houcine.world and the Houcine.Trades public health address (which answers only "ok" or "not ok"),
// and when one fails it opens, or adds a comment to, ONE GitHub issue titled "Ecosystem health" (opened by this
// workflow), and the run turns red. When everything is healthy again it adds one "recovered" comment. It writes
// nothing else, sends no secret anywhere (the GitHub token goes only to api.github.com) and never closes or edits
// anything. Tested in scripts/ci/ecosystem-health.test.mjs with a fake network and a fake clock.
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const ISSUE_TITLE = "Ecosystem health";
export const BOT_LOGIN = "github-actions[bot]";
export const DEFAULT_TRADES_HEALTH_URL = "https://houcine-trades.onrender.com/healthz";
export const RECOVERED = "Recovered:";
const TIMEOUT_MS = 20_000;
const RETRY_AFTER_MS = 30_000;
const MAX_PAGES = 5;

/**
 * The Houcine.Trades address from the repository variable TRADES_HEALTH_URL: unset or empty gives the default; a
 * value that is not a plain https address on houcine.world or onrender.com is an error (reported as a failure,
 * never silently replaced, so a typo cannot keep the check on an old address).
 */
export const tradesHealthUrl = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === "") return { url: DEFAULT_TRADES_HEALTH_URL };
  let u;
  try {
    u = new URL(String(raw).trim());
  } catch {
    return { error: "TRADES_HEALTH_URL is not a valid address" };
  }
  const host = u.hostname.toLowerCase();
  const allowed = host === "houcine.world" || host.endsWith(".houcine.world") || host.endsWith(".onrender.com");
  if (u.protocol !== "https:" || !allowed || u.username || u.password || u.search || u.hash || u.port) {
    return { error: "TRADES_HEALTH_URL must be a plain https address on houcine.world or onrender.com" };
  }
  return { url: `https://${host}${u.pathname}` };
};

/** The two checks. houcine.world must answer 200 with the app's page; Houcine.Trades exactly "ok". */
export const targets = (tradesUrl) => [
  { name: "houcine.world", url: "https://houcine.world/", ok: (status, body) => status === 200 && body.includes('<div id="root">') },
  { name: "Houcine.Trades", url: tradesUrl, ok: (status, body) => status === 200 && body.trim() === "ok" },
];

/** Only letters, digits and spaces of what a site answered, so an answer cannot add a mention, a link or a line. */
const snippet = (body) => body.trim().slice(0, 20).replace(/[^A-Za-z0-9 ]/g, "?");

/** One attempt: never throws; a timeout, a redirect or any network error is a failure with a short reason. */
const attempt = async (target, fetchImpl) => {
  try {
    const res = await fetchImpl(target.url, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "houcine-world-health-check" } });
    const body = (await res.text()).slice(0, 4000);
    if (target.ok(res.status, body)) return null;
    return `${target.name}: HTTP ${res.status}${target.name === "Houcine.Trades" ? ` (answered "${snippet(body)}")` : ""}`;
  } catch (e) {
    const code = e?.cause?.code ? `, ${String(e.cause.code).replace(/[^A-Z0-9_]/g, "")}` : "";
    return `${target.name}: no answer (${e instanceof Error ? e.name : "error"}${code})`;
  }
};

/** One check with one retry after a pause (a sleeping host may need a moment to wake). */
export const check = async (target, fetchImpl, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) => {
  const first = await attempt(target, fetchImpl);
  if (first === null) return null;
  await sleep(RETRY_AFTER_MS);
  return attempt(target, fetchImpl);
};

/** The text written to the issue: the time, the failures, and where to look. No secret, no header. */
export const report = (failures, nowIso) =>
  [
    `Health check at ${nowIso} found a problem:`,
    "",
    ...failures.map((f) => `- ${f}`),
    "",
    "What to do: docs/ecosystem-owner-runbook.md, section 4 (decision tree).",
    "To stop this check: Actions → Ecosystem health → … → Disable workflow.",
  ].join("\n");

/** Minimal GitHub client: find this workflow's one open issue, read its last comment, comment, open. */
export const createGitHub = ({ token, repo, fetchImpl }) => {
  const api = async (path, init = {}) => {
    const res = await fetchImpl(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "content-type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GitHub API ${init.method ?? "GET"} ${path.split("?")[0]}: HTTP ${res.status}`);
    return res.json();
  };
  return {
    findOpen: async () => {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const list = await api(`/issues?state=open&per_page=100&page=${page}`);
        if (!Array.isArray(list)) throw new Error("GitHub API: unexpected issue list");
        const found = list.find((i) => i.title === ISSUE_TITLE && !i.pull_request && i.user?.login === BOT_LOGIN);
        if (found) return found;
        if (list.length < 100) return null;
      }
      return null;
    },
    lastComment: async (issue) => {
      if (!issue.comments) return "";
      const page = Math.ceil(issue.comments / 100);
      const list = await api(`/issues/${issue.number}/comments?per_page=100&page=${page}`);
      return Array.isArray(list) && list.length ? String(list[list.length - 1].body ?? "") : "";
    },
    comment: (number, body) => api(`/issues/${number}/comments`, { method: "POST", body: JSON.stringify({ body }) }),
    open: (body) => api(`/issues`, { method: "POST", body: JSON.stringify({ title: ISSUE_TITLE, body }) }),
  };
};

/**
 * Runs the checks. Returns { result, failures }: result is "healthy", "recovered #n" (one comment on an open issue
 * when things are healthy again), "commented #n" or "opened #n".
 */
export const run = async ({ tradesUrl, fetchImpl, github, now = () => new Date(), sleep }) => {
  const resolved = tradesHealthUrl(tradesUrl);
  const checks = targets(resolved.url ?? DEFAULT_TRADES_HEALTH_URL).filter((t) => !(resolved.error && t.name === "Houcine.Trades"));
  const failures = [...(resolved.error ? [`Houcine.Trades: ${resolved.error} (not checked)`] : []), ...(await Promise.all(checks.map((t) => check(t, fetchImpl, sleep)))).filter(Boolean)];
  const existing = await github.findOpen();
  if (failures.length === 0) {
    if (existing && !(await github.lastComment(existing)).startsWith(RECOVERED)) {
      await github.comment(existing.number, `${RECOVERED} both addresses answered normally at ${now().toISOString()}. Close this issue when you have read it.`);
      return { result: `recovered #${existing.number}`, failures };
    }
    return { result: "healthy", failures };
  }
  const body = report(failures, now().toISOString());
  if (existing) {
    await github.comment(existing.number, body);
    return { result: `commented #${existing.number}`, failures };
  }
  const created = await github.open(body);
  return { result: `opened #${created.number}`, failures };
};

/** True when this file is the script node was asked to run (robust to symlinks and unusual characters). */
const isMain = () => {
  try {
    return Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
};

// Entry point in the workflow: the run is red whenever something failed, so it shows in the Actions list too.
if (isMain()) {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, TRADES_HEALTH_URL } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.error("GITHUB_TOKEN and GITHUB_REPOSITORY are required");
    process.exit(1);
  }
  const github = createGitHub({ token: GITHUB_TOKEN, repo: GITHUB_REPOSITORY, fetchImpl: fetch });
  run({ tradesUrl: TRADES_HEALTH_URL, fetchImpl: fetch, github }).then(
    ({ result, failures }) => {
      for (const f of failures) console.error(`Failure: ${f}`);
      console.log(`Ecosystem health: ${result}`);
      if (failures.length > 0) process.exitCode = 1;
    },
    (e) => {
      console.error(`Ecosystem health: could not report (${e instanceof Error ? e.message : "error"})`);
      process.exit(1);
    },
  );
}
