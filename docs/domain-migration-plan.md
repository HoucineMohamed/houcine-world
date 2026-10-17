# Moving Houcine.Trades to trades.houcine.world (domain migration plan)

The goal: Houcine.Trades answers at `https://trades.houcine.world` instead of
`https://houcine-trades.onrender.com`, and the signed hand-off from houcine.world keeps working. Every step
below has a check and a rollback. Nothing here can lock you out: whenever the hand-off is not accepted, the
Houcine.Trades card offers **Open the sign-in page**, and Houcine.Trades' own password and authenticator code
always work.

## What has to agree (why the order matters)

Facts read from the Houcine.Trades code (default branch, 17 October 2026):

- Houcine.Trades keeps **one** audience, set on its page **`/security/sso`**. It accepts a note only if the
  note's audience equals that setting **and** the address the browser used (the Host) equals it too.
- houcine.world puts the audience from the Netlify variable **`TRADES_AUDIENCE`** into every note, and opens the
  address from **`TRADES_URL`** in `src/config/trades.ts`.

So three values must name the same host at the same time: `TRADES_URL`, `TRADES_AUDIENCE` and the Houcine.Trades
audience setting. While they disagree (a few minutes during step 4), the hand-off is refused and the card falls
back to the sign-in page. That is the only effect.

## Steps

### 1. Add the custom domain on Render

- **Do:** Render → the Houcine.Trades service → **Settings** → **Custom Domains** → **Add** → `trades.houcine.world`.
  Render shows a target address ending in `onrender.com`.
- **Check:** the domain appears in the list as "pending" or "verifying".
- **Rollback:** remove the domain from the same list. Nothing else has changed.

### 2. Add the CNAME record at your domain provider

- **Do:** in the DNS settings of `houcine.world`, add one record: type **CNAME**, name **`trades`**, value the
  `…onrender.com` address Render showed. Do not touch the other records (they keep houcine.world on Netlify).
- **Check:** after a few minutes (up to a day), Render shows the domain as verified.
- **Rollback:** delete that one CNAME record.
- **Warning:** if you ever delete the Render service, delete this CNAME the same day; otherwise a stranger could
  create a Render service with that name and receive the address.

### 3. Wait for the certificate, then test the new address

- **Do:** wait until Render shows the certificate as **issued**.
- **Check:** open `https://trades.houcine.world/healthz`: it must say `ok`. Open `https://trades.houcine.world`:
  the Houcine.Trades sign-in page appears, with a padlock and no warning. Sign in with your password and code
  once, to be sure.
- **Rollback:** nothing to undo; if the certificate never issues, check the CNAME value (step 2) or remove the
  domain (step 1).

### 4. Switch the three values together (allow ten quiet minutes)

Do the three in this order, one right after the other:

1. **Houcine.world code:** ask a session to set `TRADES_URL` to `"https://trades.houcine.world"` in
   `src/config/trades.ts` (keep `onrender.com` in the allowlist for now). The pull request waits for you: check
   the preview signed in as the super admin (the cards point to the new address), but **do not merge yet**.
2. **Netlify:** Site configuration → Environment variables → `TRADES_AUDIENCE` → **Edit** → `trades.houcine.world`
   (scopes Production + Functions) → **Save**. (Takes effect at the next deploy, which is the merge below.)
3. **Houcine.Trades:** sign in at `https://trades.houcine.world`, open **`/security/sso`**, set the audience to
   `trades.houcine.world` and save (it asks for a fresh code). If saving switches single sign-on off, switch it on
   again on the same page.
4. **Merge** the pull request of 4.1. Netlify deploys the site and the hand-off function together, so the new
   address and the new audience go live at the same moment.

- **Check:** on houcine.world, signed in as the super admin: `/workspace/ecosystem` → Private apps → Single sign-on
  setup → **Check now** says "Working"; then click a Houcine.Trades card: it opens
  `https://trades.houcine.world/sso…`, then Houcine.Trades asks for your code (or opens directly if you turned the
  code step off there). Then run the one-time check of `docs/trades-integration.md`, section 10.
- **Rollback (any time):** put the three values back to `houcine-trades.onrender.com`: revert the merged pull
  request (GitHub **Revert** → merge), set `TRADES_AUDIENCE` back on Netlify and **Trigger deploy**, and set the
  audience back on `/security/sso` (sign in at the old address). The old address keeps working throughout, because
  Render still serves it.

### 5. Remove the old address from houcine.world

- **Do:** after a few days of normal use, ask a session to remove `"onrender.com"` from `TRADES_HOST_ALLOWLIST` in
  `src/config/trades.ts` (a pull request that waits for you), check the preview, merge.
- **Check:** the cards still open `https://trades.houcine.world`; the setup checklist still says "Working".
- **Rollback:** revert that pull request.
- Houcine.Trades already accepts only the new audience since step 4.3, so a note made for the old address is
  refused there; nothing else to remove on its side. Render keeps answering at the `onrender.com` address (it
  cannot be switched off); that is harmless, because it is the same app with the same sign-in.

## If the custom domain is not ready yet

Nothing in houcine.world needs to change in advance. The future-domain settings prepared in the critical bundle
(`netlify.toml` comments and `docs/owner-review-guide.md`) stay inactive until you switch them on, and this plan
does not depend on them.
