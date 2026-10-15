# Houcine.world enhancement program: status

Updated after every item so an interrupted session can resume. Session branch:
`claude/upbeat-hamilton-ymyymq`. Automation rules: `docs/automation.md`.

| Item | What | Status |
| --- | --- | --- |
| 1 | Automation: CI, session-pr and auto-merge workflows, the tested decision script, critical-path list and watch-list, docs | **Done, waiting for the owner.** Pushed to the session branch. It touches `.github/**`, so the owner must merge it by hand (it will be labelled `needs-owner` only once auto-merge exists on `main`). |
| 2 | Domain and search follow-up (houcine.world base address, canonical links, absolute share images) | Pending (blocked by item 1) |
| 3 | Workspace mobile navigation | Pending (blocked by item 1) |
| 4 | Accessibility and performance pass on public pages | Pending (blocked by item 1) |
| 5 | Trivial lint fixes; lockfile fix prepared for owner approval | Pending (blocked by item 1) |

## Why items 2 to 5 wait

All items share the one session branch. Until item 1 is merged, any new commit would join item 1's
pull request, and auto-merge (which must run from `main`) does not exist yet.

## To resume after the owner merges item 1

1. Sync the session branch with `main` as described in `docs/automation.md`, section 7.
2. Start item 2. Split it: the safe part first (sitemap, robots, the base-address constant, per-page
   canonical links), then a separate pull request for `index.html`, which is critical.
