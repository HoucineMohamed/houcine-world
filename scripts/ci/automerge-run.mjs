// I/O side of the auto-merge workflow: gathers facts from the GitHub API, asks the pure
// decision module, then merges, labels or does nothing. Any thrown error means no merge.
// Called from .github/workflows/auto-merge.yml through actions/github-script.
import { decide, MAX_FILES, parsePatternList } from "./automerge-decision.mjs";

export const CRITICAL_PATHS_FILE = ".github/critical-paths.txt";
export const WATCHLIST_FILE = ".github/content-watchlist.txt";
export const COMMENT_MARKER = "<!-- automerge:needs-owner -->";

const readBaseFile = async (github, owner, repo, path, ref) => {
  const { data } = await github.rest.repos.getContent({ owner, repo, path, ref });
  if (Array.isArray(data) || data.type !== "file" || typeof data.content !== "string") {
    throw new Error(`${path} on ${ref} is not a file`);
  }
  return Buffer.from(data.content, data.encoding === "base64" ? "base64" : "utf8").toString("utf8");
};

const allPages = async (fetchPage, pick, maxPages) => {
  const items = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await fetchPage(page);
    const batch = pick(data);
    if (!Array.isArray(batch)) throw new Error("unexpected API response shape");
    items.push(...batch);
    if (batch.length < 100) return { items, complete: true };
  }
  return { items, complete: false };
};

/** Collect every fact decide() needs for one pull request. Errors are recorded, never thrown. */
export const gatherFacts = async ({ github, owner, repo, prNumber, run, now }) => {
  const facts = {
    errors: [], runConclusion: run.conclusion, runHeadSha: run.head_sha, latestHeadSha: undefined,
    pr: undefined, files: undefined, filesComplete: false, checkRuns: undefined, statuses: undefined,
    criticalPatterns: undefined, watchList: undefined, now: now(),
  };
  try {
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
    facts.pr = {
      number: pr.number, state: pr.state, draft: pr.draft, labels: (pr.labels ?? []).map((l) => l.name),
      headSha: pr.head?.sha, baseRef: pr.base?.ref, changedFiles: pr.changed_files,
    };

    facts.criticalPatterns = parsePatternList(await readBaseFile(github, owner, repo, CRITICAL_PATHS_FILE, pr.base.ref));
    facts.watchList = parsePatternList(await readBaseFile(github, owner, repo, WATCHLIST_FILE, pr.base.ref));

    if (Number(pr.changed_files) > MAX_FILES) {
      facts.files = [];
      facts.filesComplete = false;
    } else {
      const files = await allPages(
        (page) => github.rest.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100, page }),
        (data) => data,
        Math.ceil(MAX_FILES / 100) + 1,
      );
      facts.files = files.items;
      facts.filesComplete = files.complete && files.items.length === Number(pr.changed_files);
    }

    const checks = await allPages(
      (page) => github.rest.checks.listForRef({ owner, repo, ref: pr.head.sha, per_page: 100, page }),
      (data) => data.check_runs,
      10,
    );
    if (!checks.complete) throw new Error("check runs list incomplete");
    facts.checkRuns = checks.items.map((c) => ({ id: c.id, name: c.name, status: c.status, conclusion: c.conclusion }));

    const statuses = await allPages(
      (page) => github.rest.repos.getCombinedStatusForRef({ owner, repo, ref: pr.head.sha, per_page: 100, page }),
      (data) => data.statuses,
      10,
    );
    if (!statuses.complete) throw new Error("status list incomplete");
    facts.statuses = statuses.items.map((s) => ({ context: s.context, state: s.state }));

    // Read the head again last: if anything was pushed meanwhile, decide() refuses.
    const { data: again } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
    facts.latestHeadSha = again.head?.sha;
  } catch (error) {
    facts.errors.push(error instanceof Error ? error.message : String(error));
  }
  return facts;
};

const flagNeedsOwner = async ({ github, owner, repo, prNumber, decision, labels }) => {
  if (labels.includes("needs-owner")) return "already flagged";
  await github.rest.issues.addLabels({ owner, repo, issue_number: prNumber, labels: ["needs-owner"] });
  const { data: comments } = await github.rest.issues.listComments({ owner, repo, issue_number: prNumber, per_page: 100 });
  if (comments.some((c) => typeof c.body === "string" && c.body.includes(COMMENT_MARKER))) return "label added";
  const lines = [
    COMMENT_MARKER,
    "This pull request needs the owner's review and manual merge, because it touches:",
    ...decision.criticalHits.map((p) => `- critical path \`${p}\``),
    ...decision.watchHits.map((id) => `- watch-list identifier \`${id}\` in the diff`),
    "",
    "Auto-merge will not merge it. See docs/automation.md.",
  ];
  await github.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: lines.join("\n") });
  return "label and comment added";
};

/**
 * Main loop. Finds the open pull requests whose head is the completed CI run's commit, then for
 * each one decides and acts. Waits (bounded) while required checks have not reported yet.
 * Returns a list of { prNumber, action, reasons } for the job summary. Never deletes a branch.
 */
export const runAutoMerge = async ({ github, owner, repo, run, now, sleep, log = () => {}, attempts = 20, waitMs = 30_000 }) => {
  const outcomes = [];
  let prNumbers = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const open = await allPages(
        (page) => github.rest.pulls.list({ owner, repo, state: "open", per_page: 100, page }),
        (data) => data,
        10,
      );
      prNumbers = open.items.filter((p) => p.head?.sha === run.head_sha).map((p) => p.number);
    } catch (error) {
      log(`listing pull requests failed: ${error instanceof Error ? error.message : String(error)}`);
      return [{ prNumber: null, action: "skip", reasons: ["could not list pull requests"] }];
    }
    if (prNumbers.length > 0 || attempt === attempts) break;
    await sleep(waitMs); // the session-pr workflow may still be opening the pull request
  }
  if (prNumbers.length === 0) return [{ prNumber: null, action: "skip", reasons: ["no open pull request for this commit"] }];

  for (const prNumber of prNumbers) {
    let decision;
    let facts;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      facts = await gatherFacts({ github, owner, repo, prNumber, run, now });
      decision = decide(facts);
      if (!decision.retryable || attempt === attempts) break;
      log(`#${prNumber}: waiting (${decision.reasons.join("; ")})`);
      await sleep(waitMs);
    }
    try {
      if (decision.action === "merge") {
        await github.rest.pulls.merge({
          owner, repo, pull_number: prNumber, merge_method: "squash", sha: facts.pr.headSha,
        });
        outcomes.push({ prNumber, action: "merged", reasons: [] });
      } else if (decision.action === "needs-owner") {
        const what = await flagNeedsOwner({ github, owner, repo, prNumber, decision, labels: facts.pr.labels });
        outcomes.push({ prNumber, action: "needs-owner", reasons: [what, ...decision.criticalHits, ...decision.watchHits] });
      } else {
        outcomes.push({ prNumber, action: "skip", reasons: decision.reasons });
      }
    } catch (error) {
      outcomes.push({ prNumber, action: "skip", reasons: [`action failed: ${error instanceof Error ? error.message : String(error)}`] });
    }
  }
  return outcomes;
};
