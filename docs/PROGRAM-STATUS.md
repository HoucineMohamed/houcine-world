# Houcine.world overnight program: status

Updated after every item so an interrupted session can resume. One session branch,
`claude/upbeat-hamilton-ymyymq`, so items run strictly one at a time. Automation rules:
`docs/automation.md`.

| Item | What | Status |
| --- | --- | --- |
| Automation | CI, session-pr, auto-merge, tested decision script (pull request #6) | **Merged** in `main` (#6) |
| A | Automation amendment: time gate off, auto-merge every 15 minutes and on "Run workflow", tests, docs | **Merged** (#7, by the owner) |
| 2 | docs/security-review.md (read-only review) | **Merged** (#8, by auto-merge) |
| 3 | docs/architecture.md and docs/runbook.md | **Merged** (#9) |
| 4 | Designed 404 page | **Merged** (#10) |
| 5 | Error boundaries and loading skeletons for public routes | In review |
| 6 | /contact page (mailto from CONTACT_EMAIL) | Pending |
| 7 | /about page for the ecosystem (from the brief only) | Pending |
| 8 | JSON-LD for Organization and WebSite via RouteMeta | Pending |
| 9 | Default share image public/og-default.png | Pending |
| 10 | BASE_URL constant, sitemap, robots, per-page canonicals | Pending |
| 11 | Workspace mobile navigation | Pending |
| 12 | Accessibility pass with an offline checker | Pending |
| 13 | Performance pass with measured bundle sizes | Pending |
| 14 | Offline link checker | Pending |
| 15 | French home, /about, /contact, /manages | Pending |
| 16 | Trivial lint fixes | Pending |
| 17 | public/_headers and a CSP proposal (critical) | Pending |
| 18 | CLAUDE.md with every rule (critical) | Pending |
| 19 | Lockfile fix (critical) | Pending |
| 20 | index.html share tags (critical) | Pending |

## To resume after the owner merges A

1. Sync the session branch with `main` (`docs/automation.md`, section 7).
2. Start item 2. One item, one push, then poll its pull request every 3 minutes until merged.
