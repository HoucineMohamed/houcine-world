# Findings for the Houcine.Trades sessions

Written by the Houcine.world session, which never pushes to the Houcine.Trades repository. Each item says
what, where, why and a suggested fix. A Trades session (or the owner) moves an item to "Done" once handled.

## Design

Token changes on the Houcine.world side that the Trades side may mirror (see section 11 of
`docs/ecosystem-design-tokens.md`). None so far.

## Hand-off and other items

Read on 17 October 2026 from the Houcine.Trades default branch (`origin/Houcinemohamed`). The sender side
(houcine.world) signs `{iss: "houcine.world", aud: <bare lower-case host>, sub: <owner uuid>, iat, exp: iat + 60,
jti: 16 random bytes in base64url}` with Ed25519 and opens `https://<host>/sso#<note>` (bare fragment). That format
passes every check below; these items are about robustness, not about a mismatch.

1. **The used-note table grows forever.**
   - *What:* `sso_token_uses` keeps one row per accepted note and is never pruned.
   - *Where:* `src/data/schema.ts` (around line 1817), inserted in `src/data/sso.ts` (around line 69).
   - *Why it matters:* a note is refused anyway once `now - iat` exceeds 90 seconds (`src/domain/sso/limits.ts`),
     so rows older than that protect nothing; the table only grows (small, but without end).
   - *Suggested fix:* keep the table append-only for what it protects, and add a worker step that deletes rows
     older than one day (or store `iat` with the row and delete when `iat` is older than the 90-second window plus
     a margin). If "append-only" is a deliberate rule there, write down why the rows are kept.

2. **The audience is compared case-sensitively against the note.**
   - *What:* the saved audience is lower-cased when saved, but the note's `aud` is compared as it is.
   - *Where:* `src/domain/sso/token.ts` (claims, around lines 72-121) and `src/domain/sso/settings.ts` (around 135).
   - *Why it matters:* a sender that ever writes the host in another case would be refused with no clear reason.
     houcine.world lower-cases it today, so nothing fails now.
   - *Suggested fix:* lower-case the `aud` value(s) before the comparison, or document that the sender must.

3. **The lifetime limit (90 s) is looser than the sender's (60 s).**
   - *What:* `exp - iat` may be up to 90 seconds; houcine.world always makes 60.
   - *Where:* `src/domain/sso/limits.ts` (around lines 8-12).
   - *Why it matters:* only defence in depth: a sender that made longer notes by mistake would still be accepted
     for half a minute more than intended.
   - *Suggested fix:* lower the maximum to 60 seconds to match the sender, or note the 30-second margin as deliberate.

4. **One audience at a time makes the domain move a coordinated switch.**
   - *What:* only one audience is stored, and the request's Host must equal it.
   - *Where:* `src/auth/sso/service.ts` (around line 89), `/security/sso`.
   - *Why it matters:* moving to `trades.houcine.world` needs the Trades setting, the Netlify `TRADES_AUDIENCE` and
     the houcine.world `TRADES_URL` to change within minutes of each other (`docs/domain-migration-plan.md`, step 4);
     sign-on falls back to the password page in between, which is safe.
   - *Suggested fix (optional):* allow a second, "previous" audience for a limited time during a move, or leave as
     it is and keep the plan's order.

5. **No live-readiness page for the owner card.**
   - *What:* the owner card on houcine.world links to the Trades owner pages from one list; there is no
     "live-readiness" (go-live checklist) page to link to. Security (`/security`), sign-on setup (`/security/sso`)
     and backups (`/backups`) exist.
   - *Why it matters:* the card cannot link to something that does not exist; it links the three that do.
   - *Suggested fix:* if a go-live checklist page is planned, tell this repository its path (a line here), and the
     card's list gets one more entry.

## Done

None so far.
