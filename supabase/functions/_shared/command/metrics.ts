// The Command Center's ONE calculation engine (docs/command-center.md, "Metrics"). Pure: records in, figures out,
// no I/O, no clock (the caller passes "today"). Used by the Workspace dashboards, the reports and exports, and the AI
// management analyst, so they can never give different numbers for the same question.
//
// Rules kept everywhere:
//   - Currencies are never added together: every amount is a per-currency map (EUR, USD), in integer cents.
//   - "No data recorded" (null, with a reason) is different from zero.
//   - A percentage change against zero or against a period with no data is not a number (null, with a reason).
//   - Days are calendar days in one business time zone (Europe/Paris by default), boundaries inclusive.
//   - Revenue classes stay apart: pipeline (expected) is not contracted, contracted is not invoiced, invoiced is not
//     received.

export const CURRENCIES = ["EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export type Money = Partial<Record<Currency, number>>; // integer cents, only currencies that occur
export const BUSINESS_TIME_ZONE = "Europe/Paris";

// ---------- records (the columns the engine reads; see supabase/migrations/20261031100000_command_center.sql) ----------

export interface LeadRow { id: string; brand_id: string; contact_id: string | null; stage: string; expected_value: number | string | null; currency: Currency | null; source: string | null; created_at: string; won_at: string | null; lost_at: string | null; converted_project_id: string | null; deleted_at?: string | null }
export interface LeadEventRow { lead_id: string; brand_id: string; from_stage: string | null; to_stage: string; created_at: string }
export interface ContactBrandRow { contact_id: string; brand_id: string; status: string; source: string | null; became_client_at: string | null; created_at: string }
export interface ProjectRow { id: string; brand_id: string; client_contact_id: string | null; name: string; status: string; priority: string; start_date: string | null; deadline: string | null; currency: Currency | null; budget: number | string | null; estimated_cost: number | string | null; contract_value: number | string | null; contract_signed_on: string | null; completed_at: string | null; created_at: string; deleted_at?: string | null }
export interface TaskRow { id: string; project_id: string; brand_id: string; milestone_id: string | null; kind: string; status: string; due_date: string | null; completed_at: string | null; created_at: string }
export interface MilestoneRow { id: string; project_id: string; brand_id: string; due_date: string | null; completed_at: string | null }
export interface InvoiceRow { id: string; brand_id: string; contact_id: string | null; project_id: string | null; issue_date: string; due_date: string | null; amount: number | string; currency: Currency; status: string }
export interface PaymentRow { id: string; brand_id: string; invoice_id: string | null; contact_id: string | null; project_id: string | null; amount: number | string; currency: Currency; received_on: string }
export interface ExpenseRow { id: string; brand_id: string; project_id: string | null; amount: number | string; currency: Currency; incurred_on: string; category: string | null; status: string }

export interface Dataset {
  leads: LeadRow[];
  leadEvents: LeadEventRow[];
  contactBrands: ContactBrandRow[];
  projects: ProjectRow[];
  tasks: TaskRow[];
  milestones: MilestoneRow[];
  /** null when the caller may not read finance (not a brand admin): finance figures are then "not available". */
  invoices: InvoiceRow[] | null;
  payments: PaymentRow[] | null;
  expenses: ExpenseRow[] | null;
}

// ---------- dates and periods ----------

const dayFormat = (tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
/** The calendar day (YYYY-MM-DD) of a timestamp or date in the business time zone. A bare date is kept as is. */
export const dayOf = (value: string, tz = BUSINESS_TIME_ZONE): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dayFormat(tz).format(new Date(value));

const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => fromUtc(toUtc(day) + n * 86_400_000);
export const daysBetween = (a: string, b: string) => Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
const monthStart = (day: string) => `${day.slice(0, 7)}-01`;
const addMonths = (day: string, n: number) => {
  const d = new Date(toUtc(monthStart(day)));
  d.setUTCMonth(d.getUTCMonth() + n);
  return fromUtc(d.getTime());
};

export type PeriodPreset = "today" | "last_7_days" | "last_30_days" | "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";
export interface Period { preset: PeriodPreset; start: string; end: string; label: string }
export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  today: "Today", last_7_days: "Last 7 days", last_30_days: "Last 30 days", this_month: "This month",
  last_month: "Last month", this_quarter: "This quarter", this_year: "This year", custom: "Custom range",
};

/** A period of whole calendar days, both ends included. `today` is the business day of "now". */
export const resolvePeriod = (preset: PeriodPreset, today: string, custom?: { start: string; end: string }): Period => {
  const make = (start: string, end: string): Period => ({ preset, start, end, label: preset === "custom" ? `${start} to ${end}` : PERIOD_LABELS[preset] });
  switch (preset) {
    case "today": return make(today, today);
    case "last_7_days": return make(addDays(today, -6), today);
    case "last_30_days": return make(addDays(today, -29), today);
    case "this_month": return make(monthStart(today), today);
    case "last_month": return make(addMonths(today, -1), addDays(monthStart(today), -1));
    case "this_quarter": {
      const q = Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1;
      return make(`${today.slice(0, 4)}-${String(q).padStart(2, "0")}-01`, today);
    }
    case "this_year": return make(`${today.slice(0, 4)}-01-01`, today);
    case "custom": {
      if (!custom || !/^\d{4}-\d{2}-\d{2}$/.test(custom.start) || !/^\d{4}-\d{2}-\d{2}$/.test(custom.end) || custom.end < custom.start) {
        throw new Error("A custom range needs a start and an end date, the end not before the start.");
      }
      return make(custom.start, custom.end);
    }
  }
};

/**
 * The equivalent previous period: the previous month for month presets (the same number of days into it for "this
 * month"), the previous quarter or year for those, otherwise the same number of days just before.
 */
export const previousPeriod = (p: Period): Period => {
  const len = daysBetween(p.start, p.end);
  if (p.preset === "this_month" || p.preset === "last_month") {
    const start = addMonths(p.start, -1);
    const monthEnd = addDays(p.start, -1);
    const end = p.preset === "last_month" ? monthEnd : [addDays(start, len), monthEnd].sort()[0]!;
    return { preset: "custom", start, end, label: "Previous month" };
  }
  if (p.preset === "this_quarter" || p.preset === "this_year") {
    const months = p.preset === "this_year" ? 12 : 3;
    const start = addMonths(p.start, -months);
    const end = [addDays(start, len), addDays(p.start, -1)].sort()[0]!;
    return { preset: "custom", start, end, label: p.preset === "this_year" ? "Same days last year" : "Same days last quarter" };
  }
  return { preset: "custom", start: addDays(p.start, -(len + 1)), end: addDays(p.start, -1), label: "Previous period" };
};

const within = (value: string | null | undefined, p: Period) => {
  if (!value) return false;
  const d = dayOf(value);
  return d >= p.start && d <= p.end;
};

// ---------- money ----------

export const cents = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Not an amount: ${String(v)}`);
  return Math.round(n * 100);
};
export const addMoney = (m: Money, currency: Currency, amountCents: number): Money => ({ ...m, [currency]: (m[currency] ?? 0) + amountCents });
const sumMoney = <T>(rows: T[], amount: (r: T) => number | string | null, currency: (r: T) => Currency | null): Money => {
  let m: Money = {};
  for (const r of rows) {
    const c = currency(r);
    if (!c) continue;
    m = addMoney(m, c, cents(amount(r)));
  }
  return m;
};
export const subtractMoney = (a: Money, b: Money): Money => {
  const out: Money = {};
  for (const c of CURRENCIES) if (a[c] !== undefined || b[c] !== undefined) out[c] = (a[c] ?? 0) - (b[c] ?? 0);
  return out;
};
export const formatMoney = (m: Money, locale = "en-GB"): string => {
  const parts = CURRENCIES.filter((c) => m[c] !== undefined).map((c) => new Intl.NumberFormat(locale, { style: "currency", currency: c }).format((m[c] ?? 0) / 100));
  return parts.length ? parts.join(" · ") : "—";
};

// ---------- figures with honesty ----------

export interface Figure<T> {
  value: T | null;
  /** Why there is no value (no records of this kind at all, finance not visible to this role...). */
  unavailable?: string;
}
export interface Change { current: number; previous: number | null; delta: number | null; pct: number | null; note?: string }

/** Change between two counts or amounts. No percentage against zero or a missing previous value. */
export const change = (current: number, previous: number | null): Change => {
  if (previous === null) return { current, previous, delta: null, pct: null, note: "No previous data" };
  const delta = current - previous;
  if (previous === 0) return { current, previous, delta, pct: null, note: current === 0 ? "No change" : "New (previous period was zero)" };
  return { current, previous, delta, pct: Math.round((delta / Math.abs(previous)) * 1000) / 10 };
};

// ---------- the metrics ----------

const OPEN_STAGES = new Set(["new", "contacted", "qualified", "proposal_sent", "negotiation"]);
export const PIPELINE_STAGES = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"] as const;
const finished = (s: string) => s === "completed" || s === "cancelled";

/** Lead figures for a period. Conversion counts only real stage events (lead_events), never a renamed lead. */
export const leadMetrics = (d: Dataset, p: Period) => {
  const leads = d.leads.filter((l) => !l.deleted_at);
  const newLeads = leads.filter((l) => within(l.created_at, p));
  const eventsIn = d.leadEvents.filter((e) => within(e.created_at, p));
  const reached = (stage: string) => new Set(eventsIn.filter((e) => e.to_stage === stage).map((e) => e.lead_id)).size;
  const won = reached("won");
  const lost = reached("lost");
  return {
    newLeads: newLeads.length,
    openLeads: leads.filter((l) => OPEN_STAGES.has(l.stage)).length,
    won,
    lost,
    /** Won / (won + lost), for leads that reached won or lost within the period. */
    conversionRate: won + lost > 0 ? { value: Math.round((won / (won + lost)) * 1000) / 10 } as Figure<number> : { value: null, unavailable: "No lead was won or lost in this period." },
    /** Distinct leads that entered each stage during the period. */
    funnel: PIPELINE_STAGES.map((stage) => ({ stage, leads: reached(stage) })),
    /** Open pipeline (not revenue): expected values of leads still open at the end of the period. */
    pipelineValue: sumMoney(leads.filter((l) => OPEN_STAGES.has(l.stage)), (l) => l.expected_value, (l) => l.currency),
    bySource: countBy(newLeads, (l) => l.source || "Not recorded"),
  };
};

const countBy = <T>(rows: T[], key: (r: T) => string) => {
  const out: Record<string, number> = {};
  for (const r of rows) out[key(r)] = (out[key(r)] ?? 0) + 1;
  return Object.entries(out).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, count: n }));
};

/** Client figures. New = became a client of a brand in the period. Returning = paid in the period and also before it. */
export const clientMetrics = (d: Dataset, p: Period) => {
  const clients = d.contactBrands.filter((c) => c.status === "client");
  const newClients = clients.filter((c) => within(c.became_client_at, p));
  const out = {
    activeClients: new Set(clients.map((c) => c.contact_id)).size,
    newClients: newClients.length,
    acquisitionSources: countBy(newClients, (c) => c.source || "Not recorded"),
    returning: { value: null, unavailable: "Needs payment records." } as Figure<{ newPaying: number; returning: number }>,
  };
  if (d.payments) {
    const paidIn = new Set(d.payments.filter((x) => x.contact_id && within(x.received_on, p)).map((x) => x.contact_id!));
    const paidBefore = new Set(d.payments.filter((x) => x.contact_id && dayOf(x.received_on) < p.start).map((x) => x.contact_id!));
    const returning = [...paidIn].filter((c) => paidBefore.has(c)).length;
    out.returning = paidIn.size ? { value: { newPaying: paidIn.size - returning, returning } } : { value: null, unavailable: "No payment linked to a client in this period." };
  }
  return out;
};

/**
 * Revenue classes for a period, per currency:
 *   pipeline     expected values of open leads (NOT revenue)
 *   contracted   contract values of projects whose contract was signed in the period
 *   invoiced     invoices sent (not draft, not void) with an issue date in the period
 *   received     payments received in the period
 *   outstanding  at the end of the period: sent invoices issued by then, minus their payments received by then
 *   expenses     recorded (not void) expenses incurred in the period
 *   profit       received minus expenses, an ESTIMATE, only for a currency with both
 */
export const financeMetrics = (d: Dataset, p: Period) => {
  const contracted = sumMoney(d.projects.filter((x) => !x.deleted_at && x.contract_signed_on && within(x.contract_signed_on, p)), (x) => x.contract_value, (x) => x.currency);
  if (!d.invoices || !d.payments || !d.expenses) {
    const why = "Finance records are visible to brand admins and super admins only.";
    return { visible: false as const, why, contracted };
  }
  const sent = d.invoices.filter((i) => i.status === "sent");
  const invoiced = sumMoney(sent.filter((i) => within(i.issue_date, p)), (i) => i.amount, (i) => i.currency);
  const received = sumMoney(d.payments.filter((x) => within(x.received_on, p)), (x) => x.amount, (x) => x.currency);
  const issuedByEnd = sent.filter((i) => dayOf(i.issue_date) <= p.end);
  const paidByEnd = d.payments.filter((x) => x.invoice_id && dayOf(x.received_on) <= p.end && issuedByEnd.some((i) => i.id === x.invoice_id));
  const outstanding = subtractMoney(sumMoney(issuedByEnd, (i) => i.amount, (i) => i.currency), sumMoney(paidByEnd, (x) => x.amount, (x) => x.currency));
  const overdueInvoices = issuedByEnd.filter((i) => i.due_date && dayOf(i.due_date) < p.end && invoiceBalance(i, d.payments!, p.end) > 0);
  const expenses = sumMoney(d.expenses.filter((e) => e.status !== "void" && within(e.incurred_on, p)), (e) => e.amount, (e) => e.currency);
  const profit: Money = {};
  for (const c of CURRENCIES) if (received[c] !== undefined && expenses[c] !== undefined) profit[c] = received[c]! - expenses[c]!;
  return {
    visible: true as const,
    hasRecords: d.invoices.length + d.payments.length + d.expenses.length > 0,
    contracted, invoiced, received, outstanding, expenses,
    overdueInvoices: overdueInvoices.length,
    estimatedProfit: Object.keys(profit).length ? { value: profit } as Figure<Money> : { value: null, unavailable: "Needs both payments and expenses in the same currency in this period." } as Figure<Money>,
  };
};

/** What is still due on an invoice on a given day (cents, in its own currency). */
export const invoiceBalance = (inv: InvoiceRow, payments: PaymentRow[], onDay: string): number =>
  cents(inv.amount) - payments.filter((x) => x.invoice_id === inv.id && dayOf(x.received_on) <= onDay).reduce((s, x) => s + cents(x.amount), 0);

/** The payment status of an invoice, derived from its payments (never stored). */
export const invoicePaymentStatus = (inv: InvoiceRow, payments: PaymentRow[], today: string): "draft" | "void" | "paid" | "partially_paid" | "overdue" | "unpaid" => {
  if (inv.status === "draft" || inv.status === "void") return inv.status;
  const due = invoiceBalance(inv, payments, today);
  if (due <= 0) return "paid";
  if (inv.due_date && dayOf(inv.due_date) < today) return "overdue";
  return due < cents(inv.amount) ? "partially_paid" : "unpaid";
};

/** Revenue received per bucket (day, ISO week or month, from the period's length), per currency. */
export const revenueTrend = (payments: PaymentRow[], p: Period) => {
  const len = daysBetween(p.start, p.end) + 1;
  const unit: "day" | "week" | "month" = len <= 31 ? "day" : len <= 120 ? "week" : "month";
  const bucketOf = (day: string) => {
    if (unit === "day") return day;
    if (unit === "month") return day.slice(0, 7);
    const dow = (new Date(toUtc(day)).getUTCDay() + 6) % 7; // Monday = 0
    return addDays(day, -dow);
  };
  const buckets: string[] = [];
  for (let d = p.start; d <= p.end; d = addDays(d, 1)) {
    const b = bucketOf(d);
    if (buckets[buckets.length - 1] !== b) buckets.push(b);
  }
  const rows = buckets.map((b) => ({ bucket: b, EUR: 0, USD: 0 }));
  const index = new Map(rows.map((r, i) => [r.bucket, i]));
  for (const x of payments) {
    if (!within(x.received_on, p)) continue;
    const i = index.get(bucketOf(dayOf(x.received_on)));
    if (i !== undefined) rows[i]![x.currency] += cents(x.amount);
  }
  return { unit, rows };
};

// ---------- projects ----------

export type Health = "on_track" | "at_risk" | "off_track" | "not_enough_data" | "closed";
export interface ProjectHealth { health: Health; progress: number | null; plannedProgress: number | null; reasons: string[]; overdueTasks: number; openTasks: number; doneTasks: number; missedMilestones: number; actualCost: Money; budgetUse: number | null }

/**
 * Project health, from documented rules only (docs/command-center.md, "Project health"):
 *   off track  deadline passed and not completed; or actual costs above the budget (same currency); or 3+ overdue tasks
 *   at risk    1-2 overdue tasks; a missed milestone; progress 25+ points behind the time elapsed; costs above 90% of
 *              the budget; deadline within 7 days with progress under 80%
 *   on track   none of these
 *   not enough data  no tasks and no deadline
 * Progress = done tasks / all tasks (deliverables included). Planned progress = days elapsed / days from start to deadline.
 */
export const projectHealth = (project: ProjectRow, tasks: TaskRow[], milestones: MilestoneRow[], expenses: ExpenseRow[] | null, today: string): ProjectHealth => {
  const mine = tasks.filter((t) => t.project_id === project.id);
  const done = mine.filter((t) => t.status === "done").length;
  const open = mine.length - done;
  const overdueTasks = mine.filter((t) => t.status !== "done" && t.due_date && t.due_date < today).length;
  const missedMilestones = milestones.filter((m) => m.project_id === project.id && !m.completed_at && m.due_date && m.due_date < today).length;
  const progress = mine.length ? done / mine.length : null;
  const plannedProgress = project.start_date && project.deadline && project.deadline > project.start_date
    ? Math.min(1, Math.max(0, daysBetween(project.start_date, today) / daysBetween(project.start_date, project.deadline)))
    : null;
  const actualCost = expenses ? sumMoney(expenses.filter((e) => e.project_id === project.id && e.status !== "void"), (e) => e.amount, (e) => e.currency) : {};
  const budget = cents(project.budget);
  const spent = project.currency ? actualCost[project.currency] ?? 0 : 0;
  const budgetUse = expenses && project.currency && budget > 0 ? spent / budget : null;
  const base = { progress, plannedProgress, overdueTasks, openTasks: open, doneTasks: done, missedMilestones, actualCost, budgetUse };
  if (finished(project.status)) return { ...base, health: "closed", reasons: [project.status === "completed" ? "Completed" : "Cancelled"] };

  const off: string[] = [];
  const risk: string[] = [];
  if (project.deadline && project.deadline < today) off.push(`Deadline passed (${project.deadline})`);
  if (budgetUse !== null && budgetUse > 1) off.push(`Costs above budget (${Math.round(budgetUse * 100)}%)`);
  if (overdueTasks >= 3) off.push(`${overdueTasks} overdue tasks`);
  else if (overdueTasks > 0) risk.push(`${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`);
  if (missedMilestones > 0) risk.push(`${missedMilestones} missed milestone${missedMilestones > 1 ? "s" : ""}`);
  if (progress !== null && plannedProgress !== null && progress < plannedProgress - 0.25) risk.push(`Progress ${Math.round(progress * 100)}% vs ${Math.round(plannedProgress * 100)}% of time used`);
  if (budgetUse !== null && budgetUse > 0.9 && budgetUse <= 1) risk.push(`Costs at ${Math.round(budgetUse * 100)}% of budget`);
  if (project.deadline && project.deadline >= today && daysBetween(today, project.deadline) <= 7 && (progress ?? 0) < 0.8) risk.push(`Deadline in ${daysBetween(today, project.deadline)} days`);
  if (off.length) return { ...base, health: "off_track", reasons: [...off, ...risk] };
  if (risk.length) return { ...base, health: "at_risk", reasons: risk };
  if (!mine.length && !project.deadline) return { ...base, health: "not_enough_data", reasons: ["No tasks and no deadline"] };
  return { ...base, health: "on_track", reasons: [] };
};

/** Project and task figures for a period ("today" decides what is overdue). */
export const projectMetrics = (d: Dataset, p: Period, today: string) => {
  const projects = d.projects.filter((x) => !x.deleted_at);
  const live = projects.filter((x) => !finished(x.status));
  const health = live.map((x) => ({ project: x, ...projectHealth(x, d.tasks, d.milestones, d.expenses, today) }));
  const openTasks = d.tasks.filter((t) => t.status !== "done");
  return {
    activeProjects: projects.filter((x) => x.status === "active").length,
    completedInPeriod: projects.filter((x) => x.status === "completed" && within(x.completed_at, p)).length,
    overdueProjects: live.filter((x) => x.deadline && x.deadline < today).length,
    approachingDeadline: live.filter((x) => x.deadline && x.deadline >= today && daysBetween(today, x.deadline) <= 14).length,
    statusDistribution: ["planned", "active", "on_hold", "completed", "cancelled"].map((s) => ({ status: s, count: projects.filter((x) => x.status === s).length })),
    needsAttention: health.filter((h) => h.health === "off_track" || h.health === "at_risk"),
    tasksCompletedInPeriod: d.tasks.filter((t) => t.status === "done" && within(t.completed_at, p)).length,
    deliverablesCompletedInPeriod: d.tasks.filter((t) => t.kind === "deliverable" && t.status === "done" && within(t.completed_at, p)).length,
    tasksAwaiting: openTasks.length,
    overdueTasks: openTasks.filter((t) => t.due_date && t.due_date < today).length,
    overdueDeliverables: openTasks.filter((t) => t.kind === "deliverable" && t.due_date && t.due_date < today).length,
    /** Completed / (completed + cancelled), over every finished project of the scope (cancellations carry no date). */
    completionRate: (() => {
      const completed = projects.filter((x) => x.status === "completed").length;
      const cancelled = projects.filter((x) => x.status === "cancelled").length;
      return completed + cancelled > 0 ? { value: Math.round((completed / (completed + cancelled)) * 1000) / 10 } as Figure<number> : { value: null, unavailable: "No project completed or cancelled." } as Figure<number>;
    })(),
    averageProjectValue: (() => {
      const withBudget = projects.filter((x) => x.budget !== null && x.currency && within(x.created_at, p));
      const m = sumMoney(withBudget, (x) => x.budget, (x) => x.currency);
      const out: Money = {};
      for (const c of CURRENCIES) {
        const n = withBudget.filter((x) => x.currency === c).length;
        if (n) out[c] = Math.round(m[c]! / n);
      }
      return Object.keys(out).length ? { value: out } as Figure<Money> : { value: null, unavailable: "No project with a budget created in this period." } as Figure<Money>;
    })(),
  };
};

// ---------- everything for one scope ----------

/** Restrict a dataset to some brands (the caller's data is already limited by the database to what they may see). */
export const forBrands = (d: Dataset, brandIds: string[] | null): Dataset => {
  if (!brandIds) return d;
  const keep = new Set(brandIds);
  const f = <T extends { brand_id: string }>(rows: T[]) => rows.filter((r) => keep.has(r.brand_id));
  return {
    leads: f(d.leads), leadEvents: f(d.leadEvents), contactBrands: f(d.contactBrands), projects: f(d.projects), tasks: f(d.tasks),
    milestones: f(d.milestones), invoices: d.invoices && f(d.invoices), payments: d.payments && f(d.payments), expenses: d.expenses && f(d.expenses),
  };
};

export interface Snapshot {
  period: Period;
  previous: Period;
  leads: ReturnType<typeof leadMetrics>;
  leadsPrevious: ReturnType<typeof leadMetrics>;
  clients: ReturnType<typeof clientMetrics>;
  clientsPrevious: ReturnType<typeof clientMetrics>;
  finance: ReturnType<typeof financeMetrics>;
  financePrevious: ReturnType<typeof financeMetrics>;
  projects: ReturnType<typeof projectMetrics>;
  revenueTrend: ReturnType<typeof revenueTrend> | null;
  hasAnyRecords: boolean;
}

/** All figures for a period and its previous period. */
export const snapshot = (d: Dataset, p: Period, today: string): Snapshot => {
  const prev = previousPeriod(p);
  return {
    period: p,
    previous: prev,
    leads: leadMetrics(d, p),
    leadsPrevious: leadMetrics(d, prev),
    clients: clientMetrics(d, p),
    clientsPrevious: clientMetrics(d, prev),
    finance: financeMetrics(d, p),
    financePrevious: financeMetrics(d, prev),
    projects: projectMetrics(d, p, today),
    revenueTrend: d.payments ? revenueTrend(d.payments, p) : null,
    hasAnyRecords: d.leads.length + d.contactBrands.length + d.projects.length + (d.invoices?.length ?? 0) + (d.payments?.length ?? 0) + (d.expenses?.length ?? 0) > 0,
  };
};

/** One row per brand for comparisons (each brand keeps its own currencies). */
export const brandComparison = (d: Dataset, brands: { id: string; name: string }[], p: Period, today: string) =>
  brands.map((b) => {
    const s = snapshot(forBrands(d, [b.id]), p, today);
    return {
      brand: b,
      received: s.finance.visible ? s.finance.received : null,
      outstanding: s.finance.visible ? s.finance.outstanding : null,
      newLeads: s.leads.newLeads,
      conversionRate: s.leads.conversionRate,
      newClients: s.clients.newClients,
      activeProjects: s.projects.activeProjects,
      completedProjects: s.projects.completedInPeriod,
      overdueProjects: s.projects.overdueProjects,
      tasksCompleted: s.projects.tasksCompletedInPeriod,
      hasAnyRecords: s.hasAnyRecords,
    };
  });
