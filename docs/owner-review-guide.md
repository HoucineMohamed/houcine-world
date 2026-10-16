# Owner review guide: the critical bundle

This pull request holds every change that only you may approve: the form function, the security headers,
the database rules, the booking form, `index.html`, CI and the Houcine.Trades hand-off. It is labelled
**needs-owner**, so it never merges by itself. Everything below is done in the browser.

Read the five lettered steps first (they are the order to follow), then the commit-by-commit notes.

## The five steps, in order

### a) Before merging: replace the `SUPABASE_ACCESS_TOKEN` secret

**Why:** the Deploy Supabase workflow has been failing with "Invalid access token" (security review, L6), so
nothing merged to `main` in `supabase/` has reached the live project. This bundle contains a database
migration and depends on Deploy Supabase running; with a bad token it would stop again (this time with a clear
message, but still deploying nothing).

1. Open **supabase.com/dashboard/account/tokens** (signed in to the account that owns the project).
2. **Generate new token**, name it for example `github-deploy`, copy it (it is shown once).
3. Optional but tidy: on the same page, **revoke** the old token you no longer use.
4. Open the repository on GitHub → **Settings** → **Secrets and variables** → **Actions** →
   `SUPABASE_ACCESS_TOKEN` → **Update** → paste → **Update secret**.
5. Check it: GitHub → **Actions** → **Deploy Supabase** → **Run workflow** (on `main`). The first step,
   "Check the access token", should say "The access token works". (The rest of the run deploys what `main`
   already has, which is safe.)

### b) The Edge Function secrets (names only)

The form function now takes its sender and recipients from secrets, never from the code:

| Secret | What to put |
| --- | --- |
| `NOTIFY_FROM` | the sender, for example `Houcine.world <notifications@houcine.world>`; the domain must be verified in your mail service (Resend → Domains) |
| `NOTIFY_TO` | the inbox for every page except La Rosa View |
| `NOTIFY_TO_LAROSAVIEW` | the inbox for La Rosa View and its booking form (if left out, `NOTIFY_TO` is used) |
| `RESEND_API_KEY` | already set; leave it |

Click path: **supabase.com/dashboard** → the project → **Edge Functions** → **Secrets** (in some versions:
Project Settings → Edge Functions) → **Add new secret** → name and value → **Save**. Set them before step d.
Until they exist, forms are still saved (you see them in the workspace and `/admin`) but no email is sent, and
the visitor is still told it worked. The function's logs then say which secret is missing (by name, never its
value): Supabase → **Edge Functions** → `send-notification` → **Logs**.

### c) Review and merge

1. Open the pull request and read this guide and the **Files changed** tab.
2. In the checks list, open **netlify/houcineworld/deploy-preview** → **Details** (the preview site).
3. Check the preview in three states:
   - **Signed out:** the home page, `/booking` (no sideways scroll on your phone; tapping a field label puts
     the cursor in it), `/contact` (still shows the email fallback: the form is off), `/terms`. No Houcine.Trades
     card anywhere.
   - **Signed in as a Brand Admin:** `/workspace` works as before (dashboard, bookings, settings); no
     Houcine.Trades entries, no Private apps section.
   - **Signed in as the super admin:** `/workspace/ecosystem` → Private apps → Single sign-on setup shows the
     checklist; clicking a Houcine.Trades card shows "Opening Houcine.Trades…" (on the preview it will end on
     "not set up yet" or an error, because the preview has no hand-off variables; that is expected).
4. If all is well: **Squash and merge** → **Confirm**.

### d) After merging: confirm the deploy, then test the contact form

1. GitHub → **Actions** → **Deploy Supabase**: the run for the merge must be green. It applies the new
   migration (security fixes) and deploys the functions in its list.
