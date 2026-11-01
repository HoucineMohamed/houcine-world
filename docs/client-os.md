# Houcine.world Client OS

Written 1 November 2026. Client OS is the relationship and service-delivery layer of the Workspace: an internal
environment for super admins and brand admins (`/workspace/clients`), a Client Portal (`/portal`) and a Partner
Portal (`/partners`) on one shared, secured data model. The Command Center stays the source of business records and
figures, Autopilot the automation engine, Knowledge Studio the knowledge system.

Status words used below: **Implemented** (code exists and works), **Tested** (automated tests on a real database
and/or a real browser), **Needs configuration** (works only once the owner sets something up), **Deferred** (not built).

## 0. Repository assessment and branch strategy

- Checked on 1 November 2026: pull requests #89 (Command Center) and #90 (Autopilot, stacked on #89) are **open and
  not merged**. Client OS depends on both (contacts, projects, invoices, `audit_logs` marking, Autopilot events and
  notifications), so it is built on `grok/client-os`, created from `grok/autopilot`; its pull request targets
  `grok/autopilot`. Merge order: #89, then #90, then Client OS. A `claude/...` branch was not used: the repository's
  session automation would open a pull request to `main` carrying all three projects at once.
- Reused, not duplicated: `contacts` (one identity per person or organization, `organization_id`), `contact_brands`
  (brand relationships), `projects`, `tasks`, `milestones`, `invoices`, `payments`, `brand_admins`, `is_super_admin()`,
  `has_brand_access()`, `has_brand_role()`, Autopilot's `ap_can_manage()`, `ap_emit()`, `ap_notify_admins()`,
  `user_notifications`, `notification_preferences`, `cc_append_only()`, `audit_logs`, the Command Center UI parts
  and its PDF writer (`src/lib/command/pdf.ts`). The existing team chat table `messages` is untouched; Client OS
  conversations are `cos_conversations` / `cos_messages`.

## 1. Product architecture

```
/workspace/clients  (super admins, brand admins)     /portal (clients)            /partners (partners)
        │  RLS-filtered tables + cos_* functions            │  portal_* functions + RLS      │
        └──────────────────────────────┬────────────────────┴───────────────────────────────┘
                                       ▼
   Postgres: contacts/contact_brands/projects/tasks/invoices (Command Center)   + Client OS tables (below)
   every decision checked server-side · audit_logs · Autopilot events (ap_emit) · in-app notifications
   private storage bucket "client-os" (cos_files + storage.objects policies)
```

Every read and write runs with the signed-in person's own session. External people never get access to the
Command Center tables: they read them only through `portal_project`, `portal_client_home`, `portal_partner_home`
and `portal_partner_agreement` (security definer), which return client- or partner-safe fields.

## 2. Database model (migrations `20261102100000`, `20261102110000`, `20261102120000`)

| Area | Tables |
| --- | --- |
| Identity | `portal_invitations` (hash of the secret only), `portal_memberships` (user → contact → brand, kind client/partner, status active/suspended/revoked) |
| Participation | `project_participants` (membership ↔ project, scope `project`/`tasks`, expiry, revocation), `partner_task_assignments` |
| Lifecycle | `project_lifecycles`, `lifecycle_stages` (label, client label, allowed next, required conditions, final), `project_stage_history` (append-only); added columns `projects.lifecycle_id`, `stage_key`, `stage_changed_at`, `client_summary`, `tasks.client_visible` |
| Delivery | `deliverables`, `deliverable_versions` (append-only), `deliverable_reviews` (append-only, one per version and side) |
| Requests | `client_requests`, `client_request_events` (append-only, `internal` flag) |
| Communication | `cos_conversations` (audience client/partner/internal), `cos_messages` (append-only, `internal` flag), `cos_message_reads` |
| Files | `cos_files` (server-built path, MIME, size, audience, status), `cos_file_shares` (per partner/client, expiry, revocation) |
| Finance visibility | `cos_invoice_shares` (which Command Center invoices a client sees, payment instructions) |
| Commercial | `service_catalog`, `proposals`, `proposal_items`, `proposal_versions` (frozen snapshots), `proposal_events`; `contract_templates`, `contracts`, `contract_versions` (frozen text + SHA-256), `contract_events` |

