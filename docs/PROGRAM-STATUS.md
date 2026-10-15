# Houcine.world program, version 3: status

Updated after every item so an interrupted session can resume. One session branch,
`claude/upbeat-hamilton-ymyymq`, so items run strictly one at a time: one item per pull request, then
wait for its merge and sync the branch (`docs/automation.md`, section 7) before the next.

Earlier programs: automation (#6, #7), security review (#8), architecture and runbook (#9), 404 page
(#10), error boundaries (#11), /contact (#12), /ecosystem (#13), JSON-LD (#14), share image (#15,
merged by the owner), signed hand-off to Houcine.Trades (#16, merged by the owner).

| Item | What | Status |
| --- | --- | --- |
| 1 | Netlify paths on the critical list (`netlify/functions/**` added; `netlify.toml`, `public/_headers`, `public/_redirects` were already there) and the test | **Merged** (#17, by the owner) |
| 2 | `docs/security-fixes-proposed.md` (proposals as text, nothing applied) | In review |
| 3 | One BASE_URL for sitemap, robots and canonical links | Pending |
| 4 | Workspace mobile navigation | Pending |
| 5 | Workspace polish (empty, loading and error states, active page) | Pending |
| 6 | Accessibility pass on public pages with an offline checker | Pending |
| 7 | Performance pass with measured bundle sizes | Pending |
| 8 | Offline link checker and smoke check, in the runbook | Pending |
| 9 | Trivial lint fixes | Pending |
| French pages | Skipped, as asked | Skipped |
| Critical (a) | `public/_headers` and a CSP proposal | Pending |
| Critical (b) | `CLAUDE.md` with every rule | Pending |
| Critical (c) | Lockfile fix | Pending |
| Critical (d) | `index.html` share tags | Pending |

## To resume

1. Check the newest pull request from the session branch: if open, wait; if merged, sync the branch.
2. Start the first item marked Pending.
