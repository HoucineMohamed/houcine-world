# Houcine.world Autopilot

Written 31 October 2026. Autopilot is the Workspace's automation and operations layer: automations (a trigger,
conditions, actions), deterministic monitoring with alerts, an AI operations assistant that proposes and never acts,
a personal notification center, and the execution history. It is built on the Command Center records (leads, contacts,
projects, tasks, milestones, invoices, payments, expenses), on the Knowledge Studio events, and on the existing sign-in
and brand authorization (`brand_admins`, `is_super_admin()`, `has_brand_access()`, `has_brand_role()`). Nothing about
them was replaced.

| Where | Who | What |
| --- | --- | --- |
| `/workspace/autopilot` and `/workspace/autopilot/<section>` | super admins | **Global Autopilot**: every brand and the global automations, with a brand filter |
| `/workspace/<brand>/autopilot` and `/workspace/<brand>/autopilot/<section>` | the brand's admins (and super admins) | **Brand Autopilot**: that brand only |
| `/workspace/autopilot/notifications` | every signed-in person | their own notifications |

Sections: Overview, Automations, Monitoring, AI Assistant, Notifications, Execution history, Settings. Filters
(brand, status, severity, category, the open execution) are kept in the address. The sidebar shows **Autopilot** in
each brand, **Global Autopilot** for super admins, and a badge with the unread notification count.

## 1. Architecture

```
browser (signed-in user's own session)                           Supabase (Postgres)
  src/pages/workspace/autopilot/Autopilot.tsx  ─┐
  src/components/autopilot/*  (screens)        ├─ reads/writes ─▶ tables with row-level security
  src/services/autopilot.ts   (data access)    ─┘                 + ap_* functions (each checks the caller)
                                                                        ▲
  Command Center / Knowledge Studio changes ─▶ row triggers ─▶ automation_events ─▶ ap_dispatch ─▶ ap_execute
                                                                        ▲                (runs, actions, audit)
  "Run monitoring now" / opening Autopilot / optional schedule ─▶ ap_tick ─▶ ap_scan (alerts + time events)
  supabase/functions/autopilot   tick: ap_tick + AI jobs        ask: the assistant (proposals only)
```

- **The engine is in the database.** Record events are captured by triggers on `leads`, `contact_brands`, `projects`,
  `tasks`, `milestones`, `invoices`, `payments`, `expenses` and `knowledge_events`, stored once in `automation_events`
  (a unique de-duplication key), and dispatched at once, in the same transaction as the change. There is no separate
  automation platform, no outside service and no queue to run.
- **No arbitrary code.** A definition is JSON validated by `ap_validate_definition` against fixed lists: known triggers,
  condition fields and operators, action types, categories, severities, priorities and the allowed status changes. An
  unknown key is refused when saving. Templates (`{name}`, `{amount}`…) are plain text substitution.
- **Security stays in the database.** Every read and write from the browser and from the function runs with the
  signed-in person's own token; the screens only choose what to ask for.

## 2. Data model (migration `supabase/migrations/20261101100000_autopilot.sql`)

| Table | What |
| --- | --- |
| `automations` | name, description, status (draft, active, paused, archived), definition, version; `brand_id` empty = global (super admins only); the brand never changes |
| `automation_versions` | every saved definition (append-only) |
| `automation_events` | every event, once (unique `dedupe_key`), with its dispatch time or error |
| `automation_runs` | one execution per automation and event (unique), status, attempts, condition results, error, approver |
| `automation_run_actions` | each action of each attempt: status, result, error |
| `ops_alerts` | monitoring and automation alerts: rule, category, severity, title, description, record, suggested action, status (open, resolved, dismissed), responsible person, detected, last seen, resolved / dismissed; at most one open alert per rule and record |
| `user_notifications` | a person's notifications: category, priority, title, body, link (inside `/workspace/` only), read time; one per person and de-duplication key |
| `notification_preferences` | a person's muted categories and brands, minimum priority, in-app on/off |
| `automation_jobs` | AI summaries and follow-up drafts waiting for the `autopilot` function |
| `assistant_proposals` | the assistant's proposed actions and their outcome |
| `autopilot_state` | when monitoring last ran, by whom, and its counts |

The Command Center's `cc_audit` now marks changes made by an automation: no person as actor and `"automated": true`
with the execution id. Confirmed assistant actions are audited with `confirmed_by`.