Money is `numeric(14,2)` with one currency per record (EUR or USD), never converted or summed across currencies.

## 3. Identity and membership model

Person and organization identity: `contacts` (Command Center). Brand relationship: `contact_brands` (status client,
prospect, partner…), so one client can work with several brands without a duplicate identity. External access: a
`portal_memberships` row links a signed-in account to one contact and one brand, as a client or a partner; one
account can hold several memberships (several brands, or an organization and a person), each created only by an
accepted invitation. A membership on an organization contact covers that organization's people's projects.
External people are **never** added to `brand_admins`, so every existing Workspace rule keeps refusing them.

## 4. Permission matrix

| Action | Super admin | Brand admin (own brand) | Brand admin (other brand) | Client | Partner | Revoked / suspended | Anonymous |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Client OS screens | all brands | yes | no | no | no | no | no |
| Invite, suspend, revoke access | yes | yes | no | no | no | no | no |
| See a project | yes | yes | no | client view of their participations | project (scope `project`) or assigned tasks only | no | no |
| Internal tasks, description, budget | yes | yes | no | never | never | no | no |
| Deliverable versions | all | all | no | client versions | their own deliverables | no | no |
| Decide on a version | team review of partner versions | same | no | client versions, latest only, once | no | no | no |
| Proposals and contracts | yes | yes | no | sent versions of their relationship; decide once on the version read | agreements with their own contact | no | no |
| Invoices and payments | yes | yes | no | shared invoices of their relationship with payment history | never | no | no |
| Requests | all | brand's | no | their own; never internal notes | no | no | no |
| Messages | all | brand's | no | client conversations, never internal messages | partner conversations of their projects | no | no |
| Files | all | brand's | no | client files of their projects, their uploads | explicit shares, their uploads | no | no |
| Analytics, search | all brands | own brands | no | no | no | no | no |

## 5. Row-level security

Every Client OS table has RLS enabled and default privileges revoked; grants are explicit. Policies test the row's
own columns with the helpers `ap_can_manage(brand)`, `cos_my_memberships(kind)`, `cos_project_access(project)`,
`cos_client_membership(contact, brand)`, `cos_contact_matches(holder, contact)` and `cos_can_read_file(file)`.
Status fields (proposal, contract, deliverable) change only through functions that check the actor again. History
tables are append-only (`cc_append_only`). Internal helpers (`cos_log`, `cos_notify_member`, `cos_emit`…) are not
executable from the browser. `portal_invitations.token_hash` is not readable by anyone (column grants).
Two defects were found by the tests and fixed: a NULL comparison that let a client be invited to another client's
project (now `cos_contact_matches`, which is never NULL), and read policies that re-read their own table by id,
which made "insert … returning" fail.

## 6. Invitation workflow

1. A brand admin opens Clients or Partners, chooses the contact, the invited email and (for clients) the projects,
   and creates the invitation (`cos_invite`). A 256-bit secret is returned **once**; only its SHA-256 hash is stored.
2. **No email provider is configured**: the screen shows the link (`/portal/invite#token=…`, the secret in the
   fragment so it never reaches a server log) for the admin to send.
3. The invitee opens it; `cos_invitation_preview` shows only the brand, the kind and a masked email. They sign in
   (link by email through Supabase Auth, or password).
4. `cos_accept_invitation` requires the secret AND the signed-in email equal to the invited one; refuses expired
   (1–30 days), withdrawn or used invitations; creates or re-activates one membership and the named participations;
   audits it; notifies the brand's admins; emits `client.invitation_accepted` / `partner.invitation_accepted`.
5. Admins can withdraw pending invitations, suspend / restore memberships, and revoke them (final: it also ends
   every participation and task assignment).

## 7. Client Portal (`/portal`) — Implemented, Tested (browser)

Overview (waiting for you, projects with progress, milestones, invoices to pay, recent in-app updates), My projects
(summary, client-facing status, progress of shared tasks, timeline and stage history, shared tasks, deliverables
with every version, preview/download of authorized files, version-specific approve / request a revision / reject,
team contact, files), Proposals (frozen version, items, totals, terms, PDF, accept/reject/comment), Contracts
(frozen text, fingerprint, PDF, approve/decline), Deliverables, Approvals, Invoices (shared invoices, payments,
balance, payment instructions; **no online payment**), Messages, Requests (create, follow, reply, attach, close),
Profile (relationships, in-app notification switch).

