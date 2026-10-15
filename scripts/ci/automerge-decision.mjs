// Pure auto-merge decision for .github/workflows/auto-merge.yml (see docs/automation.md).
// No network, no clock, no environment: the workflow gathers the facts, this module decides.
// FAIL CLOSED: any error, missing or unexpected fact means "skip" (no merge).

/**
 * No pull request is merged at or before this instant. Set in the past for this repository
 * (Netlify has no maintenance window to avoid), so the gate is effectively off; the check stays
 * so a future window can be set here, and an invalid clock still means no merge.
 */
export const NO_MERGE_BEFORE = "2020-01-01T00:00:00Z";

/** Check runs that must exist on the head commit and conclude "success" (the latest run of each counts). */
export const REQUIRED_CHECK_RUNS = Object.freeze(["typecheck-and-build"]);

/** Commit statuses that must be "success". Vercel statuses are deliberately not listed (ignored). */
export const REQUIRED_STATUSES = Object.freeze(["netlify/houcineworld/deploy-preview"]);

/** More changed files than this and the pull request is never auto-merged. */
export const MAX_FILES = 300;

const escapeRegExp = (ch) => ch.replace(/[.+^${}()|[\]\\]/g, "\\$&");

/**
 * Glob to RegExp. `**` matches across folders, `*` and `?` stay inside one folder.
 * A pattern without a slash (like `.env*`) matches that file name in any folder;
 * a leading slash anchors it to the repository root.
 */
export const globToRegExp = (pattern) => {
  let body = pattern.trim();
  const anchored = body.startsWith("/");
  if (anchored) body = body.slice(1);
  if (body.endsWith("/")) body += "**";
  const anywhere = !body.includes("/");
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "*" && body[i + 1] === "*") {
      if (body[i + 2] === "/") {
        out += "(?:.*/)?";
        i += 2;
      } else {
        out += ".*";
        i += 1;
      }
    } else if (ch === "*") {
      out += "[^/]*";
    } else if (ch === "?") {
      out += "[^/]";
    } else {
      out += escapeRegExp(ch);
    }
  }
  const prefix = anywhere && !anchored ? "^(?:.*/)?" : "^";
  return new RegExp(`${prefix}${out}$`);
};

export const matchesGlob = (path, pattern) => globToRegExp(pattern).test(path.replace(/^\.\//, ""));

/** One pattern or identifier per line; `#` starts a comment line. */
export const parsePatternList = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

/** Changed paths (including the old name of a renamed file) that match any critical pattern. */
export const findCriticalHits = (files, patterns) => {
  const hits = new Set();
  for (const file of files) {
    const paths = [file.filename, file.previous_filename].filter((p) => typeof p === "string" && p !== "");
    for (const p of paths) {
      if (patterns.some((pattern) => matchesGlob(p, pattern))) hits.add(p);
    }
  }
  return [...hits].sort();
};

/** Watch-list identifiers that appear anywhere in the diff text (added, removed or context lines). */
export const findWatchHits = (files, identifiers) => {
  const hits = new Set();
  for (const file of files) {
    const text = typeof file.patch === "string" ? file.patch : "";
    for (const id of identifiers) {
      if (text.includes(id)) hits.add(id);
    }
  }
  return [...hits].sort();
};

const latestRun = (runs, name) =>
  runs.filter((r) => r.name === name).sort((a, b) => Number(b.id) - Number(a.id))[0];

/**
 * Decide what to do with one pull request.
 * Returns { action: "merge" | "needs-owner" | "skip", reasons, retryable, criticalHits, watchHits }.
 * `retryable` is true only when every reason is a check that has not reported yet.
 */
export const decide = (facts) => {
  const reasons = [];
  let onlyPending = true;
  const blocked = (reason) => { reasons.push(reason); onlyPending = false; };
  const pending = (reason) => { reasons.push(reason); };
  const result = (action, extra = {}) => ({
    action, reasons, retryable: action === "skip" && reasons.length > 0 && onlyPending,
    criticalHits: [], watchHits: [], ...extra,
  });

  if (!facts || typeof facts !== "object" || !Array.isArray(facts.errors)) {
    blocked("facts missing");
    return result("skip");
  }
  if (facts.errors.length > 0) {
    for (const e of facts.errors) blocked(`error: ${e}`);
    return result("skip");
  }
  const pr = facts.pr;
  if (!pr || !Array.isArray(facts.files) || !Array.isArray(facts.checkRuns) || !Array.isArray(facts.statuses)) {
    blocked("pull request, files, checks or statuses missing");
    return result("skip");
  }
  if (!Array.isArray(facts.criticalPatterns) || facts.criticalPatterns.length === 0) {
    blocked("critical-path list missing or empty");
    return result("skip");
  }
  if (!Array.isArray(facts.watchList) || facts.watchList.length === 0) {
    blocked("content watch-list missing or empty");
    return result("skip");
  }

  const criticalHits = findCriticalHits(facts.files, facts.criticalPatterns);
  const watchHits = findWatchHits(facts.files, facts.watchList);
  if (criticalHits.length > 0 || watchHits.length > 0) {
    blocked("touches a critical path or a watch-list identifier");
    return result("needs-owner", { criticalHits, watchHits });
  }

  const labels = Array.isArray(pr.labels) ? pr.labels : [];
  if (pr.state !== "open") blocked("pull request is not open");
  if (pr.draft !== false) blocked("pull request is a draft");
  if (labels.includes("hold")) blocked("label hold");
  if (labels.includes("needs-owner")) blocked("label needs-owner (the owner merges by hand)");
  if (facts.runConclusion !== "success") blocked(`CI run concluded ${facts.runConclusion}`);
  if (facts.runHeadSha !== pr.headSha) blocked("CI run is not for the head commit");
  if (facts.latestHeadSha !== pr.headSha) blocked("head commit changed since the CI run");
  if (facts.filesComplete !== true) blocked("changed-file list incomplete");
  if (facts.files.length > MAX_FILES || !(Number(pr.changedFiles) <= MAX_FILES)) blocked(`more than ${MAX_FILES} changed files`);
  for (const file of facts.files) {
    if (file.status !== "removed" && typeof file.patch !== "string") blocked(`no diff text for ${file.filename}`);
  }

  for (const name of REQUIRED_CHECK_RUNS) {
    const latest = latestRun(facts.checkRuns, name);
    if (!latest) { pending(`required check ${name} missing`); continue; }
    if (latest.status !== "completed") pending(`required check ${name} still running`);
    else if (latest.conclusion !== "success") blocked(`required check ${name} concluded ${latest.conclusion}`);
  }
  for (const context of REQUIRED_STATUSES) {
    const status = facts.statuses.find((s) => s.context === context);
    if (!status || status.state === "pending") pending(`required status ${context} not reported yet`);
    else if (status.state !== "success") blocked(`required status ${context} is ${status.state}`);
  }

  const gate = Date.parse(NO_MERGE_BEFORE);
  const now = facts.now instanceof Date ? facts.now.getTime() : NaN;
  if (!(now > gate)) blocked(`not later than NO_MERGE_BEFORE (${NO_MERGE_BEFORE})`);

  return reasons.length === 0 ? result("merge") : result("skip");
};
