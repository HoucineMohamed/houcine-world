# The whole ecosystem on one page (owner runbook)

Plain words, browser steps only. When a step says "ask a session", you open a Claude session and say what
you want; it does the change and opens a pull request.

## 1. What exists

| Thing | What it is | Where it runs | Code |
| --- | --- | --- | --- |
| **houcine.world** | the public site and the brand workspace (`/workspace`) | **Netlify** (site "houcineworld") | GitHub `HoucineMohamed/houcine-world` |
| **Houcine.Trades** | your private trading workspace, owner only | **Render** (`houcine-trades.onrender.com`, later `trades.houcine.world`) | GitHub `HoucineMohamed/Houcine.Trades` |
| houcine-tools | helper tools | not hosted | GitHub `HoucineMohamed/houcine-tools` |
| **Supabase** | sign-in, the database and the small server functions of houcine.world | supabase.com, project `pcdkfpardswfwoiclvtm` | `supabase/` in houcine-world |
| Resend | sends the form notification emails | resend.com | called by the `send-notification` function |
| Object storage (EU) | the encrypted backups of Houcine.Trades | your storage provider | Houcine.Trades `docs/deploy.md` section 5 |
| Vercel | an old, parallel copy of houcine.world from the original builder | vercel.com | nothing uses it any more |

The two sites are separate: separate code, hosting, sign-in and database. The only link is the signed
hand-off (a houcine.world owner card opens Houcine.Trades already identified; `docs/trades-integration.md`).

## 2. Secrets and where each one lives

Never paste a secret in a chat, an email or a file. Each one lives in exactly one place (plus your password
manager for the ones marked so).

| Secret | Lives in | Used by |
| --- | --- | --- |
| `SUPABASE_ACCESS_TOKEN` | GitHub → houcine-world → Settings → Secrets and variables → Actions | the Deploy Supabase workflow |
| `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_TO`, `NOTIFY_TO_LAROSAVIEW` | Supabase → Edge Functions → Secrets | the form function |
| `SSO_PRIVATE_KEY`, `OWNER_USER_ID`, `TRADES_AUDIENCE` | Netlify → Site configuration → Environment variables (scopes Production + Functions) | the hand-off function `/api/assert` |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Netlify, same page | the site (public values, not secret) |
| Houcine.Trades: `AUTH_SECRET`, `BACKUP_KEY`, the storage keys | **password manager first**, then Render → the service → Environment | Houcine.Trades (its `docs/deploy.md`) |
| The hand-off public key | Houcine.Trades settings page | Houcine.Trades (safe to share) |

## 3. Which changes merge by themselves

- **Merge by themselves** (pull requests labelled `auto`): pages, content, styles, docs, checks. They merge
  only when CI and the Netlify preview pass.
- **Wait for you** (`needs-owner`): sign-in and roles, Supabase and its functions, forms and bookings,
  analytics, the owner-only Houcine.Trades entries, `index.html`, headers, dependencies, CI and workflows.
  The list is `.github/critical-paths.txt`. You read the guide that comes with it, check the preview, merge.
- **Houcine.Trades** has its own sessions and its own rules (its `CLAUDE.md`); nothing from this repository
  changes it.

Stop all automatic merging at once: GitHub → houcine-world → **Actions** → **auto-merge** → **…** → **Disable
workflow**. One pull request only: add the label **hold**.

## 4. When something goes wrong

### Decision tree

1. **Is it houcine.world or Houcine.Trades?** Open each address. If only one fails, go to that one's section.
2. **Does the page load at all?**
   - No, "site can't be reached" or a certificate warning → **Domain not resolving** below.
   - Yes, but an error or an old version → **Deploy failed**.
3. **The page loads, but you cannot sign in** → **Sign-in failed**.
4. **An email said a backup failed, or the Backups page is red** → **Backup failed**.
5. **A GitHub workflow is red with "token" in the message** → **Token invalid**.
6. **The "Ecosystem health" issue on GitHub was opened or updated** (once the critical bundle is merged, a
   check runs every 30 minutes) → read it: it names which address failed, then use 2.

