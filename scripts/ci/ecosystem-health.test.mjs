// The ecosystem health check (scripts/ci/ecosystem-health.mjs) with a fake network, and the workflow's limits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const H = await import("./ecosystem-health.mjs");
const workflow = readFileSync(new URL("../../.github/workflows/ecosystem-health.yml", import.meta.url), "utf8");

/** A fake fetch: `answers` maps a URL to [status, body], to an Error to throw, or to a list (one per attempt). */
const fakeFetch = (answers) => {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    let a = answers[url];
    if (Array.isArray(a) && Array.isArray(a[0])) a = a[Math.min(calls.filter((c) => c.url === url).length - 1, a.length - 1)];
    if (a instanceof Error) throw a;
    const [status, body] = a ?? [404, "not found"];
    return new Response(body, { status });
  };
  return { impl, calls };
};

const fakeGitHub = (existing = null, last = "") => {
  const writes = [];
  return {
    writes,
    findOpen: async () => existing,
    lastComment: async () => last,
    comment: async (n, body) => { writes.push({ kind: "comment", n, body }); return {}; },
    open: async (body) => { writes.push({ kind: "open", body }); return { number: 7 }; },
  };
};

const NOW = () => new Date("2026-10-17T12:00:00Z");
const noSleep = async () => {};
const PAGE = '<!doctype html><html><body><div id="root"></div></body></html>';
const OK = { "https://houcine.world/": [200, PAGE], [H.DEFAULT_TRADES_HEALTH_URL]: [200, "ok"] };
const go = (answers, gh, tradesUrl) => H.run({ fetchImpl: fakeFetch(answers).impl, github: gh, now: NOW, sleep: noSleep, tradesUrl });

test("both healthy: nothing is written, GET only, no credentials to the checked sites", async () => {
  const { impl, calls } = fakeFetch(OK);
  const gh = fakeGitHub();
  assert.deepEqual(await H.run({ fetchImpl: impl, github: gh, now: NOW, sleep: noSleep }), { result: "healthy", failures: [] });
  assert.deepEqual(gh.writes, []);
  assert.deepEqual(calls.map((c) => c.url).sort(), ["https://houcine.world/", H.DEFAULT_TRADES_HEALTH_URL].sort());
  for (const c of calls) {
    assert.equal(c.init.method, "GET");
    assert.equal(c.init.body, undefined);
    assert.equal(JSON.stringify(c.init.headers).toLowerCase().includes("authorization"), false);
  }
});

test("Trades says \"not ok\" twice: one new issue with the reason and how to stop it", async () => {
  const gh = fakeGitHub();
  const out = await go({ ...OK, [H.DEFAULT_TRADES_HEALTH_URL]: [503, "not ok"] }, gh);
  assert.equal(out.result, "opened #7");
  assert.deepEqual(out.failures, ['Houcine.Trades: HTTP 503 (answered "not ok")']);
  assert.equal(gh.writes.length, 1);
  assert.match(gh.writes[0].body, /2026-10-17T12:00:00\.000Z/);
  assert.match(gh.writes[0].body, /Disable workflow/);
});

test("a host that fails once and then answers is healthy (one retry)", async () => {
  const gh = fakeGitHub();
  const out = await go({ ...OK, [H.DEFAULT_TRADES_HEALTH_URL]: [[502, ""], [200, "ok"]] }, gh);
  assert.equal(out.result, "healthy");
  assert.deepEqual(gh.writes, []);
});

test("an open issue: a comment is added instead of a second issue; the cause code is kept", async () => {
  const gh = fakeGitHub({ number: 3, title: H.ISSUE_TITLE, comments: 1 });
  const err = Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
  const out = await go({ ...OK, "https://houcine.world/": err }, gh);
  assert.equal(out.result, "commented #3");
  assert.deepEqual(gh.writes.map((w) => [w.kind, w.n]), [["comment", 3]]);
  assert.match(gh.writes[0].body, /houcine\.world: no answer \(TypeError, ENOTFOUND\)/);
});

test("healthy again with the issue open: one recovered comment, not repeated", async () => {
  const gh = fakeGitHub({ number: 3, title: H.ISSUE_TITLE, comments: 2 }, "Health check at … found a problem");
  assert.equal((await go(OK, gh)).result, "recovered #3");
  assert.match(gh.writes[0].body, /^Recovered:/);
  const again = fakeGitHub({ number: 3, title: H.ISSUE_TITLE, comments: 3 }, "Recovered: both addresses answered");
  assert.equal((await go(OK, again)).result, "healthy");
  assert.deepEqual(again.writes, []);
});

test("not exactly ok, the wrong page, a redirect, or a 500 count as failures", async () => {
  for (const [status, body] of [[200, "not ok"], [200, "<html>ok</html>"], [301, ""], [500, "ok"]]) {
    const out = await go({ ...OK, [H.DEFAULT_TRADES_HEALTH_URL]: [status, body] }, fakeGitHub());
    assert.notEqual(out.result, "healthy", `${status} ${body}`);
  }
  for (const [status, body] of [[503, ""], [200, "<html>Site not found</html>"]]) {
    const out = await go({ ...OK, "https://houcine.world/": [status, body] }, fakeGitHub());
    assert.notEqual(out.result, "healthy", `houcine.world ${status}`);
  }
});

