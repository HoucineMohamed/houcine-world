# The private Houcine.Trades card

This page explains, in plain words, the one small card that points from this site
(Houcine.world) to Houcine.Trades, and what is deliberately **not** connected.

Houcine.Trades is a separate, private app in its own repository. Nothing is merged,
embedded or shared between the two. The card is only a shortcut for the owner.

## 1. What you see

On the home page, in the Services grid ("The Ecosystem"), a fifth card appears:

- Title: **Houcine.Trades**
- Text: **Private financial workspace, owner only**
- It is **not** a bookable service: no price, no booking button, no form.
- Today the address is empty, so the card is shown **greyed out** with the text
  **"Not deployed yet"** and no link.
- Once the address is set (step 6 below), the card becomes a plain link that opens
  Houcine.Trades **in a new tab**.

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
| No shared login, no single sign-on | If one site's login were ever broken, the other would fall with it. Two separate logins mean two separate locks. |
| No shared cookies | Cookies shared between sites can leak a session from one to the other. |
| No token, session, user data or query parameter in the link | A link can end up in browser history, logs or a screenshot. The link is just the address. |
| No API calls, no status card, no data read from or written to Supabase | Nothing about your trading reaches this site, and nothing from this site reaches Houcine.Trades. |
| No analytics event on click | Your visits to Houcine.Trades are not tracked here. |

The link uses `target="_blank"` and `rel="noopener noreferrer"`: the new tab cannot
control this page, and it is not told which page you came from.

## 5. The files

| File | What it does |
| --- | --- |
| `src/config/trades.ts` | The address `TRADES_URL` (empty today), the host allowlist `TRADES_HOST_ALLOWLIST`, and the validator `validateTradesUrl` |
| `src/config/publicTeaser.ts` | `SHOW_PUBLIC_TEASER` (false) |
| `src/components/owner/OwnerServiceSlot.tsx` | The slot in the grid: runs the super-admin check, then loads the card |
| `src/components/owner/card/index.tsx` | The card itself (loaded only for the super admin) |
| `src/components/owner/teaser/index.tsx` | The optional teaser (not even built while the flag is false) |
| `src/pages/Index.tsx` | Two added lines: the import and `<OwnerServiceSlot />` in the grid |

The card files are named `index.tsx` on purpose, so the built JavaScript files get
generic names (`index-<code>.js`) that say nothing about what they hold.

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

## 6. The optional teaser

`SHOW_PUBLIC_TEASER` in `src/config/publicTeaser.ts` is `false`. If you set it to `true`,
everyone who is not the super admin (visitors, signed-out users, Brand Admins) sees a neutral
card: **"Houcine.Trades, Private financial workspace, by invitation"**, with **no link** and no
button.

What turning it on exposes: the public learns that a private financial workspace called
Houcine.Trades exists. It still shows no address, no link and no content. The teaser's text then
becomes part of the public site (search engines may see it). Leave it off unless you want that.

## 7. Future steps (NOT done; do them yourself, in this order)

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
   look at the Netlify deploy preview (signed in as super admin: the card is a live link; signed out:
   no card), then merge.

Never put a token, a password or anything after a `?` or `#` in the address: the validator refuses
it, and it must not be there anyway.
