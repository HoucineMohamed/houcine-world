# Houcine.world

The public site and private workspace of the Houcine.world ecosystem (four verticals: tech, studio,
education, management, plus La Rosa View). Vite + React + TypeScript + Tailwind + shadcn/ui, hosted on
Netlify; Supabase (project `pcdkfpardswfwoiclvtm`) for sign-in, data and edge functions.

The owner is not a developer: explain in plain words and give browser steps, never terminal commands, when
something is for them to do.

## How changes reach the site

Read `docs/automation.md` first. In short: work only on the session branch; one pull request at a time; it
merges itself (squash) when CI and the Netlify preview pass, unless it touches a critical path or a watch-list
word, in which case it gets the `needs-owner` label and waits for the owner. After each squash merge, sync the
branch as section 7 says (an "ours" merge, then a tree sync); never force-push, reset or rewrite history.
`docs/PROGRAM-STATUS.md` records what is done, in review and pending, and the owner's placeholders.

## Critical paths (never in an ordinary pull request)

`.github/critical-paths.txt` is the list (sign-in and roles, Supabase and its functions, bookings and forms,
analytics, the owner-only Houcine.Trades entries, dependencies, build and hosting files, `index.html`, CI).
`.github/content-watchlist.txt` lists words that make any diff need the owner. Both are tested by
`scripts/ci/critical-paths.test.mjs`.

## Rules

- Never commit secrets or `.env` files; never change Supabase settings or credentials.
- Never invent clients, reviews, numbers, photos or testimonials; legal placeholders stay placeholders (listed
  under "Owner must fill" in `docs/PROGRAM-STATUS.md`).
- Never mention private projects on public pages; the owner-only code stays in its own chunk and leaves no
  trace in the public bundle or HTML (`scripts/dev/smoke.mjs` checks).
- No new dependency, environment variable, network host or binary file without the owner's approval.
- Content lives in `src/content/` (typed, validated: `docs/content-guide.md`); every page is in the route
  manifest `src/routes/manifest.ts` (an unknown path is a type error).
- Colours, fonts and spacing come from the design tokens (`src/design/tokens.json`,
  `docs/ecosystem-design-tokens.md`).

## Commands (for sessions)

- `npm run build`, `npx tsc -p tsconfig.app.json --noEmit` (CI runs both).
- `node --experimental-strip-types --test "scripts/ci/*.test.mjs"` (CI) and
  `node --experimental-strip-types --test scripts/dev/*.test.mjs` (content, manifest, headers, templates...).
- Headless checks of the built site, no network: `scripts/dev/smoke.mjs`, `link-check.mjs`, `a11y-check.mjs`,
  `keyboard-check.mjs`, `responsive-check.mjs`, `content-gate.mjs`, `perf-check.mjs`, `csp-check.mjs`
  (`docs/runbook.md` lists what each checks).
- `npm run lint` has known pre-existing errors; CI does not run it.

## Dependencies and lockfiles

See `docs/dependencies.md`: three lockfiles disagree today; nothing changes them without the owner.
