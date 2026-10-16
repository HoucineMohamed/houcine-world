# Houcine.world program, version 4 (build the site): status

Updated after every item so an interrupted session can resume. One session branch,
`claude/upbeat-hamilton-ymyymq`, so items run strictly one at a time: one item per pull request, then
wait for its merge and sync the branch (`docs/automation.md`, section 7) before the next. Version 4
replaces version 3; finished version 3 items are kept below.

## Driver

DRIVER: session_01YPgKc4KaGJPX6EDp5wNDGW, claimed 2026-10-15T17:39:24Z, updated 2026-10-15T18:36:00Z

The branch was quiet for more than 60 minutes (no push, no open pull request) before this claim.
Before starting any item, re-fetch and check for a newer DRIVER line; if one exists, stand down at
once and discard any unpushed work.

### Deploy verification gap

GitHub's commit-status and deployments APIs show nothing for this repo's Netlify production
deploys (checked on several already-merged commits, including #23) — only a pull request's
deploy-preview gets a GitHub check (`netlify/houcineworld/deploy-preview`). A "Vercel" commit
status was observed pending on at least one commit; it is a separate, parallel integration that
auto-merge already ignores. This means production-deploy success cannot be confirmed through
GitHub tools alone after a merge to `main` — this is pre-existing and not caused by any item in
this program. No diagnostic workflow was added for this, since `.github/**` is a critical path.

Earlier programs: automation (#6, #7), security review (#8), architecture and runbook (#9), 404 page
(#10), error boundaries (#11), /contact (#12), /ecosystem (#13), JSON-LD (#14), share image (#15,
merged by the owner), signed hand-off for the owner entries (#16, merged by the owner).

| Item | What | Status |
| --- | --- | --- |
| v3-1 | Netlify paths on the critical list (`netlify/functions/**` added; the other three were already there) | **Merged** (#17, by the owner) |
| 0.1 | `docs/security-fixes-proposed.md` (proposals as text, nothing applied) | **Merged** (#18) |
| 0.2 | One `BASE_URL` for sitemap, robots and per-page canonical links | **Merged** (#19) |
| 0.3 | Workspace mobile navigation (menu sheet on phones, same links and role checks) | **Merged** (#20) |
| 0.4 | Offline smoke, link and accessibility checks (`scripts/dev`); fixed 2 broken images and the missing main heading on /review | **Merged** (#21) |
| 0.4b | Accessibility fixes in non-critical files: checker errors 60 before, 0 after (7 known on /booking, a critical file) | **Merged** (#22) |
| 0.5 | Performance pass with measured bundle sizes (route-level `React.lazy`/`Suspense`; main bundle 2,917 kB/gzip 731 kB before, now a shared 593 kB/gzip 177 kB chunk plus a per-page chunk) | **Merged** (#24) |
| 0.6 | Trivial lint fixes (`npm run lint`: 6 errors/13 warnings before; fixed the 5 type/style-only errors with no behavior change, left the 1 error in a critical file (`src/integrations/supabase/previewAuthStorage.ts`) and all 13 warnings alone — fixing those would mean a behavior or structural change, not "trivial") | **Merged** (#26) |
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
