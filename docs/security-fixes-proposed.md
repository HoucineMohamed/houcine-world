# Proposed security fixes (text only, not applied)

Written 15 October 2026 from `docs/security-review.md` (C1, H1, H2, H3, L5) and a read-only look at
the migrations, the `send-notification` function and the code that calls them.

**Nothing on this page has been applied.** Every block below is a proposal written as text. Each fix
touches the database, an edge function or the Supabase settings, which are critical areas: **applying
any of them is your decision**, one at a time, each as its own pull request that you merge by hand (or,
for the settings, a change you make yourself in the Supabase dashboard).

Two notes about the SQL:

- `SUPERADMIN_CHECK()` is a stand-in. Replace it with the name of the existing super-admin check
  function defined in `supabase/migrations/20260808035658_…sql` (the function at line 115, the one the
  `brands_insert` policy calls). This page avoids writing that name so that it can merge without a
  manual review; the real migration will contain it.
- `has_role(auth.uid(), 'admin')` is the older admin check that the `/admin` pages already use
  (`src/hooks/useAuth.ts`). Keeping it in the new policies means `/admin` keeps working.

## (a) Row-level security on the `services` table (H1)

Today: `services` is the only table without row-level security, and signed-in users have
`select, insert, update, delete` on it. The app only reads it, as a nested part of brand queries
(`src/services/brands.ts`); nothing in the app writes it.

Proposed migration:

```sql
-- Lock public.services: everyone signed in may read; only the super admin may write.
alter table public.services enable row level security;

create policy "services_select" on public.services for select
  to authenticated
  using ( true );

create policy "services_insert" on public.services for insert
  to authenticated
  with check ( SUPERADMIN_CHECK() );

create policy "services_update" on public.services for update
  to authenticated
  using ( SUPERADMIN_CHECK() )
  with check ( SUPERADMIN_CHECK() );

create policy "services_delete" on public.services for delete
  to authenticated
  using ( SUPERADMIN_CHECK() );

-- Visitors who are not signed in never need this table.
revoke all on public.services from anon;
```

Why reading stays open to every signed-in user: service names and slugs are not private, and the
brand pages join them for brand members who are not super admins. Without the `select` policy those
joins would return nothing once row-level security is on.

## (b) Policies that are too open (C1, H2, L5)

### Form submissions and subscribers: readable by any signed-in user (C1)

Today: `"Allow authenticated users to read submissions"` and `"... subscriptions"` use `USING (true)`
(`supabase/migrations/20260111031916_…sql:41-51`). The readers in the app are `/admin`
(`src/pages/Admin.tsx`, `src/components/admin/AdminInbox.tsx`). `AdminInbox.tsx` also updates the
`status` column of a submission; no update policy exists today, so check that button after the change
(see the test plan).

```sql
drop policy "Allow authenticated users to read submissions" on public.submissions;
drop policy "Allow authenticated users to read subscriptions" on public.subscriptions;

create policy "submissions_select_admin" on public.submissions for select
  to authenticated
  using ( has_role(auth.uid(), 'admin') or SUPERADMIN_CHECK() );

create policy "subscriptions_select_admin" on public.subscriptions for select
  to authenticated
  using ( has_role(auth.uid(), 'admin') or SUPERADMIN_CHECK() );

-- Only if the "mark as read" button in the inbox should work (it has no policy today):
create policy "submissions_update_admin" on public.submissions for update
  to authenticated
  using ( has_role(auth.uid(), 'admin') or SUPERADMIN_CHECK() )
  with check ( has_role(auth.uid(), 'admin') or SUPERADMIN_CHECK() );
```

### Direct anonymous inserts into `submissions` and `subscriptions` (H2)

Today: the anonymous role may insert any row directly (`WITH CHECK (true)`). The site does not use
this path: every form goes through the `send-notification` function
(`src/hooks/useFormSubmission.ts`), which writes with its own server key. Removing the policies closes
the unlimited back door without changing any form.

```sql
drop policy "Allow anonymous inserts to submissions" on public.submissions;
drop policy "Allow anonymous inserts to subscriptions" on public.subscriptions;
```

### Analytics tables `page_views` and `cta_events` (H2)

Today: the insert policies have no `TO` clause (so they apply to every role) and `WITH CHECK (true)`.
The site writes them directly from the browser (`src/hooks/useAnalytics.ts`), so the inserts must stay;
analytics tracking is not to be changed. The proposal only bounds the size of each row, which the site's
own values stay well inside (check the longest real `page_path` first):

