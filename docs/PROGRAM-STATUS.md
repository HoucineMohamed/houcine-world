# Houcine.world program, version 4 (build the site): status

Updated after every item so an interrupted session can resume. One session branch,
`claude/upbeat-hamilton-ymyymq`, so items run strictly one at a time: one item per pull request, then
wait for its merge and sync the branch (`docs/automation.md`, section 7) before the next. Version 4
replaces version 3; finished version 3 items are kept below.

Earlier programs: automation (#6, #7), security review (#8), architecture and runbook (#9), 404 page
(#10), error boundaries (#11), /contact (#12), /ecosystem (#13), JSON-LD (#14), share image (#15,
merged by the owner), signed hand-off for the owner entries (#16, merged by the owner).

| Item | What | Status |
| --- | --- | --- |
| v3-1 | Netlify paths on the critical list (`netlify/functions/**` added; the other three were already there) | **Merged** (#17, by the owner) |
| 0.1 | `docs/security-fixes-proposed.md` (proposals as text, nothing applied) | **Merged** (#18) |
| 0.2 | One `BASE_URL` for sitemap, robots and per-page canonical links | In review |
| 0.3 | Workspace mobile navigation | Pending |
| 0.4 | Offline accessibility checker, link checker and smoke script (`scripts/dev`) | Pending |
| 0.5 | Performance pass with measured bundle sizes | Pending |
| 0.6 | Trivial lint fixes | Pending |
| 1 | Route manifest, typed content layer, validators, `docs/content-guide.md` | Pending |
| 2 | `/work` hub and case-study template | Pending |
| 3 | `/journal` with one draft post | Pending |
| 4 | Ecosystem map and "How the ecosystem works" | Pending |
| 5 | Command palette search | Pending |
| 6 | `/brand` living style guide | Pending |
| 7 | Workspace launch checklist (owner only, presentational) | Pending |
| 8 | Documentation: architecture, runbook, roadmap | Pending |
| Critical (a) | Phase 0 and 1 scripts in CI | Pending |
| Critical (b) | `public/_headers` and a CSP proposal | Pending |
| Critical (c) | `CLAUDE.md` with every rule | Pending |
| Critical (d) | Lockfile fix | Pending |
| Critical (e) | `index.html` share tags | Pending |

## To resume

1. Check the newest pull request from the session branch: if open, wait; if merged, sync the branch.
2. Start the first item marked Pending.