### Sign-in failed

- **houcine.world** (magic link): open the email again and use the newest one (older links stop working).
  If the link opens a page that says the address is not allowed: Supabase → **Authentication** → **URL
  Configuration**: "Site URL" must be your live address and the "Redirect URLs" must include it with
  `/auth/callback`. Do not change anything else there in a hurry.
- **Houcine.Trades**: it has its own password and authenticator code. A forgotten password or a lost authenticator
  cannot be reset from the browser: Render → the service → **Shell** → type `npm run prod:auth:reset` and follow its
  questions (its `docs/deploy.md`, "Shell / SSH", has the details). If you are unsure, ask a Houcine.Trades session to walk
  you through it; never paste the new password into the chat. If only the hand-off fails, the card offers **Open the
  sign-in page** (it arrives with the critical bundle): use it.
- Roll back the last deploy if the problem started right after a merge (Deploy failed, step 2).

### Deploy failed

1. **houcine.world:** Netlify → **Deploys**. A red deploy shows its log; the site keeps the last good version
   meanwhile. Ask a session to fix the cause, quoting the first red line of the log.
2. To go back at once: click the last good deploy → **Publish deploy**. Then revert the pull request on GitHub
   (**Revert** button on the merged pull request), or the next merge publishes the problem again.
3. **Supabase changes** (database rules, functions): GitHub → **Actions** → **Deploy Supabase**. If it is red,
   open it: the first step says plainly when the token is the problem (then **Token invalid**).
4. **Houcine.Trades:** Render → the service → **Events** / **Logs**. When a new version fails its start-up checks it
   does not start, and Render normally keeps the previous one running (check that the Events page says so).

### Backup failed (Houcine.Trades)

- Houcine.Trades makes an encrypted backup and checks it can be read back. If one fails, nothing is lost yet:
  the database is untouched. Open its **Backups** page, read the reason, and follow its `docs/deploy.md`
  (usually the storage keys or bucket changed, or the storage account needs attention).
- Never put the backup key anywhere but your password manager and Render.

### Token invalid

- **"Deploy Supabase" says `SUPABASE_ACCESS_TOKEN` is invalid or missing:** supabase.com/dashboard/account/tokens
  → **Generate new token** → copy → GitHub → houcine-world → Settings → Secrets and variables → Actions →
  `SUPABASE_ACCESS_TOKEN` → **Update**. Then Actions → Deploy Supabase → **Run workflow**.
- **The hand-off checklist says "Refused" or "Not set up yet":** follow the setup screen on
  `/workspace/ecosystem` (Private apps → Single sign-on setup); it names the variable to check. (The hand-off
  checklist, the setup screen and the **Check now** button arrive with the critical bundle; before it is merged
  they are not on the page.)

### Domain not resolving

- **houcine.world:** Netlify → **Domain management**: the domain must show a green certificate. At your domain
  provider, the records Netlify asks for must be there. A change of records can take up to a day.
- **trades.houcine.world** (once set up): Render → the service → **Settings** → **Custom Domains** must show the
  certificate as issued; your DNS must have the one `CNAME` record named `trades`. Until it works, the old
  `houcine-trades.onrender.com` address keeps working; `docs/domain-migration-plan.md` has the order and the
  rollback.
- If you delete the Render service, delete the `trades` CNAME record the same day (a stranger could otherwise
  claim the name).

## 5. One-time clean-ups still open

- **Vercel:** vercel.com → the project of the old site → **Settings** → **Git** → **Disconnect** (it stops
  building every change), then, if you never use it, **Settings** → **Advanced** → **Delete Project**. Netlify is
  the only live host; nothing depends on Vercel.
- The rest (secrets, sign-ups, legal text, real portfolio) is listed, with click paths, on the owner setup
  checklist of `/workspace/ecosystem` once the critical bundle is merged, and in `docs/PROGRAM-STATUS.md`
  under "Owner must fill".