2. **The form function is not in that list** (it never was; the bundle does not change what the workflow
   deploys). To put the hardened `send-notification` live, choose one:
   - Supabase dashboard → **Edge Functions** → `send-notification` → deploy the code from the repository
     (the dashboard's editor or its "Deploy" option, if offered), or
   - on GitHub, edit `.github/workflows/supabase-deploy.yml`: in the last step add `send-notification` to the
     list of functions, commit on a new branch, open a pull request and merge it (needs-owner); the next
     Deploy Supabase run deploys it.
3. A session then opens a tiny pull request that switches the `/contact` form on. Once it is merged, open
   `https://houcine.world/contact`, send a short test message with your own email address.
4. **What arrives:** one email at the `NOTIFY_TO` inbox, **from** the `NOTIFY_FROM` sender, with the subject
   "New Contact from Houcine.world", showing your name, email and message as plain text. A booking from
   `/booking` arrives at `NOTIFY_TO_LAROSAVIEW` with "New DJ Booking Request from Booking".

### e) The Houcine.Trades hand-off

1. On Netlify: **Site configuration** → **Environment variables** → add `SSO_PRIVATE_KEY`, `OWNER_USER_ID` and
   `TRADES_AUDIENCE` with the scopes **Production** and **Functions**, and check that `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` also include **Functions**. The setup screen on `/workspace/ecosystem` shows
   the values and the order.
2. **Deploys** → **Trigger deploy** → **Deploy site**.
3. Run the one-time end-to-end check: `docs/trades-integration.md`, section 10.

## Commit by commit

Each commit can be undone on its own: on the merged pull request, GitHub offers **Revert** (it opens a new pull
request that undoes everything); to undo one commit only, ask a session to revert that commit. Rolling back a
deploy at once: Netlify → **Deploys** → the last good deploy → **Publish deploy**.

1. **Harden send-notification.** (Its tests run in CI through `scripts/ci/send-notification.test.mjs`; for that,
   `.github/workflows/ci.yml` now runs the CI tests with Node's `--experimental-strip-types`, so they can import the
   function's TypeScript rules directly. That one line is the only change to `ci.yml`.)
   - *What:* the form function escapes every value in the email, removes line breaks and control characters
     from the subject, accepts only the known fields with length limits (refuses anything else), ignores
     robots that fill the hidden field (they get the same "success" answer, nothing is saved), accepts calls
     only from houcine.world, www.houcine.world and the Netlify site and previews, and limits each address to
     5 requests in 10 minutes. The limit is **best-effort**: it lives in the function's memory, each running
     copy counts on its own and a restart clears it. It also refuses a request when the platform does not say
     who is calling; if every form suddenly answers "Too many requests", look in the function's logs for
     "the platform sent no caller address". Sender and recipients come from the secrets (step b); logs hold no
     name, email, message or secret. The answers have the same shape as before (a newsletter sign-up now
     answers "Subscribed successfully" whether or not the address was already there, so nobody can test which
     addresses are subscribed). Calls from your own computer's development server (`http://localhost:8080`)
     are allowed too. 21 tests and 24 deliberate breaks run in CI. The Dev and Designs forms get the same
     length limits in the browser, so a visitor cannot type more than the function accepts.
   - *Check:* after step d, send the test message; send one with `<b>hi</b>` in it: the email shows the
     tags as text, not bold.
   - *Roll back:* revert the commit and deploy the function again (step d.2).
2. **`supabase/functions/**` on its own line in the critical paths.** *What:* the edge functions stay
   owner-only even if the wider `supabase/**` line is ever narrowed. *Check:* nothing to see. *Roll back:*
   revert.
3. **Deploy Supabase: clear message when the token is wrong.** *What:* a first step checks the token and stops
   with what to do; comments list what is deployed (unchanged). *Check:* step a.5. *Roll back:* revert.
4. **The safe security fixes** (one migration). *What:* `services` gets row-level security (everyone signed in
   reads, only the super admin writes); form submissions and subscribers are readable only by an admin or the
   super admin; the direct anonymous inserts into those two tables are removed (forms go through the function);
   a signed-in user may change only their own name in their profile. Nothing about signing in changes. If a
   policy added by hand in the dashboard still leaves those two tables open (for anonymous visitors, or with a
   condition that is simply "true"), the migration stops and undoes itself, and Deploy Supabase fails with a
   message naming the policy: remove it in Supabase → Authentication → Policies and re-run the workflow. Not
   applied, with a sentence each: `docs/security-fixes-proposed.md`. *Check:* as the super admin, `/admin` still
   lists submissions and the workspace brand pages still show their service; as a Brand Admin, the workspace
   works as before. *Roll back:* this one is in the database; reverting the commit does not undo it. Ask a
   session for a follow-up migration that restores the previous policies (they are written in the old
   migrations), and merge it.
5. **Security headers.** *What:* other sites may not show houcine.world inside a frame; forms may post only to
   the site; no plugins; browsers remember HTTPS for a year (no subdomains, no preload list); a "report-only"
   list of allowed hosts blocks nothing and only writes notes in the browser console. *Check:* on the live site,
   open any page, then the browser's developer tools → Console: no red "Refused to…" lines (lines starting
   "[Report Only]" are notes, not errors; tell a session if you see any). *Roll back:* revert (headers change at
   the next deploy; the HTTPS memory stays in visitors' browsers for its year, which is harmless).
6. **`index.html` share tags.** *What:* link previews use `https://houcine.world/` and the site's own share
   image instead of the old builder preview address. *Check:* paste `https://houcine.world` into a chat that
   shows previews, or a preview-checking site. *Roll back:* revert.
7. **CLAUDE.md and dependency notes.** *What:* instructions for future sessions; the three lockfiles are
   described, **not** changed (`docs/dependencies.md` explains the choice to make). *Roll back:* revert.
8. **BookingForm.** *What:* no sideways scroll on phones, each of the seven fields has its label tied to it
   (tapping the label focuses the field, screen readers read it), the page gains a main landmark. What is sent
   is exactly the same (a test pins it). The smoke check no longer lists `/booking` as a known sideways-scroll
   exception. *Check:* the preview's `/booking` on your phone, and one real booking request after merging.
   *Roll back:* revert.
9. **Houcine.Trades hand-off screen.** *What:* clicking a Houcine.Trades entry shows "Opening Houcine.Trades…";
   on a failure, **Try again**, **Sign in again** and **Open the sign-in page**; when your workspace sign-in has
   ended, "Your sign-in has ended"; when the Netlify variables are missing or the function is not deployed,
   "not set up yet" (the assert function now answers 503 "not configured" in that case instead of 403, so the screen
   can tell it apart from a refusal; `scripts/ci/trades-assert.test.mjs` runs its tests in CI). Coming back with the Back button clears the screen; Tab stays inside it and Escape closes
   it (except while opening). The note travels only after `#` in the address; nothing is logged or stored. All of it loads only for
   the super admin. *Check:* step e. *Roll back:* revert (the entries then open the sign-in page as before).
10. **Setup screen.** *What:* the steps, the variable names and scopes, the audience and your user id, and a
    **Check now** button that turns the checklist green. *Check:* step e. *Roll back:* revert.
11. **Trades integration doc.** *What:* the end-to-end check and the order for moving Houcine.Trades to
    `trades.houcine.world` (Render domain, then the audience, then `TRADES_URL`, then removing `onrender.com`
    from the allowlist). *Roll back:* revert.
12. **This guide.** It is the LAST commit (so the pull request is named after it); items 13 to 16 come before it
    in the commit list, and a short status commit (the D and E rows of `docs/PROGRAM-STATUS.md`) sits just
    before it.
13. **Owner command center** (on `/workspace/ecosystem` → Private apps → "Setup checklist and Houcine.Trades
    facts"). *What:* every manual step you still have, grouped (hand-off, Supabase, domains in order, hosting,
    legal, content), each with one sentence and the exact click path; and the static facts of Houcine.Trades:
    its address, links to its Security, Single sign-on and Backups pages, the end-to-end steps and a date you type
    after checking by hand. Ticks and the date stay in your browser only (if what is saved cannot be read, the page
    says so and leaves it untouched). It calls nothing and holds no token; it loads only for the super admin, in
    the owner chunk. Like every owner file, that chunk is hidden, not secret: someone who finds its file name can
    download it, so it holds names of settings and click paths, never a value or a statement of what is still open. *Check:* as the super admin, open it, tick one box, reload:
    the tick is still there; as a Brand Admin or signed out, nothing of it appears. *Roll back:* revert.
14. **Ecosystem health check** (`.github/workflows/ecosystem-health.yml`). *What:* every 30 minutes it opens
    `https://houcine.world/` and the Houcine.Trades health address (`/healthz`, which answers only "ok" or "not ok");
    each failing address is tried once more after 30 seconds (a sleeping host may need a moment); if one still
    fails, the run turns red and it opens, or comments on, ONE issue titled "Ecosystem health" (only its own issue
    counts, not one someone else opened with that title); when both are fine again it adds one "Recovered" comment.
    Permissions: read the code, write issues; nothing else. A `TRADES_HEALTH_URL` that is not a plain https address
    on houcine.world or onrender.com is reported as a failure, never silently replaced. GitHub may pause scheduled
    workflows after 60 days without activity in the repository: glance at the Actions tab now and then. *Set:* after the domain move, GitHub → Settings → Secrets and variables → Actions →
    **Variables** → `TRADES_HEALTH_URL` = `https://trades.houcine.world/healthz` (without it, the onrender.com
    address is checked). *Check:* Actions → Ecosystem health → **Run workflow**: green, and no issue while both
    answer. *Stop:* Actions → Ecosystem health → **…** → **Disable workflow**. *Roll back:* revert.
15. **Future-domain redirects** (`public/_redirects`, inactive). *What:* two lines that send `www.houcine.world` and
    `houcineworld.netlify.app` to `https://houcine.world` are written but switched off (they start with `# `). No
    `netlify.toml` is added, because it would make Netlify read its build settings from the repository instead of
    the dashboard. *What you switch on, in this order, once you want `houcine.world` as the main address:*
    (1) Supabase → Authentication → URL Configuration: add `https://houcine.world` and
    `https://houcine.world/auth/callback` (before anything else, or magic links stop working);
    (2) Netlify → Domain management: add `houcine.world` and `www.houcine.world`, set `houcine.world` as the
    primary domain, wait for the certificate; (3) ask a session to remove the `# ` in front of the two lines (a
    pull request that waits for you). The security headers already apply to every address. *Roll back:* put the
    `# ` back (revert), and set the primary domain back on Netlify. `scripts/ci/site-files.test.mjs` runs the
    tests of `_headers` and `_redirects` in CI.
16. **The hand-off's URL shape is pinned by a test**: `<TRADES_URL>sso#<note>`, the bare form that Houcine.Trades
    accepts (it also accepts `#assertion=<note>`; the bare one is used). *Roll back:* revert (a test only).

## What could not be checked from here

- The live Supabase project and Netlify settings (sessions cannot open either): the migration, the secrets,
  the deploy, the Netlify scopes and which installer Netlify uses.
- Real emails: the function's email path was tested with its rules, not by sending.
- Pages behind sign-in were checked by reading the code and the tests; the headless checks cover the public
  pages and the two sign-in pages.