## 8. Partner Portal (`/partners`) — Implemented, Tested (browser)

Overview (deadlines, shared files, updates), Collaborations (project or tasks-only scope, expiry), Assigned tasks
(submit work as a new version that goes to **team review**, never straight to the client), Shared files (explicit
shares, expiry, revocation), Agreements (frozen text of contracts with their own contact), Messages (partner
conversations of their projects), Profile. Partners never see client finances, internal tasks, client conversations
or the client project view unless given scope `project`.

## 9. Project lifecycle — Implemented, Tested

A global default lifecycle of 14 stages (Lead … Archived) is seeded; brands add lifecycles per project type and pick
a default. Each stage has an internal label, a client-facing label, optional allowed next stages, optional
conditions (`tasks_done`, `deliverables_approved`, `proposal_accepted`, `contract_approved`) and a final flag.
`cos_set_stage` validates the move, records `project_stage_history`, completes the project on a final stage, and
notifies clients only when the **client-facing** label changes.

## 10. Proposal and contract lifecycle — Implemented, Tested

Proposal: draft → sent (version n, frozen snapshot) → viewed → accepted / rejected, or expired (validity date),
withdrawn, or reopened to negotiation (edit, then a new version). Totals: per line, gross = qty × price rounded to 2
decimals; discount = gross × d% rounded; net = gross − discount; tax = net × t% rounded; total = Σ net + Σ tax.
Acceptance (`cos_decide_proposal`) needs the client's membership, an open status, the validity date, and the
**version the client read**; it is recorded once with the actor and time, audited, notified and emitted. An admin then
creates the project with `cos_project_from_proposal` (idempotent: asking again returns the same project; nothing
financial is invented). Contracts: draft → sent (frozen, hashed version) → approved / declined, reopen, cancel.
**An approval is a recorded decision, not an electronic signature**; no signature provider is integrated
(Deferred). PDFs of proposal and contract versions are generated in the browser from the frozen data with the
existing PDF writer.

## 11. Deliverable versioning — Implemented, Tested

A submission is always a new `deliverable_versions` row (never updated). A brand admin's version goes to the client
(`audience client`); an assigned partner's goes to team review (`audience internal`), invisible to the client. A
decision belongs to one version: a decision on a replaced version is refused; one decision per version and side.
A revision request also creates a client request.

## 12. Storage — Implemented, Tested (database), Needs configuration

Private bucket `client-os` (25 MB, accepted types: PDF, images, text/CSV, ZIP, audio, MP4, Office documents) created
by the migration. Upload: `cos_register_upload` checks the right to attach a file here, the type and the size, and
builds the path (`<brand>/<file id>/<sanitized name>`); the storage insert policy accepts only that registered path
by its uploader; `cos_complete_upload` verifies the object exists. Read: `storage.objects` select policy calls
`cos_can_read_file`, so a signed URL (60 seconds) can be created only for an authorized file; revocation
(`cos_revoke_file`, `cos_unshare_file`) applies at once to new links. The browser never chooses a path.
Tested: policies on a real Postgres with a Storage stand-in. **Not tested against the real Supabase Storage
service** (the local stand-in has no object API); the upload/download screens use the standard `supabase.storage`
calls.

## 13. AI integration — Deferred

