# Houcine.world Client OS AI

Written 1 November 2026. Two assistants on top of Client OS. They share infrastructure but are strictly separated:

- **Client AI Assistant**: `/portal/assistant`, for signed-in clients with an active client membership.
- **Client Intelligence Assistant**: `/workspace/clients/intelligence`, for super admins and brand admins.

Status words: **Implemented**, **Tested**, **Needs configuration**, **Deferred**.
The repository assessment is in `docs/client-os-ai-assessment.md`.

**Dependency.** Autopilot and Client OS are not on `main` yet. Pull request #92 lands them, so merge #92 before this work.

## 1. Architecture

```
/portal/assistant ─┐                                   ┌─ portal_client_home / proposal_versions / cos_messages (client-safe)
                   ├─ POST client-os-ai/ask ──(as the user)──┤
/workspace/clients/intelligence ─┘   handler.ts            └─ RLS-scoped projects, proposals, deliverables, requests,
                        │  fresh facts every turn             invoices, payments, interactions + cos_analytics
                        ├─ knowledge: compiled public notes of the person's brands (Knowledge Studio)
                        ├─ LlmProvider (existing Anthropic adapter), JSON schema, one retry for temporary errors
                        ├─ checks: links from records, actions validated, numbers not in the facts flagged
                        └─ stores ai_messages, ai_action_proposals, ai_activity (as the user)
Confirm ─▶ cai_confirm_action (database): checks everything again, runs existing functions, audits.
```

Files:

- `supabase/functions/client-os-ai/` holds `index.ts` (Deno entry), `handler.ts` (one request) and `core.ts` (pure: prompts, schemas, facts, validation).
- `supabase/migrations/20261103100000_client_os_ai.sql` is the database part.
- `src/components/clientos/AssistantChat.tsx` is the shared screen.
- The two routes are `src/pages/portal/ClientPortal.tsx` (assistant section) and `src/components/clientos/internal/Intelligence.tsx`.

## 2. Client AI capabilities — Implemented, Tested

**What it answers from.** The client's projects (client-facing status, progress, milestones, shared tasks), deliverables with every client version and their own decisions, and proposals (frozen version: items, totals, terms). It also uses contracts, invoices shared with them (amount, paid, balance, payment instructions), requests, client-visible messages, and published public knowledge of their brands.

**What it may propose.** At most one action: a request (revision, support, change, new project, information or other). The client sees what will be submitted and confirms. Approving a deliverable or accepting a proposal stays on its own page; the assistant links there.

**Links.** It links only to portal pages built from the client's own records.

## 3. Internal assistant capabilities — Implemented, Tested

**What it answers from.** Brand-scoped records read as the administrator:

- projects that are not completed (deadline passed, owner);
- open and recently decided proposals, with database totals;
- deliverables waiting;
- open requests;
- sent invoices with exact balances (in cents, per currency) and overdue flags;
- clients and their last interaction;
- brand admins (for assignments) and lifecycle stages;
- `cos_analytics`: expected, contracted, invoiced, received, outstanding and overdue amounts per currency, conversion, delays and approval times.

**Answer layout.** Answers are separated into *answer*, *observations* (from the records), *recommendations* (suggestions) and *not available*.

**What it may propose.** Up to three actions:

- create a task;
- move a project's stage (the lifecycle rules apply);
- notify a project owner;
- assign an owner (a brand admin of that brand only);
- send an in-app reminder to the client;
- prepare a **draft** automation (activation stays in Autopilot);
- prepare a draft proposal (no prices).

A super admin can narrow the scope with the Client OS brand filter. A brand admin only ever gets their own brands.

## 4. AI provider — Implemented, Needs configuration

The assistants reuse the shared provider interface (`_shared/llm/provider.ts`) and its Anthropic adapter, server side only:

- **Settings:** `ANTHROPIC_API_KEY`, with the model from `ANALYST_MODEL`, else `ANTHROPIC_MODEL`, else the default.
- **Timeout:** 60 seconds.
- **Retry:** one retry after 1.5 seconds, only for `unavailable`, `rate_limited` and `timeout`.
- **No provider switching:** there is no silent fallback to another provider.
- **Without a key, or when the provider fails:** the assistant says it cannot answer, the reply is stored and the failure logged. Client OS keeps working.

## 5. Knowledge Studio integration — Implemented (public knowledge); internal knowledge Deferred

Both assistants search the compiled Knowledge Studio index (`BRAIN_INDEX`). That index contains **only published notes marked `visibility: public`**.

- **Scope:** results are limited to the person's brands (matched by brand slug) plus the umbrella brand Houcine.world. Outdated passages are excluded.
- **Metadata kept:** each passage keeps its source note, brand, type, status and update date. The screen lists the notes used.
- **Internal or management-only knowledge: Deferred.** Knowledge Studio does not compile internal notes into any store the server can read. Providing them needs a separate, access-controlled index built by Knowledge Studio itself, not a second knowledge system.

## 6. Authorization model

| | Client assistant | Internal assistant |
| --- | --- | --- |
| Who | active client membership (`cai_can_use('client')`) | super admin or brand admin (`cai_can_use('internal')`) |
| Facts | `portal_client_home` (client-safe), frozen proposal versions, non-internal messages: all RLS / definer-checked | RLS-scoped tables of the brands the person administers; `cos_analytics` checks the brand |
| Brand id from the browser | not used | checked with `ap_can_manage` |
| Actions | `create_request` only | the seven internal actions |

**On every turn:**

- access and facts are checked again;
- earlier answers are sent to the model labelled as context, never as facts;
- ids named by the model are matched against the records just read, and again in the database at confirmation.

