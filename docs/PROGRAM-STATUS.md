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

DRIVER: session_01VP1RwsmUvWqEFAra4mTMdQ, claimed 2026-10-16T16:58:00Z, updated 2026-10-17T16:48:00Z

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
- **Second message of 16 October (current order):** finish B4 to B6, then quality passes Q1 to Q6, then
  backlog C, and only then every critical change in ONE pull request (D, the critical bundle). Until D is
  merged, /contact shows the email fallback: the form is behind `CONTACT_FORM_ENABLED = false`
  (`src/config/contact.ts`).
- **The complete program of 16 October (current, supersedes the earlier messages):** parts A (finish B5, B6,
  then the accessibility pass), B (quality passes), C (backlog), D (the critical bundle), E (enable the
  contact form after the bundle). **Reading:** only one branch may be pushed, so anything pushed while the
  bundle is open would land inside it. Part E.2 (backlog while the bundle waits) is therefore done
  **before** the bundle: all of part C first, then D, and the run stops once D is open. The "enable the
  contact form" pull request (E.1) is pushed only after the bundle has merged and Deploy Supabase has
  succeeded on the default branch.
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
| B4 | `/work` (filters, search, tag chips; "Coming soon" while empty) and `/work/:slug` (context, role, approach, outcome, gallery, links; JSON-LD only for real entries); `/journal` and `/journal/:slug` (tags, reading time, related posts) with `public/rss.xml`; one draft post (hidden); a message form on `/contact` through the existing form function (hook unchanged), **switched off** by `CONTACT_FORM_ENABLED = false` until the critical bundle hardens the function (the page shows the email fallback); "See all work" under each Selected work; unknown slugs and the 404 page get `noindex`. `/about` already exists and is unchanged | **Merged** (#33) |
| B5 | Ecosystem map (SVG, keyboard, plain list, reduced motion), questions and answers with anchors, Services structured data from the manifest; the existing owner-only slot (renders nothing for anyone else) | **Merged** (#34) |
| B6 | Site search: dialog (lazy chunk), Ctrl+K and "/", header button, index from the manifest and content | **Merged** (#35) |
| Q1 | Accessibility: skip link (first Tab stop, focuses `<main>`), one `<main>` on every public page (five pages gained one; /booking is in the bundle), a token focus outline everywhere, the /designs heading readable and still under reduced motion, search results announced; `a11y-check.mjs` adds landmark, language, title, duplicate-id and skip-link rules; new `keyboard-check.mjs` (menu, search, map). Errors: 0 (8 known on /booking) | **Merged** (#36) |
| Q2 | Performance: below-the-fold images lazy with their real width and height; the 3D hero loads as its own file; the /dev page stops downloading the whole icon library (its file: 760,559 to 21,657 bytes); new `scripts/dev/perf-check.mjs` (lab Core Web Vitals). Fonts: already `display=swap` with preconnect (index.html, unchanged). Every page route was already lazy. Report below | **Merged** (#37) |
| Q3 | Responsive: every non-critical route at 360, 390, 768, 1024 and 1366 px with no sideways scroll, and tap targets of at least 44 px on touch screens (a `(pointer: coarse)` rule for buttons in the page's header, content and footer, never checkboxes, switches, tabs or dialogs; 44 px hit areas for logos, back links, chips, map nodes, slider dots and La Rosa View links, also on touch screens only, so desktop is unchanged: logo position, header and footer heights measured identical to main). New `scripts/dev/responsive-check.mjs` (touch emulation, screenshots outside the repository). Warnings 258 before, 0 after on non-critical pages; /booking (critical) in the bundle | **Merged** (#38) |
| Q4 | SEO (non-critical part): canonical links, sitemap, robots.txt and rss.xml from the manifest and BASE_URL (already in place, now tested for every page and entry); per-page `og:url`, `twitter:url`, `og:type` (article for journal posts), `og:site_name`, `twitter:card` in RouteMeta; the smoke check compares canonical, og:url, og:title and description on every public page. Organization and WebSite JSON-LD were already there. The static share tags in `index.html` are critical (bundle) | **Merged** (#39) |
| Q5 | Errors and edge states: the 404 page and the public error boundary were already in the site's style; added a clear "This page could not load" message with Reload when a page's code cannot be downloaded (offline, or the site was updated), an error boundary (reset in place on each new address, so the workspace guards are never remounted) and a branded loading state around every route (the workspace and admin pages had plain text and no boundary), and an empty-list guard in the testimonials slider. Empty states: /work, /journal, Selected work, search, /reads filters all have one | **Merged** (#40) |
| Q6 | Content quality gate: `scripts/dev/content-gate.mjs` (no "not written yet" words in the visible text of any public page, no console error on any page; the owner's legal placeholders are listed, not counted) and `scripts/dev/assets.test.mjs` (500 KB image budget; the 10 oversized images already in the site are listed and may not grow). Dead links, alt text and duplicate slugs were already covered by link-check, a11y-check and the content test | **Merged** (#41) |
| Q7 | Docs refresh: runbook (content, contact form switch, every check script), security review (a status for every finding), content guide (where entries appear), trades integration (current state), tokens doc (now tested against `tokens.json`) | **Merged** (#42) |
| C1 | `/team` from `src/content/team.ts` (one real entry: the founder); `/about` already exists as a full page and is left unchanged (rewriting it would replace text the owner wrote) | **Merged** (#43) |
| C2 | `/services`: one section per vertical (anchors `#tech`, `#studio`, `#education`, `#management`) with what it does and who it is for, and the same Services structured data as `/ecosystem`; every `ServiceSection` now carries its id, so any section can be linked | **Merged** (#44) |
| C3 | `/brand-kit`: download the existing H mark and share image (no new files), linked from `/brand`. `/press` is skipped: there is no real press material to show (owner content) | In review |
| C4 | English/French structure: `src/content/i18n.ts` (languages, `Localized` type, `pick()` with English fallback, interface keys), no French text shipped (tested); `docs/translation.md` lists what needs a native reviewer, in order | In review |
| C5 | `/status`: the build version (the fingerprint of the main script) and its publication date (the server's Last-Modified, through `document.lastModified`), nothing else; linked from the footer. **Unverified:** whether Netlify sends Last-Modified for the page; without it browsers show the current time | In review |
| C6 | `/changelog`, generated by `scripts/dev/changelog.mjs` from the merged items of this file, with public wording from a fixed list only (owner, workspace, security and automation items never appear; tested); linked from `/status` | In review |
| C7 | Print stylesheet for the legal pages (`/terms`, `/privacy`, `/data-deletion`): plain black text on white, only the page's main content (no header, footer, cursor or search), the address of each outside link written after it, headings kept with their text; `LegalPageLayout` gains a `legal-page` class; `scripts/dev/print.test.mjs`; checked in headless Chromium with print media | In review |
| C8 | Prefetch: a public page's code is fetched when a link to it is hovered or focused, and four pages (`/about`, `/ecosystem`, `/work`, `/contact`) once the browser is idle; never workspace, admin, sign-in or owner-only pages, outside links, or when the visitor saves data or is on 2G (`src/routes/prefetchTarget.ts`, `src/lib/prefetch.ts`). The public pages' loaders live in `src/routes/pageLoaders.ts`, shared with `React.lazy`, so each file still downloads once. Tested (`scripts/dev/prefetch.test.mjs`) and checked headless: hover fetches the page, idle fetches the four. Cost: about 60 KB more script on the home page after it settles (1083 to 1143 KB in 5 s, phone); LCP unchanged | In review |
| C9 | Breadcrumbs and Back to top: a breadcrumb trail ("Home › Work › …", `aria-current` on the page) above every page built on the service or legal layout, from the manifest and content titles (`src/routes/breadcrumbs.ts`; none for home, private, owner-only or unknown addresses); the duplicate "All work" / "All posts" links at the top of an entry are replaced by it. A 44 px Back to top button appears after a screen and a half of scrolling, returns instantly under reduced motion, moves focus to the main content, and is hidden in print. Brand kit download buttons are 44 px on touch screens. `scripts/dev/breadcrumbs.test.mjs`; responsive check: 0 errors, 0 small targets | In review |
| C10 | `/sitemap`: every public page, grouped (Houcine.world, the four verticals, La Rosa View, about this site, legal), each with its one-line description, and published content entries under their list page; built from the manifest and the content layer (`src/routes/siteMap.ts`, a page with no group shows under "More" and fails the test); linked from the footer; added to `sitemap.xml`. `scripts/dev/sitemap-page.test.mjs` | In review |
| C11 | Case-study and journal-post templates (`src/content/templates.ts`): `caseStudyDraft` / `journalPostDraft` make a draft with a slug from the title and "TODO" texts that the content test refuses until written; `draftSource` prints it as TypeScript (`scripts/dev/new-entry.mjs`); the JSON-LD of a case study now comes from `caseStudyStructuredData`, and a published journal post gains `BlogPosting` data (`journalPostStructuredData`). Content guide updated. `scripts/dev/templates.test.mjs`; checked headless with the draft post published in a throwaway build (JSON-LD present, removed on leaving the page) | In review |
| C | Backlog left: content helpers | Pending |
| D | **Critical bundle** (one pull request, needs-owner): form function hardening, contact form on, other safe security fixes, headers and CSP, index.html share tags, CLAUDE.md and lockfile, BookingForm, the signed hand-off, setup screen, end-to-end checklist, `docs/owner-review-guide.md` | Pending (last; the run stops after opening it) |
| — | Earlier version 4 items 2 to 8 and critical (a) to (e) are folded into the rows above | |

## Performance report (Q2, lab numbers, headless Chromium on the session's computer, outside hosts blocked)

Entry script 601,289 bytes (gzip 178,399); 95 script files, 2,260,266 bytes in all. Phone = 390px with a 4x
slower CPU; desktop = 1366px. LCP and FCP in ms; CLS; TBT in ms; JS and images in KB loaded in 5 s.

| Route | Size | LCP before → after | CLS | TBT before → after | JS before → after | Images before → after |
| --- | --- | --- | --- | --- | --- | --- |
| / | phone | 1060 → 900 | 0.000 | 247 → 245 | 1084 → 1083 | 197 → 197 |
| /dev | phone | 924 → 748 | 0.000 | 192 → 105 | 1405 → 647 | 434 → 122 |
| /designs | phone | 1840 → 1588 | 0.001 | 142 → 69 | 657 → 656 | 470 → 470 |
| /larosaview | phone | 656 → 632 | 0.021 → 0.008 | 114 → 115 | 641 → 640 | 5052 → 2464 |
| /work | phone | 376 → 316 | 0.000 | 0 → 0 | 612 → 611 | 122 → 122 |
| / | desktop | 208 → 244 | 0.000 | 14 → 0 | 1084 → 1083 | 197 → 197 |
| /dev | desktop | 280 → 192 | 0.000 | 0 → 0 | 1405 → 647 | 434 → 122 |
| /designs | desktop | 1280 → 1228 | 0.001 | 0 → 0 | 657 → 656 | 470 → 470 |
| /larosaview | desktop | 328 → 224 | 0.010 → 0.000 | 17 → 0 | 641 → 640 | 3780 → 1193 |
| /work | desktop | 172 → 164 | 0.000 | 0 → 0 | 612 → 611 | 122 → 122 |

The /designs LCP is its letter-by-letter heading. The largest remaining weight is images (1 to 3 MB each,
listed under "Owner must fill"): smaller copies need the owner, because sessions add no image files.

## To resume

1. Check the newest pull request from the session branch: if open, wait; if merged, sync the branch.
2. Start the first item marked Pending.