Rollback (not a migration; run by hand in the SQL editor only if asked): `scripts/db/autopilot-rollback.sql` removes
Autopilot's tables, functions and triggers and keeps every Command Center record.

## 3. Triggers, conditions and actions

**Triggers.** Lead created; lead stage changed; contact created (linked to a brand); project created; project status
changed; task created; task completed; task overdue *; project deadline approaching (7 days) *; milestone completed;
invoice created; invoice overdue *; payment recorded; expense recorded; project cost changed (an expense on a project,
with budget use in the project's own currency); knowledge publication completed (global); knowledge synchronization
failed (global). * = found by monitoring, once per record and day.

**Conditions.** Up to 10, all or any must match. Fields: status, previous/new status, stage, previous/new stage,
priority, task kind, currency, amount, outstanding balance, budget, actual cost, budget used (%), days overdue, days to
deadline, progress (%), owner, assignee, no owner, category, source, brand. Operators: is, is not, >, ≥, <, ≤, is one
of, is empty, is set. The values are read from the record itself when the event is dispatched. Budget figures exist
only when the costs are in the project's currency; currencies are never added together or converted.

**Actions** (1 to 8 per automation). Create a task (in the event's project, optionally assigned to its owner); notify
the brand's admins (optionally super admins too); notify the record's owner; create a CRM follow-up; change a status
(only project on hold/active, task in progress/blocked/to do, lead contacted/qualified); add an activity entry; create
an alert; add a lead to the assignment queue; generate an AI summary; draft a follow-up message (a draft for an admin,
**never sent to a client**). **Email is refused**: no email provider is configured for Autopilot.

**Approval.** "Requires approval" makes each execution wait (awaiting approval) until a brand admin approves or cancels
it in the execution history.

**Templates** in the builder: unassigned leads; project deadlines; outstanding invoices (alert, admins notified, a draft
follow-up; nothing is sent to the client); project budget at 90 % or more (same currency only).

## 4. Monitoring rules (`ap_scan`, deterministic)

| Rule | Severity | Condition |
| --- | --- | --- |
| task_overdue | high for deliverables, else medium | open task past its due date in an open project |
| project_overdue | critical for high/urgent, else high | open project past its deadline |
| project_deadline_soon | medium | open project with a deadline within 7 days |
| project_no_milestones | low | active project older than 3 days without milestones |
| budget_overrun | high | costs in the project's currency above its budget |
| lead_unassigned | medium | open lead without owner |
| lead_no_followup | low | open lead older than 2 days, no follow-up date and no interaction in 14 days |
| lead_stagnant | low | open lead in the same stage for 30 days |
| client_attention | low | client with an active project and no interaction in 60 days |
| invoice_overdue | high | sent invoice past due with a balance left (payments subtracted, same currency) |
| expense_spike | medium | this month's expenses above twice the average of the last 3 months, per currency |
| automation_failed / job_failed | high | a failed execution or AI job |
| knowledge_sync_failed | high, critical after 3 in 24 h | a failed knowledge publication (global) |

An alert exists only because a record matched a rule. A rule seen again updates the same alert's "last seen"; when the
condition ends, the alert resolves itself. A dismissed alert stays dismissed for that record until a new one opens.
New alerts of medium severity or more notify the brand's admins. Executions and AI jobs running for more than 10
minutes are marked failed ("Timed out") by the scan, so nothing hangs silently.

## 5. Permissions

- **Brand admins** (`brand_admins.role = brand_admin`) manage their brands' automations, runs, alerts and AI jobs
  (`ap_can_manage`); **super admins** manage everything, including global automations (`brand_id` empty). Editors,
  moderators and viewers see none of it and get only their own notifications. A person with several brands sees each
  of them, and only them (the many-to-many `brand_admins` model is unchanged).
- Notifications and preferences: each person sees and changes only their own (the browser may change only the read
  time). A notification is created only for a person with access to its brand.
- Engine functions (`ap_execute`, `ap_scan`, `ap_dispatch`…) cannot be called from the browser. The callable ones
  (`ap_tick`, `ap_retry`, `ap_decide`, `ap_test`, `ap_set_alert`, `ap_confirm_proposal`, `ap_claim_jobs`,
  `ap_complete_job`) check the caller's rights on the record's brand themselves.
- An id of another brand changed in the address or in a request returns nothing or "Not allowed" (tested for
  automations, runs, alerts, retries, approvals, proposals, jobs and notifications).

## 6. Execution reliability

- **Idempotent.** An event is stored once (unique key); an automation runs once per event (unique automation and
  event). Retrying the same event does nothing new.
- **Isolated.** Each action runs in its own protected step: a failure is recorded on the action and the execution
  (failed, with the error) and never blocks the change that caused the event, nor the other automations.
- **Retry.** A failed execution can be retried from the history (at most 5 attempts in all); each attempt keeps its own
  action records.
- **Recursion guard.** Changes made by an automation can trigger other automations up to a depth of 3, never more.
- **Timeouts.** See section 4.
- **Audit.** Automated changes carry `"automated": true` and the execution id; retries, approvals, cancellations, alert
  decisions and confirmed proposals are written to `audit_logs` with the person.
- **Dry run.** "Test" runs the trigger and conditions against a recent real event and lists the actions it would take,
  changing nothing.

## 7. AI Operations Assistant (`supabase/functions/autopilot`, `ask`)

It reads, as the signed-in person, the brands they manage: the Command Center facts (the same engine as the dashboards),
open alerts, recent executions, and the public published knowledge index (super admins also get the Knowledge Studio
link). It answers and may propose up to 5 actions: create a task, assign a lead, notify an owner, create an alert.
A proposal is kept only if its target is a record in its facts, of the same brand, with valid values (an owner must be a
brand admin of that brand); others are dropped and counted. A proposal shows the action, target, brand, expected
change and responsible person, and **does nothing until the person confirms it**; `ap_confirm_proposal` checks
everything again in the database and audits it. Figures in the answer that are not in its facts are flagged.

AI jobs (summaries, drafts) are processed by `tick` for the brands of the admin who runs it. Without
`ANTHROPIC_API_KEY` they deliver "AI not configured: facts only" with the event's facts; nothing is invented.

## 8. Scheduling

Record events run at once. The time-based rules run when an admin opens Autopilot, with "Run monitoring now", and at
most every 2 minutes (unless forced). To run them every 15 minutes without anyone opening Autopilot, the owner may
turn on Supabase's `pg_cron` extension and add, in the SQL editor:

```sql
select cron.schedule('autopilot-scan', '*/15 * * * *',
  $$ select public.ap_scan(); update public.autopilot_state set last_scan_at = now() where id = 1 $$);
```

This is a Supabase setting, so it is the owner's choice and is not part of the migration. AI jobs created by scheduled
scans wait until an admin opens Autopilot (the function runs as that admin).

## 9. Tests

- `bash scripts/db/test-command-center.sh` (real PostgreSQL): applies every migration, re-applies both new ones, runs
  `scripts/db/command-center.test.sql` and `scripts/db/autopilot.test.sql` as real signed-in users (creation rights,
  validation, versions, conditions, failing actions and retries, duplicates, the retry limit, approval, cross-brand
  isolation, budget currency, monitoring de-duplication and resolution, dismissal, AI jobs per brand, notifications and
  muting, proposals, knowledge failures, anonymous access), then the rollback and re-apply.
- `node --experimental-strip-types --test scripts/ci/autopilot.test.mjs`: proposal validation, knowledge scope, job texts.

## 10. Deployment

1. Merge the Command Center pull request first, then this one (it is stacked on it).
2. The migration runs with the other migrations; the `autopilot` function deploys with the others
   (`.github/workflows/supabase-deploy.yml`, `verify_jwt = true`).
3. Optional: `ANTHROPIC_API_KEY` (already used by the concierge and the analyst) enables the assistant and AI jobs.
4. Optional: the schedule of section 8.

## 11. Limits and remaining work

- No email: there is no email provider. Notifications are in-app only.
- Time-based rules need someone opening Autopilot, the button, or the optional schedule.
- Editors and viewers cannot see brand colleagues (the existing `brand_admins` select rule), so Autopilot is for brand
  admins and super admins.
- The assistant and AI jobs were tested with a fake model; the live model has not been verified here.
- CI could not run for this change (GitHub Actions minutes are used up until about 1 November); the evidence is the
  local gate listed in the pull request.
