# The private Houcine.Trades card

This page explains, in plain words, the one small card that points from this site
(Houcine.world) to Houcine.Trades, and what is deliberately **not** connected.

Houcine.Trades is a separate, private app in its own repository. Nothing is merged,
embedded or shared between the two. The card is only a shortcut for the owner.

## Current state (16 October 2026)

- Merged: the owner-only entries (home card, workspace sidebar, `/workspace/ecosystem`), the Netlify
  Function `netlify/functions/assert` that signs a 60-second assertion, and the single sign-on setup screen
  that creates the key pair in the browser.
- Not yet merged (critical bundle): the branded "Opening Houcine.Trades…" screen, the error and "not
  configured" states, the step-by-step setup checklist, and the end-to-end checklist below.
- Not done by any session: the Netlify variables (`SSO_PRIVATE_KEY`, `OWNER_USER_ID`, `TRADES_AUDIENCE`)
  and the `/sso` page in Houcine.Trades. Until both exist, the entries open the normal sign-in page.

## 1. What you see

On the home page, in the Services grid ("The Ecosystem"), a fifth card appears:

- Title: **Houcine.Trades**
- Text: **Private financial workspace, owner only**
- It is **not** a bookable service: no price, no booking button, no form.
- Today the address is empty, so the card is shown **greyed out** with the text
  **"Not deployed yet"** and no link.
- Once the address is set (step 6 of section 8 below), the card becomes a plain link that opens
  Houcine.Trades **in the same tab** (use the browser's Back button to return).

### Inside the workspace (owner only)

The same shortcut also appears in two places of the brand workspace, so the trading app feels
like part of your tools:

- **The workspace sidebar**, under "Ecosystem" and "Platform Credentials": a lock icon, the name
  **Houcine.Trades** and, under it, **Private financial workspace**.
- **The Ecosystem page** (`/workspace/ecosystem`), in a small "Private apps" section below the
  brand cards: a card with the same lock icon, name and text.

Both follow the same rules as the card: greyed out with **"Not deployed yet"** and no link while
the address is empty or invalid; otherwise a plain link that opens Houcine.Trades **in the same
tab**. Only the super admin sees them; anyone else, including a Brand Admin, sees nothing there.
The Ecosystem page itself is already super-admin only.

## 2. Who sees it

| Who | What they see |
| --- | --- |
| You, signed in to the workspace as **super admin** | The card |
| A **Brand Admin** (or any other brand role) | Nothing |
| A signed-in user without a role | Nothing |
| A signed-out visitor | Nothing |
| Anyone, while the role is still loading or if loading it fails | Nothing |

"Nothing" means the card is not rendered at all: it is not in the page's HTML, not in a
sitemap (the site has none), not in `robots.txt`, not in any search or structured data.

How the check works: the site already decides who is super admin with
`profiles.platform_role = 'super_admin'` (the same check that shows "Ecosystem" and
"Platform Credentials" in the workspace menu). The card uses that same check
(`useMemberships` in `src/hooks/useMemberships.ts`); no new role was added. A Brand Admin
is a different thing (a row in `brand_admins`), so a Brand Admin never counts as super
admin. In the database, a trigger stops anyone but a super admin from changing
`platform_role`.

## 3. Hiding is a convenience, not secrecy (please read)

The card's code is loaded **only after** the super-admin check passes, through a dynamic
import, so it is not in the main public JavaScript file. But be honest with yourself about
what that means:

- The check runs **in the browser**. A curious person can always change what their own
  browser shows.
- The card's small JavaScript file is still a public file on Netlify. Someone who finds its
  name could download it and read the card text and the address.

That is fine, because **the card protects nothing**. The real protection is Houcine.Trades's
**own login**: a single owner, a password **plus** an authenticator code. That login is
completely separate from your Houcine.world admin login. Knowing the address gets nobody in.

So: never put anything secret in the card, its text or its address.

## 4. What is deliberately NOT integrated, and why

| Not done | Why |
| --- | --- |
| No iframe or embed | An embedded app can be tricked into clicks it did not intend (clickjacking), and it would mix the two sites' security. Houcine.Trades refuses to be framed anyway. |
| No shared login | The two apps keep separate accounts. The optional signed hand-off (section 9) is a 60-second, one-purpose note, not a shared login: Houcine.Trades decides itself whether to accept it. |
| No shared cookies | Cookies shared between sites can leak a session from one to the other. |
| No Supabase token, session, user data or query parameter in the link | A link can end up in browser history, logs or a screenshot. The only extra is the 60-second signed note after `#` (section 9). |
| No status card, no data read from or written to Supabase for Houcine.Trades | Nothing about your trading reaches this site. The only thing that reaches Houcine.Trades is the signed note: who you are (your user id) and for how long (60 seconds). |
| No analytics event on click | Your visits to Houcine.Trades are not tracked here. |

The link opens in the **same tab** (no `target="_blank"`) and keeps
`rel="noopener noreferrer"`: Houcine.Trades is not told which page you came from (no
`Referer` header), and if the link were ever changed to open a new tab, that tab still could
not control this page.

## 5. Same brand, separate origins

A web browser keeps sites apart by their **origin**: the scheme, the full host name and the
port together. `https://houcine.world` and `https://trades.houcine.world` share your brand
(both end in `houcine.world`), but they are **two different origins**. That gives you both
things at once:

- **One brand:** visitors and you see your own domain in the address bar, not a
  `something.onrender.com` name.
- **Separate locks:** the browser does not let one origin read the other's pages, storage or
  scripts. This site's Supabase sign-in (kept in this site's browser storage) is invisible to
  Houcine.Trades, and Houcine.Trades's sign-in cookie is invisible to this site.
  Houcine.Trades uses a `__Host-` cookie: the browser only accepts it from that exact host,
  so a sibling site on `houcine.world` cannot set or overwrite it.

