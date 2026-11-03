import React from "react";
import { Pill } from "@/components/command/ui";

// Shared vocabulary of the Autopilot screens: triggers, actions, condition fields, statuses and severities, in words.

export const TRIGGERS: Record<string, { label: string; help: string }> = {
  "lead.created": { label: "Lead created", help: "A lead is added in CRM." },
  "lead.stage_changed": { label: "Lead stage changed", help: "A lead moves to another pipeline stage." },
  "contact.created": { label: "Contact created", help: "A contact is linked to the brand." },
  "project.created": { label: "Project created", help: "A project is created (also by converting a lead)." },
  "project.status_changed": { label: "Project status changed", help: "A project changes status." },
  "task.created": { label: "Task created", help: "A task or deliverable is added." },
  "task.completed": { label: "Task completed", help: "A task or deliverable is marked done." },
  "task.overdue": { label: "Task overdue", help: "Found by monitoring: a task is past its due date." },
  "project.deadline_approaching": { label: "Project deadline approaching", help: "Found by monitoring: deadline within 7 days." },
  "milestone.completed": { label: "Milestone completed", help: "A milestone is ticked." },
  "invoice.created": { label: "Invoice created", help: "An invoice is recorded." },
  "invoice.overdue": { label: "Invoice overdue", help: "Found by monitoring: a sent invoice is past due with a balance." },
  "payment.recorded": { label: "Payment recorded", help: "A payment is received." },
  "expense.recorded": { label: "Expense recorded", help: "An expense is recorded." },
  "project.budget_threshold": { label: "Project cost changed", help: "An expense on a project: budget use in the project's own currency." },
  "knowledge.publication_completed": { label: "Knowledge publication completed", help: "The AI now uses newly published knowledge (global)." },
  "knowledge.sync_failed": { label: "Knowledge synchronization failed", help: "A Knowledge Studio publication failed (global)." },
  // Client OS (docs/client-os.md section 14)
  "client.invited": { label: "Client invited", help: "A client portal invitation was created." },
  "client.invitation_accepted": { label: "Client invitation accepted", help: "A client activated their portal access." },
  "partner.invited": { label: "Partner invited", help: "A partner portal invitation was created." },
  "partner.invitation_accepted": { label: "Partner invitation accepted", help: "A partner activated their portal access." },
  "project.client_added": { label: "Client added to a project", help: "A client can now see a project." },
  "project.client_status_changed": { label: "Client-facing status changed", help: "A project moved to a stage the client sees differently." },
  "proposal.sent": { label: "Proposal sent", help: "A proposal version was sent to the client." },
  "proposal.accepted": { label: "Proposal accepted", help: "The client accepted a proposal." },
  "proposal.rejected": { label: "Proposal rejected", help: "The client rejected a proposal." },
  "deliverable.submitted": { label: "Deliverable submitted", help: "A version was submitted to the client." },
  "deliverable.approved": { label: "Deliverable approved", help: "The client approved a version." },
  "deliverable.revision_requested": { label: "Revision requested", help: "The client asked for a revision." },
  "deliverable.rejected": { label: "Deliverable rejected", help: "The client rejected a version." },
  "client.request_created": { label: "Client request created", help: "A client opened a request about a project." },
  "client.request_resolved": { label: "Client request resolved", help: "A client request was resolved." },
  "contract.approved": { label: "Contract approved", help: "The client approved a contract version." },
  "partner.assigned": { label: "Partner assigned", help: "A partner was given access to a project." },
  "partner.access_revoked": { label: "Partner access revoked", help: "A partner's project access ended." },
  // Knowledge OS (docs/knowledge-os.md section 13)
  "knowledge.review_requested": { label: "Knowledge review requested", help: "A library document was submitted for review." },
  "knowledge.review_overdue": { label: "Knowledge review overdue", help: "Found by monitoring: a document's review date has passed." },
  "knowledge.expiring": { label: "Knowledge expiring", help: "Found by monitoring: a document expires within 14 days." },
  "knowledge.document_published": { label: "Knowledge published", help: "A library document version was published." },
  "knowledge.document_archived": { label: "Knowledge archived", help: "A library document was archived." },
  "knowledge.gap_detected": { label: "Knowledge gap", help: "Found by monitoring: the same question went unanswered 3 times in a week." },
};