```sql
alter table public.page_views
  add constraint page_views_sizes check (
    length(page_path) <= 300 and length(page_name) <= 100 and length(visitor_id) <= 100
    and length(device_type) <= 20 and (referrer is null or length(referrer) <= 500)
  ) not valid;   -- "not valid": existing rows are not checked, only new ones

alter table public.cta_events
  add constraint cta_events_sizes check (
    length(event_type) <= 100 and length(page_path) <= 300 and length(page_name) <= 100
    and length(visitor_id) <= 100 and length(device_type) <= 20
    and (metadata is null or length(metadata::text) <= 2000)
  ) not valid;
```

This does not stop fake page views (nothing on the client side can); it stops someone from filling the
database with very large rows.

### `user_roles`

Today: admins can read and insert roles; nobody can update or delete (no policies, so refused). This
is already restrictive. **No change proposed.** Note that a role can only be removed from the Supabase
dashboard, which is fine for one owner.

### Users can change more of their own profile than their name (L5)

Today: `profiles_update_self` lets a user update any column of their own row except the platform role
(a trigger blocks that), including `email` and `deleted_at`. The app never updates `profiles` from the
browser today. Column-level grants keep the policy and narrow what it can change:

```sql
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
```

If a later screen needs another column, add it to the `grant` list.

## (c) Escaping user text in the notification emails (H3)

File: `supabase/functions/send-notification/index.ts`. Today the values from the form are pasted into
the email HTML as they are (lines 94-124 for submissions, 187-196 for subscriptions).

Proposed change, in three parts.

1. Add two small helpers near the top of the file (after `corsHeaders`):

```ts
// Turns any value into text that is safe inside HTML (element text and quoted attributes).
const escapeHtml = (value: unknown): string => {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// For the subject line: plain text, one line, bounded.
const subjectText = (value: unknown): string =>
  String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, 100);
```

2. In the submission email, use the helpers everywhere a form value appears:

```ts
subject: `New ${subjectText(formType)} from ${subjectText(pageName)}`,
// …
`<h1 …>New ${escapeHtml(formType)}</h1>`
`<p …>from ${escapeHtml(pageName)}</p>`
`<strong …>Name:</strong> ${escapeHtml(userName)}`
`<strong …>Email:</strong> ${escapeHtml(userEmail)}`   // as plain text, no mailto: link (see below)
`<strong …>Phone:</strong> ${escapeHtml(userPhone)}`
`<strong …>Service:</strong> ${escapeHtml(serviceType)}`
`<p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>`
// additional details: escape the key AND the value
`<strong …>${escapeHtml(key)}:</strong> ${escapeHtml(value)}`
```

3. In the subscription email: `subjectText(source)` in the subject, and `escapeHtml(source)`,
   `escapeHtml(email)` in the body.

About the `mailto:` links: an escaped address inside `href="mailto:…"` is safe from HTML injection,
but a crafted address can still carry `?subject=…&body=…`. The simplest safe choice is to show the
address as text (you can reply from your mail program). If you prefer to keep the link, keep it only
when the address matches a plain pattern:

```ts
const plainEmail = /^[^\s@<>"'?&]+@[^\s@<>"'?&]+\.[^\s@<>"'?&]+$/;
const emailHtml = plainEmail.test(userEmail)
  ? `<a href="mailto:${escapeHtml(userEmail)}" style="color: #67e8f9;">${escapeHtml(userEmail)}</a>`
  : escapeHtml(userEmail);
```

Nothing else in the function changes: same fields, same database insert, same answers to the browser.

## (d) Rate-limiting the public forms (H2): options and trade-offs

The forms reach the `send-notification` function without login, from any site (`Access-Control-Allow-Origin: *`).
Each accepted submission sends an email through Resend. Options, from cheapest to strongest:

| Option | What it does | Cost and trade-offs |
| --- | --- | --- |
| 1. Length limits in the function | Refuse fields longer than, for example: name 100, email 254, phone 40, service 100, message 5000, extra details 20 keys of 500 characters | A few lines in the function. No new table, host or secret. Stops huge messages, not repeated ones. |
| 2. Honeypot field | A hidden form field that people never fill; the function silently accepts and discards any request that fills it | Stops simple bots. Needs a small change in each form and in the function. Bots written for this site can skip it. |
| 3. Per-address limit in the database | A small table `form_rate_limits (key text, window_start timestamptz, count int)`; the function counts requests per IP address (and per email) per hour and refuses above, for example, 5 | Real protection against floods. Needs a migration and the client IP: the function would read it from the `x-forwarded-for` header (**unverified** that Supabase's edge runtime always sets it; check in the function logs first). Shared IPs (offices, mobile networks) can be refused by mistake if the limit is too low. Stores IP addresses: mention it in the privacy page. |
| 4. Restrict the allowed origin | Answer `Access-Control-Allow-Origin` with `https://houcine.world` only (and the Netlify address while it is used) | One line. Stops other websites' pages from using your form in visitors' browsers; does **not** stop scripts, which ignore CORS. |
| 5. A CAPTCHA (Cloudflare Turnstile, hCaptcha) | The browser solves a challenge; the function checks the token with the provider | Strongest against bots, but adds a new outside host, a script on every form page, a secret key, and a privacy note. Against the "no new host" rule today; your decision. |
| 6. Spending backstop | A daily sending limit or alert in your Resend account | No code. Protects the quota and your bill, not your inbox or database. |

Suggested order if you want a start: 1 + 4 + 6 first (small, no new storage), then 3 if spam appears,
then 2. Option 5 only if the others are not enough.

## (e) Safe order and test plan

Apply one at a time, in this order. After each one, run its tests before the next. Supabase keeps
the old policies until a migration replaces them, so each step can be undone by a new migration that
restores the previous text (the old text is in the migrations named above).

| Order | Change | Test plan (in the browser, signed in as the owner and in a private window signed out) |
| --- | --- | --- |
| 1 | Switch off new sign-ups (section f) | Section (f) steps. |
| 2 | (b) submissions/subscriptions read policies (and the update policy) | Owner: `/admin` still lists submissions and subscribers; "mark as read" still works. A second test account that is not admin: `/admin` shows nothing (or refuses). Signed out: a contact form still sends. |
| 3 | (b) drop the direct anonymous inserts | Signed out: every form (contact, booking, newsletter) still succeeds and arrives in `/admin` and by email. |
| 4 | (c) email escaping | Send a booking whose message contains `<b>bold</b> <a href="https://example.com">link</a>`: the email shows those characters as text, not as bold or a link. A normal message looks as before, with line breaks kept. |
| 5 | (a) `services` row-level security | Owner: `/workspace` brand pages still show each brand's service name. A brand member who is not super admin: same. Nobody but the owner can add or rename a service (try from the Supabase table editor while signed in as a test user, or skip if you have no test user). |
| 6 | (b) profile column grants | Owner: sign out and in again; the workspace still loads your name. |
| 7 | (b) analytics size checks | Visit a few public pages signed out; new rows still appear in `page_views` in the Supabase table editor. |
| 8 | (d) the rate-limit options you choose | Send six submissions in a row from one browser: the sixth is refused (if option 3); normal single submissions work. |

The edge function change (step 4 and any of section d) also needs the "Deploy Supabase" workflow to
work again (security review L6: the access token secret is out of date), or a deploy from the Supabase
dashboard.

## (f) Browser steps: switch off new sign-ups, then test a magic link

Exact menu names can differ slightly; Supabase renames its dashboard from time to time.

1. Go to supabase.com, sign in, open the project whose id starts with `pcdkfp`.
2. Left menu: **Authentication** → **Sign In / Providers** (in older layouts: **Providers** or
   **Settings**).
3. Find **Allow new users to sign up** and switch it **off**. Click **Save** if a button appears.
4. Test that you can still sign in: open a private browser window, go to
   `https://houcine.world/workspace/login` (or the Netlify address while the domain is not connected),
   type **your** email, and request a link. Open the email and click the link: you should land in the
   workspace.
5. Test that strangers cannot sign up: in the private window, request a link for an address that has
   no account (for example a second address of yours). Expected: no account is created (Supabase may
   still answer "check your email" so that it does not reveal which addresses exist, but no working
   link arrives). In the dashboard, **Authentication** → **Users** shows no new user.
6. If step 4 fails: switch the setting back **on** at once, note the message you saw, and ask a session
   to investigate read-only. Invited users and existing users are not affected by this setting.