**Partners** can use neither assistant; the server answers 403.

**Revocation:** a revoked or suspended client loses both the assistant and their stored conversations immediately, through the row-level security on `ai_conversations`.

## 7. Data retrieval and tool execution

The model has no tools and never runs SQL. It returns one JSON object, checked against a schema. The server then:

1. keeps only links that it built from the records;
2. validates every proposed action (type, brand in scope, every id among the records just read, allowed stages, members of the right brand);
3. stores the valid actions as `ai_action_proposals`, always with status `proposed`.

`cai_confirm_action`, which runs only when the person clicks Confirm:

- checks ownership, status and the 24-hour expiry;
- checks every id in the payload against the proposal's brand again;
- runs the existing functions (`cos_create_request`, Command Center tasks, `cos_set_stage`, `ap_notify_user`, the project owner, a client conversation message, an Autopilot draft, a proposal draft);
- records the result, in `audit_logs` (`ai.action_confirmed` or `ai.action_failed`, with the confirming person) and in `ai_activity`.

## 8. Conversation storage — Implemented, Tested

`ai_conversations` and `ai_messages` belong to their owner only, and are readable only while the owner still has access to that assistant. Even super admins cannot read other people's conversations.

- **Message metadata:** assistant messages keep what the person was shown (links, observations, flagged numbers, knowledge used, proposal ids). Nothing hidden is stored.
- **Deleting:** people can delete one conversation or clear all their history.

## 9. Audit and retention

`ai_activity` is append-only and holds events with identifiers and counts, never questions, answers, prompts or secrets:

- conversation created, request, answer;
- refusal, provider error;
- action proposed, rejected by validation, confirmed, declined, failed;
- history cleared.

Confirmed and failed actions are also written to `audit_logs`.

**Retention.**

- Conversations are kept until their owner deletes them.
- Proposals expire after 24 hours.
- The activity log is kept for oversight.
- No automatic purge job exists: **Deferred**. A periodic purge, for example messages older than 12 months, is the owner's decision.

**Server logs** contain only `client-os-ai: <mode> <status>` or a truncated error. They never hold content or keys.

## 10. Autopilot integration — Implemented, Tested

The internal assistant can prepare an Autopilot automation (trigger plus a notify-admins action). Confirming creates it as a **draft**, validated by Autopilot's own definition checks; activating it is a separate decision in Autopilot. Confirmed actions use the existing Autopilot notification path (`ap_notify_user`), and Client OS events keep flowing to Autopilot as before. No new automation engine was added.

## 11. Environment variables and secrets

No new variable. The assistants reuse `ANTHROPIC_API_KEY` and, optionally, `ANALYST_MODEL` / `ANTHROPIC_MODEL`. These are existing secrets of the Supabase functions and never reach the browser. The function `client-os-ai` is added to `supabase/config.toml` (`verify_jwt = true`) and to the deploy workflow's function list.

## 12. Testing

- **Database** (`scripts/db/client-os-ai.test.sql`, run by `bash scripts/db/test-command-center.sh`):
  - roles: super admin, brand A admin, brand B admin, client A, client B, partner A, a revoked client, anonymous;
  - conversation isolation; partners and anonymous refused;
  - forged proposals refused: another brand, another client's project smuggled into the payload, a client proposing internal actions, a pre-executed status;
  - confirm-once, decline, 24-hour expiry, drafts-only automations, in-app reminders, audit with the confirming person;
  - revocation removes old conversations; the activity log is append-only;
  - rollback (`scripts/db/client-os-ai-rollback.sql`) and re-apply.
- **Unit** (`scripts/ci/client-os-ai.test.mjs`, 11 tests):
  - facts and links;
  - client and internal action validation (forged ids, foreign brands, unknown stages, non-members, unknown types);
  - prompt-injection neutralizing; history labelling and capping;
  - knowledge scope; retry behaviour; exact money in cents; figure flagging;
  - no service key.
- **Browser** (the real handler against the real local database, with a scripted model): 24 assistant checks on top of the 39 Client OS checks.
  - Client: facts limited to their records (no internal task, other brand or partner draft), forged links dropped, invented numbers flagged, a reference opening its project.
  - Client: an injection attempt cannot close the data block; a revision request is created only after Confirm, through Client OS; conversations persist; a provider failure is explained while the portal keeps working.
  - Internal: brand-scoped facts with database analytics; structured answer; forged action dropped; confirmed task audited; brand B's facts and conversations separate.
  - Refusals and layout: a partner refused (403); a suspended client refused, with old conversations hidden; phone layouts.
- **Regression:** Command Center 33/33 and Autopilot 38/38 browser checks, every database test, `scripts/ci` and `scripts/dev`, the build and the smoke check.

## 13. Known limitations

- **The live model was not exercised.** The tests use a scripted model. Answer quality with the real model is unverified until the owner tries it with a key.
- **Large scopes:** facts are capped (about 300 projects, 60 proposals, 100 deliverables and requests). A very large global scope is summarised by the database analytics plus those capped lists.
- **Rate limits:** 8 questions a minute per person (in the function) and 30 an hour (from the activity log). There is no monthly cost cap; set a spend limit in the Anthropic console.
- **CI:** it could not run (GitHub Actions minutes exhausted until about 1 November). Nothing was deployed.

## 14. Deferred

- **Internal knowledge:** management-only knowledge for the internal assistant (section 5).
- **Retention:** an automatic purge of old conversations (section 9).
- **Streaming:** the answer arrives when complete.
- **More client actions:** the client assistant does not approve deliverables or accept proposals itself; it links to those pages.
