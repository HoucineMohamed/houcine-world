# Security review (read-only)

Reviewed: 15 October 2026, on `main` at `f395741`. **Nothing was changed**: this page only reports.
Many fixes touch files on the critical list (login, Supabase migrations, edge functions, package
files), so each one needs your approval as its own pull request.

## Status of each finding (16 October 2026)

| Finding | Status |
| --- | --- |
| C1 open sign-ups, form data readable by any signed-in user | **Owner action** (switch off sign-ups: `docs/security-fixes-proposed.md` section f) and **pending in the critical bundle** (narrower read policies) |
| H1 `services` without row-level security | **Pending in the critical bundle** |
| H2 public write paths without limits | **Pending in the critical bundle** (limits, honeypot and rate limit in the form function; direct anonymous inserts removed). Until then the new `/contact` form stays off (`CONTACT_FORM_ENABLED = false`) |
| H3 unescaped text in notification emails | **Pending in the critical bundle** |
| M1 open redirect after login | **Pending in the critical bundle** |
| M2 no security headers | **Pending in the critical bundle** (`public/_headers` and a Content-Security-Policy) |
| M3 OAuth origin trusts the browser | **Owner action**: set `WORKSPACE_ALLOWED_ORIGINS` in Supabase (Edge Functions → Secrets) |
| M4 dependency advisories | **Pending in the critical bundle** (lockfile hygiene); upgrades afterwards |
| M5 two role systems | **Accepted for now**, documented in `docs/architecture.md` |
| L1 `.env` committed | **Accepted**: it holds only public values; sessions never edit `.env` |
| L2 "Already subscribed" answer | **Pending in the critical bundle** (same answer in both cases) |
| L3 inbox addresses in the function | **Pending in the critical bundle** (addresses from function secrets) |
| L4 `dangerouslySetInnerHTML` in the chart styles | **Accepted** (built from code constants only) |
| L5 users may edit more of their own profile than their name | **Pending in the critical bundle** |
| L6 "Deploy Supabase" fails with "Invalid access token" | **Owner action**: replace the `SUPABASE_ACCESS_TOKEN` secret (steps in `docs/owner-review-guide.md` once the bundle is open); the bundle makes the workflow say so clearly |

