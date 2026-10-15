# Morning report (overnight program, 15 October 2026)

## In one paragraph

Nine pull requests were merged: two by you (the automation and its amendment) and seven by the
automation itself (items 2 to 8). The program then **stopped at item 9**: its pull request (#15) adds
a PNG image, and auto-merge refuses any change it cannot read as text ("missing information means no
merge"). With only one branch, nothing else was pushed on top of it. Items 10 to 20 were not started.

## What was merged

| Pull request | Item | Merged by |
| --- | --- | --- |
| #6 | The automation: CI, session-pr, auto-merge, the tested decision script | You |
| #7 | Amendment A: time gate off, auto-merge every 15 minutes and on "Run workflow" | You |
| #8 | 2. Read-only security review (`docs/security-review.md`) | auto-merge |
| #9 | 3. Architecture and runbook docs | auto-merge |
| #10 | 4. Designed 404 page | auto-merge |
| #11 | 5. Error boundary and loading skeleton for public pages | auto-merge |
| #12 | 6. `/contact` page (mailto from `CONTACT_EMAIL`, empty for now) | auto-merge |
| #13 | 7. Ecosystem page at `/ecosystem` (see decisions below) | auto-merge |
| #14 | 8. Structured data (JSON-LD) for search engines | auto-merge |

Every item was typechecked and built, rendered signed out at 1366px and 390px with no console errors,
no new hosts, and no trace of the private Houcine.Trades entries in the public HTML, sitemap, robots
file or main bundle.

## What is waiting for you

**#15, item 9: the default share image.** It adds `public/og-default.png` (1200x630, an original
text wordmark: "Houcine.world", the site's existing description, and the four vertical names, in the
site's black-and-grey colours) and makes every page's share tags point to
`https://houcine.world/og-default.png`.
- *What approving changes:* links shared on social apps can show this image once crawlers read the
  tags (most crawlers read `index.html`, which item 20 will update).
- *Risk:* low. One image file and a few lines in `src/components/RouteMeta.tsx` and `src/config/site.ts`.
- *Why it did not merge itself:* GitHub shows no text diff for an image, and the rules treat that as
  missing information. That is the rule working as designed.
- *Optional follow-up (a critical change you would merge):* allow auto-merge to accept new or changed
  image files (`.png`, `.jpg`, `.webp`) outside the critical paths, under a size limit. Without it, every
  future image needs your merge.

## Content and decisions only you can supply

- **Legal placeholders** in `src/data/legal.ts`: `[LEGAL ENTITY NAME]`, `[GOVERNING JURISDICTION]`,
  `[CONTACT EMAIL FOR PRIVACY / LEGAL REQUESTS]`, `[POSTAL ADDRESS]`. Then have Terms, Privacy and Data
  Deletion reviewed by a professional.
- **Contact email:** `CONTACT_EMAIL` in `src/config/contact.ts` (empty: every "Get in touch" says
  "Contact details coming soon"). The existing Education page already uses `contact@houcine.world`; it
  may be the right one.
- **Real portfolio items** for "Selected work" (`src/content/management.ts`, empty: shows "Coming soon").
- **The French pages** (item 15) were not started, so there is nothing to review yet.
- **Decision: `/about` versus `/ecosystem`.** `/about` was already your personal page (`AboutMe`, linked
  from the home header), so the ecosystem page was built at `/ecosystem` and links to `/about`. If you
  prefer `/about` to be the ecosystem page, say so and where the personal page should move.
- **Decision from earlier:** the Tech, Studio and Education service pages (`/dev`, `/designs`, `/reads`)
  are still the existing full pages with prices and forms; nothing was rebuilt.

## Found during the night (not fixed, outside what a session may change)

- **Security (see `docs/security-review.md`):** most important is C1. If Supabase still allows anyone
  to sign up, a stranger could create an account and read every form submission and subscriber email.
  Also H1 (`services` table open to signed-in users), H2 (no rate limits on public forms) and H3 (user text
  pasted unescaped into notification emails). All need migration or edge-function changes, which are yours.
- **"Deploy Supabase" workflow fails** with "Invalid access token": the repository secret
  `SUPABASE_ACCESS_TOKEN` is wrong or expired.
- **The `/booking` page is wider than the screen** (it scrolls sideways on phones). This was already the
  case before tonight; the booking page is on the critical list, so it was not touched.
- **Squash commit messages are long:** each squash merge lists the earlier items' commit messages too,
  because the session branch keeps its history. Harmless; GitHub lets you edit the message when you merge
  by hand.

## What I could NOT verify

- Your real login, the Supabase roles, and the workspace pages as super admin or Brand Admin.
- The Supabase dashboard (whether sign-ups are open, secrets) and the live response headers.
- The Netlify deploy previews by eye (only that their checks passed).
- How social apps actually display the share image.

## Your next steps (in the browser)

1. **Merge #15:** open https://github.com/HoucineMohamed/houcine-world/pull/15, check the Netlify
   deploy preview, then **Squash and merge** and **Confirm**.
2. **Supabase dashboard → Authentication → Sign In / Providers:** check "Allow new users to sign up".
   If it is on, turning it off closes C1. Note that new workspace members then need to be invited from
   the dashboard (Authentication → Users → Invite user) before they can sign in.
3. **Fix the Supabase deploy token:** Supabase → Account → Access Tokens → create a new token; then GitHub
   → Settings → Secrets and variables → Actions → `SUPABASE_ACCESS_TOKEN` → Update.
4. **Restart the program** in a new session message ("continue the overnight program"): it resumes at
   item 10 (`docs/PROGRAM-STATUS.md`).