test("what a site answers cannot add a mention, a link or a line to the issue", async () => {
  const gh = fakeGitHub();
  await go({ ...OK, [H.DEFAULT_TRADES_HEALTH_URL]: [500, "@owner\n# [x](http://e.co)"] }, gh);
  assert.doesNotMatch(gh.writes[0].body, /@owner|\]\(|http:\/\/e/);
  assert.match(gh.writes[0].body, /answered "\?owner[A-Za-z0-9 ?]*"\)$/m, "only letters, digits, spaces and ? remain");
});

test("the repository variable: unset gives the default; anything invalid is reported, never replaced", async () => {
  assert.deepEqual(H.tradesHealthUrl(undefined), { url: H.DEFAULT_TRADES_HEALTH_URL });
  assert.deepEqual(H.tradesHealthUrl(""), { url: H.DEFAULT_TRADES_HEALTH_URL });
  assert.deepEqual(H.tradesHealthUrl("https://Trades.Houcine.World/healthz"), { url: "https://trades.houcine.world/healthz" });
  for (const bad of ["http://trades.houcine.world/healthz", "https://user:pw@trades.houcine.world/healthz", "https://trades.houcine.world/healthz?x=1", "https://evil.example/healthz", "https://127.0.0.1/healthz", "https://houcine.world.evil.example/healthz", "javascript:alert(1)", "not a url"]) {
    assert.ok(H.tradesHealthUrl(bad).error, bad);
  }
  const { impl, calls } = fakeFetch(OK);
  const gh = fakeGitHub();
  const out = await H.run({ fetchImpl: impl, github: gh, now: NOW, sleep: noSleep, tradesUrl: "https://evil.example/healthz" });
  assert.equal(out.result, "opened #7");
  assert.match(out.failures[0], /TRADES_HEALTH_URL must be a plain https address/);
  assert.ok(!calls.some((c) => c.url.includes("evil") || c.url === H.DEFAULT_TRADES_HEALTH_URL), "neither the bad address nor the old default is checked");
});

test("the GitHub client: this workflow's issue only, paginated, token only to api.github.com", async () => {
  const calls = [];
  const page1 = Array.from({ length: 100 }, (_, n) => ({ number: 100 + n, title: "Other", user: { login: "someone" } }));
  const page2 = [{ number: 1, title: H.ISSUE_TITLE, user: { login: "stranger" } }, { number: 2, title: H.ISSUE_TITLE, pull_request: {}, user: { login: H.BOT_LOGIN } }, { number: 3, title: H.ISSUE_TITLE, user: { login: H.BOT_LOGIN }, comments: 150 }];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    const body = url.includes("/issues?") ? (url.endsWith("page=1") ? page1 : page2) : url.includes("/comments?") ? [{ body: "first" }, { body: "last one" }] : { number: 9 };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const gh = H.createGitHub({ token: "t0k", repo: "o/r", fetchImpl });
  const issue = await gh.findOpen();
  assert.equal(issue.number, 3, "not a stranger's issue, not a pull request");
  assert.equal(await gh.lastComment(issue), "last one");
  await gh.comment(3, "x");
  await gh.open("y");
  assert.deepEqual(calls.map((c) => `${c.init.method ?? "GET"} ${c.url}`), [
    "GET https://api.github.com/repos/o/r/issues?state=open&per_page=100&page=1",
    "GET https://api.github.com/repos/o/r/issues?state=open&per_page=100&page=2",
    "GET https://api.github.com/repos/o/r/issues/3/comments?per_page=100&page=2",
    "POST https://api.github.com/repos/o/r/issues/3/comments",
    "POST https://api.github.com/repos/o/r/issues",
  ]);
  for (const c of calls) assert.ok(c.url.startsWith("https://api.github.com/"));
  const failing = H.createGitHub({ token: "t", repo: "o/r", fetchImpl: async () => new Response("{}", { status: 401 }) });
  await assert.rejects(failing.findOpen(), /HTTP 401/);
});

test("the workflow: every 30 minutes, contents read and issues write only, no stored credentials, no other secret", () => {
  assert.match(workflow, /cron: "\*\/30 \* \* \* \*"/);
  const perms = workflow.slice(workflow.indexOf("permissions:"), workflow.indexOf("concurrency:")).trim().split("\n").map((l) => l.trim());
  assert.deepEqual(perms, ["permissions:", "contents: read", "issues: write"]);
  assert.equal(workflow.match(/permissions:/g).length, 1, "no job-level permissions");
  assert.match(workflow, /persist-credentials: false/);
  assert.deepEqual([...workflow.matchAll(/\$\{\{\s*([^}]+?)\s*\}\}/g)].map((m) => m[1]).sort(), ["github.token", "vars.TRADES_HEALTH_URL"]);
  assert.match(workflow, /To stop it: Actions → Ecosystem health/);
});