export const ACTIONS: Record<string, { label: string; help: string; fields: ("title" | "body" | "priority" | "category" | "severity" | "due_in_days" | "include_central" | "to" | "instruction" | "assign")[] }> = {
  create_task: { label: "Create a task", help: "In the event's project.", fields: ["title", "priority", "due_in_days", "assign"] },
  notify_admins: { label: "Notify the brand's admins", help: "In-app notification.", fields: ["title", "body", "priority", "category", "include_central"] },
  notify_owner: { label: "Notify the owner", help: "The record's owner, in-app.", fields: ["title", "body", "priority", "category"] },
  create_followup: { label: "Create a CRM follow-up", help: "On the lead; optional follow-up date.", fields: ["title", "due_in_days"] },
  set_status: { label: "Change a status", help: "Only safe changes: project on hold/active, task in progress/blocked/to do, lead contacted/qualified.", fields: ["to"] },
  add_activity: { label: "Add an activity entry", help: "In the activity history.", fields: ["title"] },
  create_alert: { label: "Create an alert / review item", help: "An operational alert.", fields: ["title", "body", "severity", "category"] },
  queue_assignment: { label: "Add to the assignment queue", help: "The lead waits for an owner (resolved when assigned).", fields: [] },
  ai_summary: { label: "Generate an AI summary", help: "Written from the event's facts, delivered as a notification.", fields: ["instruction"] },
  followup_draft: { label: "Draft a follow-up message", help: "A draft for an admin to review. Never sent to a client.", fields: ["instruction"] },
};

export const FIELDS: Record<string, string> = {
  status: "Status", from_status: "Previous status", to_status: "New status", stage: "Lead stage", from_stage: "Previous stage", to_stage: "New stage",
  priority: "Priority", kind: "Task kind", currency: "Currency", amount: "Amount", outstanding: "Outstanding balance", budget: "Budget",
  actual_cost: "Actual cost", budget_use_pct: "Budget used (%)", days_overdue: "Days overdue", days_to_deadline: "Days to deadline",
  progress_pct: "Progress (%)", owner_id: "Owner", assignee_id: "Assignee", unassigned: "No owner", category: "Category", source: "Source", brand_id: "Brand",
};
export const OPS: Record<string, string> = { eq: "is", neq: "is not", gt: ">", gte: "≥", lt: "<", lte: "≤", in: "is one of", is_empty: "is empty", not_empty: "is set" };

export const SEVERITY_TONE: Record<string, "bad" | "warn" | "info" | "neutral"> = { critical: "bad", high: "bad", medium: "warn", low: "info", info: "neutral" };
export const SeverityPill = ({ severity }: { severity: string }) => <Pill tone={SEVERITY_TONE[severity] ?? "neutral"}>{severity === "info" ? "Informational" : severity[0]!.toUpperCase() + severity.slice(1)}</Pill>;

export const RUN_TONE: Record<string, "good" | "bad" | "warn" | "info" | "neutral"> = { completed: "good", failed: "bad", awaiting_approval: "warn", running: "info", pending: "info", skipped: "neutral", cancelled: "neutral" };
export const RUN_LABEL: Record<string, string> = { completed: "Completed", failed: "Failed", awaiting_approval: "Awaiting approval", running: "Running", pending: "Pending", skipped: "Conditions not met", cancelled: "Cancelled" };
export const RunPill = ({ status }: { status: string }) => <Pill tone={RUN_TONE[status] ?? "neutral"}>{RUN_LABEL[status] ?? status}</Pill>;

export const describeCondition = (c: { field: string; op: string; value?: string }) =>
  `${FIELDS[c.field] ?? c.field} ${OPS[c.op] ?? c.op}${c.op === "is_empty" || c.op === "not_empty" ? "" : ` ${c.value ?? ""}`}`;

/** Notification categories (user_notifications.category) and their words. */
export const NOTIFICATION_CATEGORIES: Record<string, string> = { leads: "Leads", projects: "Projects", tasks: "Tasks", finance: "Finance", automations: "Automations", alerts: "Alerts", system: "System", knowledge: "Knowledge" };
/** Operational alert categories (ops_alerts.category). */
export const ALERT_CATEGORIES: Record<string, string> = { projects: "Projects", crm: "CRM", finance: "Finance", system: "System" };
