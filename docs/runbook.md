# Runbook: common tasks, step by step

Everything here is done in the browser. When a step says "edit a file", the simplest way is to ask a
Claude session to do it (it opens a pull request that merges itself if it is not critical). You can
also edit on GitHub: open the file, click the pencil, change it, choose **"Create a new branch for this
commit and start a pull request"**, then merge that pull request yourself.

## Add a portfolio item ("Selected work")

1. Open `src/content/management.ts` (the Houcine.management page; other pages can get the same kind of
   file later).
2. Add an entry inside the square brackets, for example:

   ```ts
   { title: "Project name", summary: "One or two plain sentences.", tags: ["Brand strategy"] },
   ```

   Optional fields: `href` (an internal address such as `/larosaview`, or an `https://` address you
   own), and `image` with `imageAlt` (the image must be a file in `src/assets/`, imported at the top of
   the file). Only add real, published work you have the right to show.
3. While the list is empty, the page shows "Coming soon".

## Change the public contact email

1. Open `src/config/contact.ts`.
2. Put your address between the quotes: `export const CONTACT_EMAIL = "you@example.com";`
3. Until it is set, the "Get in touch" buttons say "Contact details coming soon".

## Fill in the legal placeholders

1. Open `src/data/legal.ts`.
2. Replace each value in square brackets: `[LEGAL ENTITY NAME]`, `[GOVERNING JURISDICTION]`,
   `[CONTACT EMAIL FOR PRIVACY / LEGAL REQUESTS]`, `[POSTAL ADDRESS]`.
3. Update `LEGAL_LAST_UPDATED` to today's date.
4. Have the Terms, Privacy and Data Deletion pages reviewed by a professional before relying on them.

## Change the site address or add a public page

The address `https://houcine.world` is written once, as `BASE_URL` in `src/config/site.ts`. The list of
public pages (title, description) is `src/config/routes.ts`. Canonical links follow both
automatically. `public/sitemap.xml` and `public/robots.txt` are written from them by
`scripts/dev/seo-files.mjs`: after changing either file, ask a session to run it (it also has a
`--check` mode that only reports whether the two files are out of date).

## Check the site before a release (scripts a session runs)

Three offline checks live in `scripts/dev/`. They serve the built site on the session's own computer and
open it in a local headless Chromium that cannot reach the internet. You do not run them yourself: ask
a session to "run the smoke, link and accessibility checks" and to report the results.

| Script | What it checks |
| --- | --- |
| `smoke.mjs` | Builds the site, then opens every public page at 1366px and 390px: the right title, exactly one main heading, no horizontal scroll, no console errors, no outside host beyond the known list, and no trace of the owner-only entries (pages, sitemap, robots.txt, main bundle). Problems in critical files are listed as "known" with the fix to approve. |
| `link-check.mjs` | Links to pages that do not exist, `#anchors` with no target, images that do not load, and public pages that no other page links to. Outside links are listed by host, never visited. |
| `keyboard-check.mjs` | The skip link, the phone menu (opens with Enter, keeps focus inside, closes with Escape), search (Ctrl+K and "/", results announced, Enter and Escape) and the ecosystem map (every node reached with Tab, with a visible focus). |
| `a11y-check.mjs` | One main landmark, page language and title, no duplicate ids, the skip link first, heading order, form labels, image alt text, names of links and buttons, contrast of the design tokens, reduced motion; warnings for focus outlines and estimated text contrast. |

Each is run as `node --experimental-strip-types scripts/dev/<script> ` (add `--build` to build first for the
link and accessibility checks; `--no-build` skips the build of the smoke check). A non-zero exit means at
least one problem was found.

## Preview a change before it goes live

1. Open the pull request on GitHub.
2. In the checks list near the bottom, find **netlify/houcineworld/deploy-preview** and click
   **Details**. This opens the preview site for exactly that pull request.
3. Look at the pages it changes, signed out and (if relevant) signed in.

## Roll back a bad deploy on Netlify

1. Go to app.netlify.com, open the **houcineworld** site, then **Deploys**.
2. Click the last deploy that was good (it shows the commit message and time).
3. Click **Publish deploy**. The live site switches back at once.
4. Then fix or revert the change on GitHub; otherwise the next merge publishes it again. On the merged
   pull request, GitHub offers a **Revert** button that opens a new pull request undoing it.

## Pause the automation

- **One pull request:** add the label **hold** (right side of the pull request, "Labels"). Remove it to
  allow merging again.
- **Everything:** **Actions** tab → pick **auto-merge** (or **session-pr**) → **"..."** → **Disable
  workflow**. Enable it the same way.

## Approve a "needs-owner" pull request

1. Open the pull request. The bot's comment lists the sensitive files or words it found.
2. Read **Files changed**, and open the Netlify deploy preview (see above).
3. If you agree: **Squash and merge**, then **Confirm**. If not: leave a comment, or **Close pull request**.

## Set up, rotate or stop the Houcine.Trades signed hand-off

The full explanation is in `docs/trades-integration.md`, section 9. In short:

1. **Only after Houcine.Trades has its `/sso` page:** sign in to the workspace as super admin, open
   `/workspace/ecosystem`, and under "Private apps" click **Single sign-on setup → Create a new key pair**.
2. On Netlify (Site configuration → Environment variables), add:
   - `SSO_PRIVATE_KEY`: the private key (mark it secret);
   - `OWNER_USER_ID`: your user id from Supabase (Authentication → Users);
   - `TRADES_AUDIENCE`: the Houcine.Trades host, for example `houcine-trades.onrender.com`;
   - check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` exist there too.
3. Paste the public key into the Houcine.Trades settings page.
4. Redeploy: Netlify → Deploys → **Trigger deploy**.
5. Test: click the Houcine.Trades card. It should open Houcine.Trades signed in (or at its authenticator
   step). If it opens the normal sign-in page, one setting is missing or wrong.

**Rotate:** repeat steps 1 to 4 with a new key pair. **Stop:** disable `/sso` in Houcine.Trades, or delete
`SSO_PRIVATE_KEY` on Netlify and redeploy; the entries then open the normal sign-in page.

## If something looks wrong with sign-in

Do not change anything in Supabase or the code in a hurry. Note what you see (the page, the message,
the time), roll back the last deploy if it started after a merge, and ask a session to investigate with
read-only checks first.
