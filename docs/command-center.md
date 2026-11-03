# Houcine.world Command Center

Written 31 October 2026. The Command Center is the Workspace's management environment: executive overview,
analytics, finance, CRM and lead pipeline, project portfolio, brand profiles, activity and audit history, reports
(CSV and PDF) and a read-only AI management analyst. It is built on the existing sign-in and brand authorization
(`brand_admins`, `is_super_admin()`, `has_brand_access()`, `has_brand_role()`); nothing about them was replaced.

| Where | Who | What |
| --- | --- | --- |
| `/workspace/command` and `/workspace/command/<section>` | super admins | **Global**: every brand, with a brand filter |
| `/workspace/<brand>/command` and `/workspace/<brand>/command/<section>` | the brand's admins (and super admins) | **Brand**: that brand only; a person with several brands switches with the brand selector |

Sections: Overview, Analytics, Finance, CRM, Projects, Brands, Activity, Reports, AI Analyst. The period (and, globally,
the brand filter) is kept in the address, so links, reloads and the KPI links keep it.

## 1. Architecture

```
browser (signed-in user's own session)                      Supabase
  src/pages/workspace/command/CommandCenter.tsx  ─┐
  src/components/command/*  (screens)             ├─ reads/writes ─▶ tables with row-level security ─▶ audit_logs
  src/services/command.ts   (data access)        ─┘                 (triggers validate links and write the audit)
        │                                                            
        └─ supabase/functions/_shared/command/load.ts  (ONE loader: the same records everywhere)
           supabase/functions/_shared/command/metrics.ts  (ONE engine: every figure, every report)
  AI Analyst ─▶ supabase/functions/command-analyst  (as the user; facts from the engine; read-only)
```

- **One loader, one engine.** The screens, the reports and exports, and the AI analyst all read through
  `load.ts` and compute through `metrics.ts`. A report can never disagree with a dashboard.
- **Security is in the database.** Every read and write runs with the signed-in user's own token, so row-level
  security decides what exists for them. The screens only choose what to ask for. A brand id, project id or contact id
  changed in the address returns nothing (tested).
- **Refresh strategy.** Records are loaded when a section opens, when the scope changes and when **Refresh** is pressed;
  the header says when they were loaded and that the page is not live. Nothing is cached between sessions. Each
  table is read up to 5,000 rows per scope; a notice names any table that was cut (then narrow the brands).
  When volumes grow, the engine's aggregations can move into SQL functions with the same definitions.

## 2. Data model (migration `supabase/migrations/20261031100000_command_center.sql`)

