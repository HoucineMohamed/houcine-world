# Client OS AI — repository assessment (Phase 0)

Written 1 November 2026, from the code and GitHub, not from earlier reports.

## Repository state

- **VERIFIED CURRENT STATE.** `main` contains the Command Center (#89 merged into `main`). #90 (Autopilot) and #91
  (Client OS) show as merged, but into their stacked base branches (`grok/command-center`, `grok/autopilot`), after
  #89 had reached `main`. **Autopilot and Client OS are not on `main`** (about 8,500 lines, 4 migrations).
- **REQUIRED IMPLEMENTATION (done).** Pull request #92 (`grok/land-autopilot-client-os` → `main`) lands exactly that
  reviewed code (tree identical to `grok/autopilot`; database tests pass). The AI work is on `grok/client-os-ai`,
  built on #92, because the assistants need Client OS tables and functions. Merge #92 first.

## AI infrastructure

| Finding | Class |
| --- | --- |
| `supabase/functions/_shared/llm/provider.ts`: one `LlmProvider` interface (`json` with a JSON schema, `stream`), typed errors (`not_configured`, `rate_limited`, `timeout`, `unavailable`…) | EXISTING COMPONENT TO REUSE |
| `_shared/llm/anthropic.ts`: the only adapter (Anthropic Messages API, timeout, server-side refusal fallback where supported, no SDK). No other provider and no provider fallback | EXISTING COMPONENT TO REUSE |
| Configuration: `ANTHROPIC_API_KEY` (secret, server only), `ANTHROPIC_MODEL`, `ANALYST_MODEL`; read in each function's `index.ts` | EXISTING COMPONENT TO REUSE; CONFIGURATION DEPENDENCY |
| Command Center analyst (`command-analyst`): facts from the shared engine as the user, `checkFigures` flags numbers not in the facts, read-only, no history stored | EXISTING COMPONENT TO REUSE (`checkFigures`, the facts pattern) |
| Autopilot assistant (`autopilot/ask`): operations Q&A over Command Center facts, proposals validated against the records in its facts, executed only by `ap_confirm_proposal`; no stored conversations | EXISTING COMPONENT TO REUSE (pattern; its actions `create_task`, `notify_owner`) |
| Concierge (public): compiled knowledge index, brand-scoped retrieval (`_shared/brain/retrieve.ts`), no sign-in | EXISTING COMPONENT TO REUSE (retrieval) |
| Knowledge Studio: notes in Markdown with `visibility: public / internal / confidential`; **only public notes are compiled** into `BRAIN_INDEX`; publication through `knowledge_publications`. There is no store of internal or confidential knowledge the server can read | VERIFIED CURRENT STATE |
| Internal (management-only) knowledge for the internal assistant | DEFERRED: it needs Knowledge Studio to compile internal notes into a separate, access-controlled index (not a second Knowledge Studio) |
| Client OS reads for clients: `portal_client_home`, `portal_project` (client-safe fields), RLS on proposals' frozen versions, contracts, conversations (internal messages hidden), requests (internal notes hidden), invoice shares | EXISTING COMPONENT TO REUSE |
| Internal reads: RLS on every Command Center / Client OS table by brand; `cos_analytics` (per currency, database-side) | EXISTING COMPONENT TO REUSE |
| Actions: `cos_create_request`, `cos_set_stage`, Command Center tasks (RLS), Autopilot `automations` (a draft is inert) | EXISTING COMPONENT TO REUSE |
| Notifications (`user_notifications`, `ap_notify_admins`, `cos_notify_member`) and audit (`audit_logs`, `cos_log`) | EXISTING COMPONENT TO REUSE |
| Stored AI conversations, AI activity log, AI action proposals with confirmation for Client OS | REQUIRED IMPLEMENTATION |
| Client assistant and internal Client Intelligence assistant (server function + screens) | REQUIRED IMPLEMENTATION |
| Email, e-signature, payments | CONFIGURATION DEPENDENCY (unchanged, not configured) |

## Tests and conventions

Database tests on a real PostgreSQL (`scripts/db/test-command-center.sh`), Node tests for pure server logic
(`scripts/ci/*.test.mjs`), a Deno type-check, and browser tests against a real local database with Supabase's API
emulated as each user. Changes under `supabase/**` and `.github/**` need the owner (`needs-owner`). No new
dependency, environment variable or outside host without approval: this work adds none.
