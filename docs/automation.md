# How changes reach the live site (automation)

This page explains, in plain words, how work done by Claude sessions becomes a pull request and
how it gets merged. **Sessions never merge anything themselves.** Two GitHub Actions workflows
do it, under strict rules, and anything sensitive waits for you.

## 1. The three workflows

| Workflow | File | What it does |
| --- | --- | --- |
| **CI** | `.github/workflows/ci.yml` | On every push to `main` or a `claude/...` branch (and on pull requests): installs, **typechecks**, **builds** and runs the automation's own tests. Its job is called `typecheck-and-build`. It does not run lint, because the repository already has old lint errors. |
| **session-pr** | `.github/workflows/session-pr.yml` | When a session pushes a `claude/...` branch: if no pull request is open for that branch and the branch is different from `main`, it opens one. Title: the first line of the newest commit message. Text: all commit messages. Label: `auto`. If there is no difference, it does nothing. |
| **auto-merge** | `.github/workflows/auto-merge.yml` | Every time a CI run finishes: looks for the open pull request whose newest commit is the one CI just checked, and **squash-merges** it only if every rule in section 2 holds. Otherwise it does nothing, or asks for you (section 4). It never deletes a branch. |

The auto-merge workflow always runs **the copy on `main`**, and it reads its lists from `main` too.
So a pull request can never change the rules that judge it.

## 2. The rules (all must hold, otherwise no merge)

The decision is made by `scripts/ci/automerge-decision.mjs`, a small program with no network
access, tested by `scripts/ci/*.test.mjs`.

1. **Required checks are green** on the newest commit:
   - `typecheck-and-build` (the CI job), and
   - `netlify/houcineworld/deploy-preview` (Netlify's deploy preview).
   If one has not reported yet, auto-merge waits up to about 10 minutes, then gives up (no merge).
   Vercel's statuses are ignored.
2. The pull request is **open**, **not a draft**, and has **no `hold`** (or `needs-owner`) label.
3. The commit CI checked is **still the newest** commit of the pull request (nothing was pushed
   meanwhile). The merge itself is also pinned to that commit.
4. The **complete list of changed files** could be read (more than 300 files: never merged), and
   every changed file has its diff text available.
5. **No critical file** is touched (section 3), and the diff contains **no watch-list word**.
6. The time is **later than** `NO_MERGE_BEFORE` = 15 October 2026, 04:00 (UTC+1).
7. **Any error or missing information means no merge.**

## 3. Critical files and watch-list words

- **Critical files** are listed in `.github/critical-paths.txt`: the automation itself, `.env` files,
  everything Supabase, login, magic-link, session and role code, Brand Admin management, Connected
  Accounts, bookings, analytics, the private Houcine.Trades entries, `package.json` and the lockfiles,
  build settings, `public/_redirects`, `public/_headers`, `netlify.toml` and `index.html`.
- **Watch-list words** are in `.github/content-watchlist.txt`: `platform_role`, `super_admin`,
  `supabase.auth`, `service_role`. If any of them appears anywhere in the changes, it is treated like
  a critical file.

Changing either list is itself a critical change, so only you can merge it.

## 4. "needs-owner": when the robot stops and asks you

If a pull request touches a critical file or a watch-list word, auto-merge adds the label
**`needs-owner`** and writes **one comment** listing exactly what it found. It will not merge it.

To approve it (in the browser):

1. Open the pull request on GitHub (the "Pull requests" tab).
2. Read the comment and look at "Files changed".
3. Check the Netlify deploy preview link in the checks list.
4. If you agree, click **Squash and merge**, then **Confirm**. If not, leave a comment or close it.

## 5. How to pause or stop it

- **Pause one pull request:** add the label **`hold`** (right side of the pull request, "Labels").
  Remove it to allow merging again; the next CI run will be judged again.
- **Stop everything:** on GitHub, open **Actions**, pick **auto-merge** (or **session-pr**) on the
  left, click the **"..."** button and choose **Disable workflow**. Enable it again the same way.

## 6. One-time settings you must tick (only you can)

1. **Settings → Actions → General → Workflow permissions:** choose **Read and write permissions**,
   and tick **Allow GitHub Actions to create and approve pull requests**. Click **Save**.
2. **Settings → General → Pull Requests:** make sure **Allow squash merging** is ticked, and that
   **Automatically delete head branches** is **not** ticked (sessions reuse their branch).
3. **Labels:** open **Issues → Labels** (or the "Labels" page of the repository) and check that
   `auto`, `hold` and `needs-owner` exist. The workflows create `auto` and `needs-owner` the first
   time they use them; you can create `hold` yourself with **New label**.

No secret, token or extra account is needed: the workflows use GitHub's built-in, short-lived token,
with only these permissions: CI reads code; session-pr reads code and writes pull requests;
auto-merge writes code (to merge) and pull requests, and reads checks and statuses.

## 7. After a squash merge: how a session syncs its branch

A squash merge puts the whole pull request on `main` as **one new commit**, so GitHub no longer
sees the session branch's own commits as merged. Before starting the next piece of work, a session
must, on its own branch and without force-pushing, resetting or rewriting history:

1. Fetch `main`.
2. Make an ordinary merge commit that links the histories but takes no content:
   `git merge -s ours origin/main -m "Record the squash merge of <item>"`.
3. Make one commit that makes the branch's files exactly equal to `main`
   (`git checkout origin/main -- .`, plus `git rm` for files that no longer exist there).
4. Check that `git diff origin/main HEAD` prints nothing and that `origin/main` is an ancestor of
   the branch, then push normally (fast-forward).

If `main` simply contains the branch already (an ordinary merge), a plain fast-forward is enough.

## 8. What is NOT automated

- The **first** automation pull request touches `.github/**`, so **you merge it by hand**.
- Anything on the critical list, and the lockfile fix, always wait for you.
- Nobody deploys by hand: Netlify deploys `main` after a merge, as before.