Existing tables kept as they are: `profiles`, `services`, `brands`, `brand_admins`, `bookings`, `audit_logs` (now also
the Command Center's activity history), the others untouched. No existing row is changed or reassigned; existing
`bookings` stay as they are (a lead may point to one with `leads.booking_id`, nothing is imported automatically).

| Table | What | Brand link |
| --- | --- | --- |
| `contacts` | One identity per person or organization (unique email, case-insensitive) | none: visible through `contact_brands` |
| `contact_brands` | A brand's relationship with a contact: prospect, client (with the date), partner, supplier, inactive; source | `brand_id` |
| `leads` | The pipeline: stage, expected value and currency (pipeline, not revenue), owner, follow-up | `brand_id` |
| `lead_events` | Every stage a lead entered, written by a trigger only, append-only | `brand_id` |
| `interactions` | Calls, emails, meetings, notes, follow-ups | `brand_id` |
| `projects` | Status, priority, dates, currency, budget, estimated cost, contract value + signing date | `brand_id` |
| `project_members`, `milestones`, `tasks` | Team, milestones, tasks and deliverables (`kind`) | taken from the project |
| `invoices` | Invoiced revenue (draft, sent, void); payment status is derived, never stored | `brand_id` |
| `payments` | Received revenue; may settle an invoice (same brand, same currency, never more than due) | `brand_id` |
| `expenses` | Recorded costs (recorded, void), optionally per project | `brand_id` |

Rules the database enforces (triggers): every linked contact, lead, project, invoice, milestone and person belongs to
the record's brand; a record never moves to another brand; tasks, milestones and members take their project's
brand whatever the request says; amounts need a currency (EUR or USD only); a contract value needs its signing date;
payments match their invoice's currency and never exceed it; a void invoice takes no payment. Server functions:
`create_contact` (create or link the identity with the same email), `convert_lead` (won lead -> project, contact
becomes a client: the only "conversion"), `log_report` (records a report or export).

**Revenue records.** There is no separate "revenue" table, so a transaction is never stored twice: invoiced revenue is
`invoices`, received revenue is `payments`, contracted revenue is the signed contract on `projects`, expected revenue is
the open pipeline on `leads`.

## 3. Permissions

| | Super admin | Brand admin | Editor and up | Viewer |
| --- | --- | --- | --- | --- |
| Global Command Center | yes | no | no | no |
| Read contacts, leads, projects, tasks of the brand | all brands | own brands | own brands | own brands |
| Create and change them | yes | yes | yes | no |
| Delete them | yes | yes | no | no |
| Finance (invoices, payments, expenses), read and write | yes | yes | no | no |
| Activity and audit history | all | own brands | no | no |
| Reports and exports | all | own brands (finance only as above) | | |

Contacts: an identity is visible to someone who can see a brand it is linked to; linking an existing identity to a brand
also requires seeing it already (no linking an unknown id). Audit history: the browser cannot write, change or delete
it (no write grant; tested). The AI analyst checks the requested brands with `has_brand_access` /
`has_brand_role` before reading, then reads as the user.

**Existing rule worth knowing (not changed here).** The current policy on `brand_admins` shows membership rows to brand
admins only, so the Workspace's brand guard admits brand admins and super admins but turns editors and viewers away.
The Command Center's tables already support editors and viewers (tested in the database); letting them into the
Workspace is a separate decision about sign-in and roles.

## 4. Metrics (formulas, `supabase/functions/_shared/command/metrics.ts`)

Days are calendar days in Europe/Paris, both ends included. Previous period: the previous month for "this month"
(the same number of days) and "last month", the same days of the previous quarter or year, otherwise the same number of
days just before. A change against zero or a missing period has no percentage ("New", "No previous data").

| Figure | Formula | Records |
| --- | --- | --- |
| New leads | leads created in the period | `leads.created_at` |
| Lead conversion | won ÷ (won + lost), distinct leads that reached won or lost in the period | `lead_events` only |
| Funnel | distinct leads that entered each stage in the period | `lead_events` |
| Pipeline (expected) | expected values of open leads, per currency; not revenue | `leads` |
| Active clients | distinct contacts with client status | `contact_brands` |
| New clients | became a client of a brand in the period | `contact_brands.became_client_at` |
| New vs returning | paid in the period; returning = also paid before it | `payments.contact_id` |
| Contracted | contract values signed in the period | `projects.contract_*` |
| Invoiced | sent invoices issued in the period | `invoices` |
| Received (recorded revenue) | payments received in the period | `payments` |
| Outstanding | sent invoices issued by the period end minus their payments by then | `invoices`, `payments` |
| Expenses | recorded (not void) expenses in the period | `expenses` |
| Estimated profit | received − expenses, per currency, only when both exist (an estimate) | |
| Active / completed / overdue projects | status active / completed in the period / live with deadline passed | `projects` |
| Tasks completed, awaiting, overdue | done in the period / not done / not done with due date passed | `tasks` |
| Project completion rate | completed ÷ (completed + cancelled), all finished projects | `projects` |
| Average project value | budgets of projects created in the period ÷ their number, per currency | `projects` |

Money is integer cents per currency. **EUR and USD are never added**: every total is a per-currency list, and no
conversion rate exists in the system. Figures a role may not read are "Not available" with the reason, never zero.
Retention and lifetime value are not shown until there is enough payment history.

### Project health

| Health | When |
| --- | --- |
| Off track | deadline passed and not completed; actual costs above the budget (same currency); 3 or more overdue tasks |
| At risk | 1-2 overdue tasks; a missed milestone; progress 25+ points behind the share of time used; costs above 90% of the budget; deadline within 7 days with progress under 80% |
| On track | none of these |
| Not enough data | no tasks and no deadline |

Progress = done tasks ÷ all tasks (deliverables included). Time used = days since start ÷ days from start to deadline.
Every project shows its reasons.

## 5. Reports and exports

Monthly performance summary, brand comparison, revenue summary, outstanding payments, client acquisition, lead
conversion, project delivery, project profitability (estimate) and operational activity, for the scope and period in
the header and a currency choice. CSV (UTF-8) and PDF (a small built-in writer, `src/lib/command/pdf.ts`: no
dependency). Every export is recorded in the activity history (`report.generated`).

## 6. AI management analyst (`supabase/functions/command-analyst`)

Read-only. The function: checks the origin and the signed-in user; accepts "every brand" only from a super admin and
otherwise only brands the user may read; reads finance only for a brand admin of every brand asked; loads the
records **as the user**; the engine computes a facts pack (this month, last month, last 30 days, this quarter, this
year, per brand, open projects with health and reasons, clients with several open projects, history length); the model
(the existing Anthropic provider) receives only that pack and the question, with rules: cite metric, period, scope,
currency and source; label facts, calculated metrics, estimates and recommendations; no forecast without 6 months of
history. Every number in the answer that is not in the pack is shown as **unverified**, and the pack itself can be
opened under each answer. No SQL, no tools, no writes, no key in the browser. Secrets: `ANTHROPIC_API_KEY` (shared
with the concierge), optional `ANALYST_MODEL`.

## 7. Tests

| What | How |
| --- | --- |
| Security, triggers, functions on a real PostgreSQL (cross-brand reads and writes by every identifier, roles, append-only history, currencies, conversion, audit values) | `bash scripts/db/test-command-center.sh` (needs PostgreSQL binaries; applies every migration, re-runs this one, runs `scripts/db/command-center.test.sql`) |
| The engine: periods, comparisons, currencies, revenue classes, conversion, health, scoping | `scripts/ci/command-metrics.test.mjs` |
| The analyst: facts, hidden finance, unverified numbers, no service key, scope checked before reading | `scripts/ci/command-analyst.test.mjs` |

## 8. Deployment

1. Merge: the **Deploy Supabase** workflow applies the migration and deploys `command-analyst` with the other functions.
2. Nothing to configure for the screens. The AI analyst uses the existing `ANTHROPIC_API_KEY`; without it, it says it is
   not configured.
3. Start in CRM: add contacts and leads, then projects and finance. There is no sample data.