One honest caveat: subdomains share the same "site" for a few browser rules (for example a
cookie that `houcine.world` sets for the whole domain would also be sent to
`trades.houcine.world`). Houcine.Trades ignores cookies it does not know, and this site does
not set such cookies. Never add one.

### Deliberately NOT done: the trading app on the same origin as the public site

Two ways to put Houcine.Trades **inside** `houcine.world` exist, and both are deliberately
not done:

| Not done | What it would be | Why not |
| --- | --- | --- |
| A path proxy | Netlify forwarding `houcine.world/trades/...` to the Render app | The two apps would share **one origin**. Every script that runs on the public site (the site's own code generated with Lovable, analytics, the chat widget, any future mistake) could then read the trading app's pages and send requests to it **with your trading login attached**, and its "Origin must match" check against forged requests would no longer tell the two apps apart. Netlify would also sit in the middle of every trading request and change the client address Houcine.Trades relies on for its login throttle. One weakness in the public site would become a weakness in the trading app. |
| An iframe | The trading app shown inside a page of this site | Clickjacking risk and mixed security, as above. Houcine.Trades refuses to be framed anyway (`frame-ancestors 'none'` and `X-Frame-Options: DENY`). |

Houcine.Trades's own rules also say its only supported way online is its container on the
managed platform, served directly over HTTPS; a proxy in front of it is not that.

## 6. The files

| File | What it does |
| --- | --- |
| `src/config/trades.ts` | The address `TRADES_URL` (empty today), the host allowlist `TRADES_HOST_ALLOWLIST`, and the validator `validateTradesUrl` |
| `src/config/publicTeaser.ts` | `SHOW_PUBLIC_TEASER` (false) |
| `src/components/owner/OwnerServiceSlot.tsx` | The slot in the grid: runs the super-admin check, then loads the card |
| `src/components/owner/card/index.tsx` | The card itself (loaded only for the super admin) |
| `src/components/owner/teaser/index.tsx` | The optional teaser (not even built while the flag is false) |
| `src/pages/Index.tsx` | Two added lines: the import and `<OwnerServiceSlot />` in the grid |
| `src/components/owner/PrivateWorkspaceEntry.tsx` | The workspace slot: runs the existing super-admin check, then loads the entry |
| `src/components/owner/card/WorkspaceEntries.tsx` | The sidebar row and the Ecosystem card (in the same hidden file as the private card) |
| `src/components/workspace/WorkspaceShell.tsx`, `src/pages/workspace/EcosystemView.tsx` | One line each that places the slot |

The card files are named `index.tsx` on purpose, so the built JavaScript files get
generic names (`index-<code>.js`) that say nothing about what they hold.
The workspace entries are part of that same hidden file and are exported under one-letter
names (`N`, `E`), because the main public file keeps those names in the code that loads it.
Nothing about the entry is in the main public file, the HTML, the sitemap, `robots.txt`, the
header menu or the footer.

### What the workspace entry does NOT share

The workspace entry is only a link, exactly like the card:

- **No shared login.** The two apps keep separate accounts. With the signed hand-off (section 9)
  switched on, a click can carry a 60-second signed note; Houcine.Trades decides whether to accept it
  and can still ask for its own authenticator code.
- **No shared cookies or storage.** The link never carries the Supabase token, a session or user
  data, and never a `?` part. Houcine.Trades lives on its own address (its own origin), so the
  browser keeps the two apps' cookies and storage apart.
- **No shared data.** No status check and nothing read from or written to Supabase for
  Houcine.Trades, and no analytics event when you click.
- **No iframe or embed.** It is never shown inside the workspace page.

### The address rules

The validator accepts the address **only** if all of these are true, otherwise the card stays
greyed out with no link:

- it starts with `https://` (never `http://`);
- no username or password, no `?` (query), no `#` (fragment), no port number, no path;
- written in its plain form: `https://trades.houcine.world` or `https://trades.houcine.world/`
  (lower case, no spaces);
- the host is a **subdomain** of an entry in `TRADES_HOST_ALLOWLIST`. Today: `houcine.world`
  and `onrender.com`. So `trades.houcine.world` and `my-app.onrender.com` pass;
  `houcine.world` itself, `evilhoucine.world` and `trades.houcine.world.evil.com` do not.

Note: anyone can create an `something.onrender.com` address. The allowlist only protects you
from a typo or a pasted wrong link; it cannot tell your Render service from someone else's. Once
your own `trades.houcine.world` works, you can remove `onrender.com` from the list.

### Tests

This repository has no test runner, so no test file was added (adding one would mean a new
dependency). The validator was checked once by hand with 31 cases (good addresses, http,
the bare domain, look-alike domains, username, query, fragment, port, path, capitals,
spaces, backslashes, IP address); all behaved as described above.

## 7. The optional teaser

`SHOW_PUBLIC_TEASER` in `src/config/publicTeaser.ts` is `false`. If you set it to `true`,
everyone who is not the super admin (visitors, signed-out users, Brand Admins) sees a neutral
card: **"Houcine.Trades, Private financial workspace, by invitation"**, with **no link** and no
button.

What turning it on exposes: the public learns that a private financial workspace called
Houcine.Trades exists. It still shows no address, no link and no content. The teaser's text then
becomes part of the public site (search engines may see it). Leave it off unless you want that.

## 8. Future steps (NOT done; do them yourself, in this order)

Each step has a warning. Take them slowly.

1. **Buy the domain** you want (for example `houcine.world` if you do not own it yet, or keep the one
   you have).
2. **Add the domain to Netlify** (Site configuration, Domain management).
3. **Add the new address to the Supabase redirect URLs BEFORE you make it the primary domain.**
   (Supabase dashboard, Authentication, URL Configuration.) ⚠️ If you switch the primary domain
   first, magic-link emails will point to an address Supabase refuses, and **nobody can sign in**
   until you fix it.
4. **After Houcine.Trades is deployed on Render**, add the custom domain `trades.houcine.world`
   in the Render service's settings, then add **one CNAME record** at your DNS provider:
   name `trades`, value the `something.onrender.com` address Render gives you. Wait until
   Render shows the certificate as issued.
5. ⚠️ **If you ever delete the Render service, delete that CNAME record the same day.** A record that
   points to a service that no longer exists ("dangling record") can be claimed by a stranger on
   Render, who would then control `trades.houcine.world`.
6. **Set the address**: in `src/config/trades.ts`, change `export const TRADES_URL = "";` to
   `export const TRADES_URL = "https://trades.houcine.world";` on a new branch, open a pull request,
   look at the Netlify deploy preview (signed in as super admin: the card is a link that opens
   Houcine.Trades in the same tab; signed out: no card), then merge.

Never put a token, a password or anything after a `?` or `#` in the address: the validator refuses
it, and it must not be there anyway.

### The short version, for the workspace entry

When Houcine.Trades is running on Render, these four steps make the card **and** both workspace
entries live at once (nothing else to change):

1. In the Render service's settings, add the **custom domain** `trades.houcine.world`.
2. At your DNS provider, add **one CNAME record**: name `trades`, value the `something.onrender.com`
   address Render shows. Wait until Render says the certificate is issued.
3. Open `https://trades.houcine.world` yourself and check that the Houcine.Trades login page appears.
4. In `src/config/trades.ts`, set `TRADES_URL` to `"https://trades.houcine.world"` on a new branch,
   open a pull request, check the Netlify deploy preview (signed in as super admin: the sidebar
   row, the Ecosystem card and the home card are links; signed out or as a Brand Admin: nothing),
   then merge.

## 9. Signed hand-off to Houcine.Trades (single sign-on)

### What happens when you click

1. You click one of the three owner-only entries (home card, sidebar row, Ecosystem card).
2. Your browser takes your **Supabase sign-in token** (the one this site already uses) and sends it to
   **this site's own server function**, `/api/assert` (a Netlify Function on houcine.world itself).
3. The function asks Supabase "whose token is this?", then reads **your own** profile row with **your own**
   token (never a powerful server key). It continues only if you are the super admin **and** your user id
   equals the `OWNER_USER_ID` setting. Anything else, or any error, gets a plain "forbidden".
4. The function signs a tiny note with its private key: issuer `houcine.world`, audience (the exact
   Houcine.Trades address), your user id, the time, an expiry **60 seconds later**, and a random id.
5. Your browser opens `https://<Houcine.Trades>/sso#<the note>` in the same tab.
6. If anything fails (no setting, Supabase down, slow network), the entry simply opens the normal
   Houcine.Trades sign-in page.

Ctrl-click or a middle click (new tab) opens the plain sign-in page, without any note.

### Why your Supabase token never travels

Your Supabase token is a powerful key to Houcine.world: whoever holds it can act as you here. It is used
only in your browser and in this site's own function, and **never** sent to Houcine.Trades. What travels is
the signed note, which proves only "the owner clicked, just now" and is useless after 60 seconds and on any
other site (the audience is fixed).

### Why after `#`

The part of an address after `#` (the "fragment") is **never sent to any server** by the browser: not to
Netlify, not to Render, not in logs. Only the Houcine.Trades page itself can read it. The site also sends no
`Referer` header with the click.

### What Houcine.Trades must do (its own repository, not done here)

- Keep the **public key** from the setup screen in its settings and check the note's signature with it.
- Check `iss` is `houcine.world`, `aud` is its own exact address, `exp` is in the future (60 seconds), and
  `sub` is the owner's id.
- Accept each note **once**: remember its random `jti` until it expires and refuse a second use. (This
  site cannot make the note single-use; Houcine.Trades does.)
- Remove the note from the address bar straight away, so it does not stay in the browser history.
- Decide whether to still ask for its authenticator code (recommended: the note proves your Houcine.world
  sign-in, which is a magic-link email; the authenticator code is a second, separate lock).

**Do not set `SSO_PRIVATE_KEY` on Netlify until Houcine.Trades has an `/sso` page that does this.**
Without that setting the function refuses, and the entries open the normal sign-in page; with it but
without the `/sso` page, the note would sit unused in the address bar.

### The Netlify settings (Site configuration → Environment variables)

| Name | What to put | Secret? |
| --- | --- | --- |
| `SSO_PRIVATE_KEY` | The private key from the setup screen | **Yes**: mark it as secret |
| `OWNER_USER_ID` | Your Supabase user id (Supabase dashboard → Authentication → Users → your row → copy the UID) | No |
| `TRADES_AUDIENCE` | The exact Houcine.Trades host, for example `houcine-trades.onrender.com` (no `https://`, no `/`) | No |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Already the site's public values; make sure they exist in Netlify too (same values as in the repository's `.env`) | No |