Fixed since the review, outside the critical files: broken image paths, missing labels and names, heading
order, contrast of the destructive colour, landmarks and a skip link (pull requests #21, #22, #36).

**What I could not see:** the Supabase dashboard (auth settings, secrets, the live database),
Netlify's settings and the live response headers. Findings that depend on them say so.

## Top 5 to fix first

1. **Turn off open sign-ups, and restrict who can read form submissions** (C1).
2. **Lock the `services` table** (H1).
3. **Escape user text in notification emails** (H3).
4. **Limit the public write paths** (form function and direct inserts) against spam (H2).
5. **Add basic security headers** (M2; already planned as item 17).

## Findings, most serious first

### Critical

**C1. Anyone may be able to create an account and then read every contact and booking request.**
- *What:* both magic-link logins (`src/pages/workspace/WorkspaceLogin.tsx:36`, `src/hooks/useAuth.ts:80`)
  call `signInWithOtp` without `shouldCreateUser: false`, so Supabase creates an account for any email
  **unless sign-ups are switched off in the Supabase dashboard** (not visible from the repository).
  The tables `submissions` and `subscriptions` have the read policy "authenticated users, `USING (true)`"
  (`supabase/migrations/20260111031916_…sql:41-51`), and no later migration changes it.
- *Risk in plain words:* if sign-ups are on, a stranger can type any email, click the link, and then read
  every name, email, phone number and message people sent through the site's forms, plus every subscriber's
  email.
- *Minimal fix:* (1) Supabase dashboard → Authentication → Sign In / Providers → turn **off** "Allow new
  users to sign up" (invited users still work). (2) A migration that replaces the two read policies with
  the existing admin check or the super-admin check function. (3) Optionally `shouldCreateUser: false` in both
  login calls.

### High

**H1. The `services` table has no row-level security, but signed-in users may write it.**
- *What:* `services` is the only table without `enable row level security`, and
  `grant select, insert, update, delete on public.services to authenticated`
  (`supabase/migrations/20260808035658_…sql:95`). Supabase's default privileges may also give `anon`
  access (not visible from the repository).
- *Risk:* any signed-in user (anyone, if C1's sign-ups are on) can rename or add services, which the
  workspace and brand pages display.
- *Fix:* a migration: enable RLS on `services`; allow `select` to everyone who needs it and writes only to
  the super admin (the existing super-admin check function).

**H2. Public write paths have no limits.**
- *What:* the `send-notification` function runs without login (`verify_jwt = false`,
  `supabase/config.toml:10-11`), allows any origin (`Access-Control-Allow-Origin: *`), checks only that
  fields exist, and has no length limit or rate limit. Separately, the anonymous role may insert directly
  into `submissions`, `subscriptions`, `page_views` and `cta_events` with `WITH CHECK (true)`.
- *Risk:* a script can flood your inbox (each submission sends an email through Resend and can use up
  its quota), fill the database, and fake analytics numbers.
- *Fix:* in the function: maximum lengths, a hidden "honeypot" field, and a simple per-IP limit (a small
  table). Remove the direct anonymous insert policies on `submissions` and `subscriptions` (the function
  already writes with its own server key).

**H3. User text is pasted into the notification email's HTML unescaped.**
- *What:* `supabase/functions/send-notification/index.ts:104-117` builds the email with `${userName}`,
  `${userEmail}`, `${message}` and extra fields as raw HTML.
- *Risk:* someone can send a "booking" whose message contains a convincing link or fake button, which then
  arrives in your own inbox looking like it came from your site (phishing aimed at you).
- *Fix:* escape `& < > " '` in every value before inserting it into the HTML.

### Medium

**M1. Possible open redirect after login.** `src/pages/AuthCallback.tsx:96` accepts any `next` that starts
with `/`, which also lets through `//other-site` and `/\other-site`; `WorkspaceLogin.tsx:18-30` uses
`returnTo` as given. `npm audit` also lists a React Router advisory ("open redirect via backslash in
`<Link>` and `useNavigate`"). *Risk:* a crafted login link could send you to a look-alike page after you
sign in. *Fix:* accept only paths that start with `/` and not `//` or `/\`; update `react-router-dom`.

**M2. No security headers from the repository.** There is no `public/_headers` or `netlify.toml`, so the
site sends no `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` or
Content-Security-Policy (Netlify may add some itself; check the live site). *Risk:* the workspace could
be shown inside another site's frame (clickjacking). *Fix:* item 17 (`public/_headers`).

**M3. OAuth origin falls back to trusting the browser.** `supabase/functions/_shared/origin.ts` trusts the
request's `Origin` header when the secret `WORKSPACE_ALLOWED_ORIGINS` is not set. *Risk:* low on its own
(starting a connection needs a signed-in admin), but the redirect target should not be guessable.
*Fix:* set `WORKSPACE_ALLOWED_ORIGINS` in Supabase (Edge Functions → Secrets) to your exact site
addresses; later, fail closed in code.

**M4. Dependency advisories** (`npm audit`, run read-only against a lockfile freshly resolved from
`package.json`, because the committed lockfile is out of sync): production dependencies have **0
critical, 5 high, 5 moderate**. The high ones (`braces`, `micromatch`, `chokidar`, `fast-glob`, through
`tailwindcss`) are build-time tools, not code that runs in visitors' browsers. The runtime one is
`react-router-dom` (moderate, see M1). *Fix:* the lockfile pull request (item 19), then targeted
upgrades.

**M5. Two separate role systems.** The old one: `user_roles` + `has_role(…, 'admin')` (used by `/admin`,
and to read `page_views`/`cta_events`). The new one: the platform role column on `profiles` (value "super admin") + brand
roles in `brand_admins` (the workspace). *Risk:* confusion; someone could be "admin" in one and nothing in
the other, and fixes applied to one are missed in the other. *Fix:* document both (docs/architecture.md),
later move the old `/admin` checks to the super-admin check.

### Low

- **L1. `.env` is committed** (`.gitignore` does not exclude it). Today it holds only the public URL, the
  publishable key and the project id, which are meant to be public and are built into the site anyway. Risk:
  a real secret added there later would be published. Fix: never put a secret in `.env`; keep secrets in
  Supabase or Netlify settings.
- **L2. Subscriptions reveal whether an email is subscribed** ("Already subscribed" answer). Fix: same
  answer in both cases.
- **L3. Personal inbox addresses are written in the edge function** (`OWNER_EMAILS`). If the repository is
  public, they can be harvested for spam. Fix: move them to function secrets.
- **L4. `src/components/ui/chart.tsx:70` uses `dangerouslySetInnerHTML`** (standard shadcn chart styles,
  built only from colours in the code, never from user input). Low; leave it.
- **L5. Users may update their own profile row** (`profiles_update_self`): a trigger blocks changing
  the platform role, but other columns (`email`, `deleted_at`) can be changed by the user. Fix: restrict the
  update policy to `full_name`.
- **L6. The "Deploy Supabase" workflow fails with "Invalid access token"** (run on 15 October 2026): the
  repository secret `SUPABASE_ACCESS_TOKEN` is wrong or expired, so migrations and functions merged to `main`
  are not deployed by it. Fix (browser): create a new token in Supabase (Account → Access Tokens) and
  replace the secret in GitHub (Settings → Secrets and variables → Actions).

## Requested checks, one by one

| Check | Result |
| --- | --- |
| Secrets in tracked files | **None found.** Scanned all tracked files and the whole git history for service-role keys, `sb_secret_` keys, private keys, cloud and API tokens. The only JWT ever committed is an **anon** (public) key of the other project `uxixfhthdgwxqfltvudt`, in history only. |
| Same Supabase project in `.env`, `client.ts` and config | **Yes, the same: `pcdkfpardswfwoiclvtm`.** `.env` values (`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`), `supabase/config.toml` `project_id`, and the CI workflows all use it. `src/integrations/supabase/client.ts` has no hard-coded project; it reads the `.env` values. **Every project id found:** `pcdkfpardswfwoiclvtm` (the real one) and `uxixfhthdgwxqfltvudt` (only in warning comments in `.env` and `supabase/config.toml`, and in an old anon key in git history). |
| Tables and row-level security | 19 tables. RLS is on for 18; **off for `services`** (H1). Token tables `connected_account_secrets`, `platform_credentials` and `oauth_flow_states` have RLS on and **no policies**, so only server functions can read them (good). Brand tables (`bookings`, `messages`, `notifications`, `analytics_events`, `brand_admins`, `brands`) are scoped with the super-admin check, `has_brand_access()` and `has_brand_role()`. `submissions`/`subscriptions` readable by any signed-in user (C1). |
| The two role systems | See M5. A database trigger stops anyone but a super admin from changing the platform role (good). |
| SECURITY DEFINER functions | 10 (`has_role`, the super-admin check, `has_brand_access`, `has_brand_role`, `handle_new_user`, the role-escalation guard trigger function, `manage_brand_membership`, `bootstrap_admins`, `disconnect_platform_account`, `purge_expired_oauth_states`). **All pin `search_path`** (good). `manage_brand_membership` re-checks the caller's role and writes an audit row. |
| Edge functions | `send-notification` and the six `*-oauth` callbacks run without login (needed for public forms and OAuth redirects); the `*-metrics`, `platform-credentials` and `meta-business-*` functions require login (`verify_jwt = true`). OAuth callbacks check a one-time state row. CORS is `*` on the shared helper and on `send-notification`. No rate limiting anywhere (H2). |
| Where OAuth tokens are stored | `connected_account_secrets` (RLS, no policies: unreadable from the app; server key only). App-level client secrets in `platform_credentials` (same protection). |
| Public write surfaces | `page_views`, `cta_events` (direct anonymous insert), `submissions`, `subscriptions` (direct anonymous insert, plus the `send-notification` function). See H2. `cta_events` is defined but no page calls it today. |
| XSS sinks | In the site code: only `chart.tsx` (L4). In emails: H3. No `innerHTML`, `eval` or `document.write` elsewhere. |
| Third-party scripts and hosts | Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), Google Cloud Storage (favicon and share image), Supabase, PostHog (only if its key is configured, workspace only), Lovable's preview login broker (only inside the Lovable editor). The chat widget on `/larosaview` makes no network calls. |
| Security headers | None set by the repository (M2). |
| npm audit | See M4. |