Not built in this cycle: the client assistant and the internal Client Intelligence assistant. What exists today: the
Autopilot assistant (from #90) answers operations questions over Command Center facts and proposes confirmable
actions. The intended design reuses the same pieces: the shared `createAnthropicProvider`, facts built as the user,
proposals validated against authorized records and executed only through a confirming database function.

## 14. Autopilot events — Implemented, Tested

New event types (added to `ap_event_types()`): `client.invited`, `client.invitation_accepted`, `partner.invited`,
`partner.invitation_accepted`, `project.client_added`, `project.client_status_changed`, `proposal.sent`,
`proposal.accepted`, `proposal.rejected`, `deliverable.submitted`, `deliverable.approved`,
`deliverable.revision_requested`, `deliverable.rejected`, `client.request_created`, `client.request_resolved`,
`contract.approved`, `partner.assigned`, `partner.access_revoked`. Project events carry entity `project`, so the
existing actions (notify owner, create task, alert…) work unchanged. New builder templates: client revision request
(notify the manager + task), proposal accepted (notify admins), client onboarding (task). Notifications to clients
and partners are built-in, in-app only (`user_notifications` with `/portal` and `/partners` links), honouring each
person's preferences. Autopilot never messages a client automatically.

## 15. Analytics formulas (`cos_analytics`, database-side) — Implemented, Tested

Scope: the brands the caller administers (all for a super admin) or one brand. Clients: total = `contact_brands`
with status client; active = with an active project; new per month = `became_client_at`; repeat rate = clients
with ≥ 2 projects ÷ clients with ≥ 1; retention = clients whose first project is older than 12 months and who had a
project in the last 12 months ÷ clients whose first project is older than 12 months. Projects: active, completed,
delayed (not completed, deadline passed), awaiting approval (a deliverable submitted), average delivery time (start or
creation → completion), average approval time (version submitted → client decision). Proposals: conversion =
accepted ÷ (accepted + rejected). Money per currency: **expected** = totals of open proposals; **contracted** =
accepted proposals; **invoiced** = sent invoices; **received** = payments; **outstanding** = invoiced minus payments
on those invoices (overdue: past due date). Revenue by client and brand = payments; by category = accepted proposal
lines before tax. A figure without data is shown as not available, never as zero.

## 16. Deployment requirements

1. Merge #89, then #90, then this pull request (in that order); the three migrations run after Autopilot's.
2. The migration creates the private bucket `client-os` and two policies on `storage.objects` (owner review: this is
   a Supabase Storage change).
3. Supabase Auth must allow invited people to sign in: either keep email sign-in links with sign-ups enabled
   (Supabase creates the account on first link), or create their accounts by hand. **Check this setting.**
4. Add the site's `/auth/callback` to the allowed redirect URLs if it is not there (the Workspace already uses it).

## 17. Environment variables

None added.

## 18. External providers

- Email: **not configured** — invitations are shared by hand; notifications are in-app only.
- Electronic signature: **not configured** — contract approval is a recorded decision.
- Online payment: **not configured** — invoices show payment instructions.

## 19. Testing

- `bash scripts/db/test-command-center.sh`: every migration on a fresh PostgreSQL, the Command Center, Autopilot and
  Client OS tests (`scripts/db/client-os.test.sql`: super admin, brand A and B admins, client A, client B, a client of
  two brands, partner A and B, a revoked client, an outsider, anonymous; invitations, isolation by brand and by
  client, partner resource access, files and storage policies, versions and reviews, lifecycle, proposals, contracts,
  invoices, requests, messages, revocation, audit, Autopilot), re-application, rollback
  (`scripts/db/client-os-rollback.sql`) and re-application after rollback with existing data kept.
- Mutation checks: removing the email check, allowing a decision on a replaced version, showing internal versions or
  internal notes to clients, and the old read rule on proposals each make the tests fail.
- Browser (Playwright against the real local database, Supabase's API emulated as each user): 39 checks covering
  invitations (link, wrong account, partner), the client portal (project, IDOR, proposal acceptance, revision,
  version 2 approval, requests, invoice visibility and balance), the partner portal (tasks only, team review,
  revocation), brand B isolation, analytics and phone layouts. Regression: Command Center 33/33, Autopilot 38/38.

## 20. Known limitations

- AI assistants for Client OS: Deferred (section 13).
- Storage tested at the policy level only, not against the live Storage service.
- No email, e-signature or payment provider.
- Proposal expiry is applied when a client acts or when the status is read (shown as expired); there is no scheduled
  job that rewrites statuses.
- Per-deliverable comment threads are the review comment plus the project conversation (no separate thread table).
- The internal Client OS lists are capped (500 to 1,000 rows per list); analytics are computed in the database.
- Not production-ready on the basis of local tests alone: CI could not run (GitHub Actions minutes exhausted until
  about 1 November), and nothing was deployed.
