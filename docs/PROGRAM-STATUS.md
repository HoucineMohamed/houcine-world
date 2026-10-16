# Houcine.world program: status

Updated after every item so an interrupted session can resume. One session branch,
`claude/upbeat-hamilton-ymyymq`, so items run strictly one at a time: one item per pull request, then
wait for its merge and sync the branch (`docs/automation.md`, section 7) before the next.

## Owner must fill

These are placeholders on purpose; no session invents them.

| What | Where | Today |
| --- | --- | --- |
| Legal entity name | `src/data/legal.ts` | `[LEGAL ENTITY NAME]` |
| Governing jurisdiction | `src/data/legal.ts` | `[GOVERNING JURISDICTION]` |
| Privacy / legal contact email | `src/data/legal.ts` | `[CONTACT EMAIL FOR PRIVACY / LEGAL REQUESTS]` |
| Postal address | `src/data/legal.ts` | `[POSTAL ADDRESS]` |
| Public contact email | `src/config/contact.ts` (`CONTACT_EMAIL`) | empty: "Contact details coming soon" |
| Selected work (projects you may show) | `src/content/management.ts` | empty: "Coming soon" |
| Testimonials on /designs and /reads | existing page data | already in the code before this program; please confirm they are real, or ask for placeholders |
| Decide on the email escaping fix | `docs/security-fixes-proposed.md`, section (c) | the /contact message form (B4) uses the existing form function, whose notification emails do not escape the visitor's text (security review H3); the fix is ready as text, applying it is your decision |
| Smaller copies of the large images (1 to 3 MB each, e.g. `the-view-cover.png`, `houcine-photo.jpg`) | `src/assets/` | sessions may not add image files |

## Driver

DRIVER: session_01VP1RwsmUvWqEFAra4mTMdQ, claimed 2026-10-16T16:58:00Z, updated 2026-10-16T17:40:00Z

The previous claim (session_01YPgKc4KaGJPX6EDp5wNDGW, updated 2026-10-15T18:36:00Z) was about 22 hours
old, no pull request was open, and the owner named this session the only driver. Before starting any
item, re-fetch and check for a newer DRIVER line; never push while another claim is fresher than 30
minutes.

## The owner's brief of 16 October: order and readings

Decisions taken without asking (the owner asked for no questions; the safest reading is recorded here):

- **"Version 4 item 1"** means: (a) a typed route manifest `src/routes/manifest.ts` (path, title,
  description, indexable, sitemap priority, owner-only) that RouteMeta, `sitemap.xml` and `robots.txt`
  are checked against by a test; (b) a typed content layer `src/content/*.ts` (services, work, journal,
  team, testimonials, faq) with schemas and a validating test; (c) `docs/content-guide.md`. Three small
  pull requests, tests first.
- **Order:** Phase 1 (design tokens and /brand) first, as the brief says; then version 4 item 1 (the
  three pull requests above); then Phase 3; the critical part of Phase 2 last (see the next point).
- **Where Phase 2 goes:** almost all of it is in critical files (`src/components/owner/**`,
  `netlify/functions/**`, `src/config/trades.ts`). With one branch, an open needs-owner pull request blocks
  every later push, so the non-critical Phase 2 part (the "return to Houcine.world" convention, docs) goes
  in the normal order, and the critical part is opened **last**, as the one needs-owner pull request of
  this run; the run stops there.
- **"20 minutes after each merge" (Phase 3):** a pause of 20 minutes after each Phase 3 merge before the
  next push, so the deploy of the previous item settles.
- **Schema library:** zod 3.25.76 is already a dependency (`package.json`), so the schemas use it.
- **Tests:** the repository's only test runner is `node --test` (`scripts/ci/*.test.mjs`, run by CI). New
  tests that CI should run would live in `scripts/ci/`, which is a critical path, so they are kept in
  `scripts/dev/` (runnable, not yet in CI) until the owner merges a critical pull request that adds them
  to CI.

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
| — | **Brief of 16 October (current)** | |
| B0 | Driver claim, branch sync, this status update | **Merged** (#28) |
| B1 | Design tokens: `docs/ecosystem-design-tokens.md`, `src/design/tokens.json` with a check against `src/index.css` (`scripts/dev/tokens.test.mjs`), public `/brand` page | **Merged** (#29). **Tokens published, Trades can rebrand.** |
| B2 | Signed hand-off: setup screen steps, branded "Opening…" state, errors and fallback, tests; "return to Houcine.world" convention | Pending |
| B3a | Route manifest `src/routes/manifest.ts`: RouteMeta, sitemap (now with priorities) and robots.txt come from it; `route()` makes an unknown top-level path a type error (the build fails); `scripts/dev/manifest.test.mjs` checks nested routes and the two files | **Merged** (#30) |
| B3b | Typed content layer `src/content/` (services, work, journal, team, testimonials, faq) with zod schemas and `validateContent` (`src/content/schema.ts`); `scripts/dev/content.test.mjs`. Work, journal and testimonials ship empty; /manages reads its "Selected work" from `work.ts` | **Merged** (#31) |
| B3c | `docs/content-guide.md`: add a project, a journal post, a testimonial, in plain words, all in the browser (the examples were run through the validator) | **Merged** (#32) |
| B4 | `/work` (filters, search, tag chips; "Coming soon" while empty) and `/work/:slug` (context, role, approach, outcome, gallery, links; JSON-LD only for real entries); `/journal` and `/journal/:slug` (tags, reading time, related posts) with `public/rss.xml`; one draft post (hidden); a message form on `/contact` through the existing form function (hook unchanged); "See all work" under each Selected work; unknown slugs and the 404 page get `noindex`. `/about` already exists and is unchanged | In review |
| B5 | Ecosystem map; Services structured data from the manifest | Pending |
| B6 | Site search (client-side dialog, keyboard shortcut) | Pending |
| B7 | Performance and accessibility pass (skip link, landmarks, Core Web Vitals run, 390 px) | Pending |
| B8 | SEO: Open Graph per page from the manifest, sitemap; `index.html` share tags as a needs-owner pull request | Pending |
| B9 | Docs: runbook, security review refresh, content guide, glossary | Pending |
| — | Earlier version 4 items 2 to 8 and critical (a) to (e) are folded into B1 to B9 above | |

## To resume

1. Check the newest pull request from the session branch: if open, wait; if merged, sync the branch.
2. Start the first item marked Pending.