If any of them is missing or wrong, the function refuses and the entries open the normal sign-in page.

### Making the keys

Open `/workspace/ecosystem` as the super admin, click **Single sign-on setup** under "Private apps", then
**Create a new key pair**. The keys are made in your browser and sent nowhere. Copy the private key into
`SSO_PRIVATE_KEY` on Netlify and the public key into the Houcine.Trades settings page, then click "hide".

### How to rotate the keys

Make a new pair on the setup screen, replace `SSO_PRIVATE_KEY` on Netlify (then redeploy: Deploys →
Trigger deploy) and the public key in Houcine.Trades. Old notes stop working within 60 seconds anyway.

### How to switch it off

- **On the Houcine.Trades side** (preferred): disable its `/sso` page. The entries still open Houcine.Trades;
  you sign in normally.
- **On this site:** set `TRADES_SSO_ENABLED = false` in `src/config/trades.ts` (a pull request you merge),
  or delete `SSO_PRIVATE_KEY` on Netlify. Either way the entries open the plain sign-in page.

### Known limits

- The rate limit (5 notes per minute) is kept in the function's memory, so it resets when Netlify starts a
  new copy of the function. It is a brake, not a lock.
- The function's address `/api/assert` relies on Netlify's function routing taking priority over the site's
  "send everything to index.html" rule; check it on the deploy preview (section "Next steps" in the pull
  request).
