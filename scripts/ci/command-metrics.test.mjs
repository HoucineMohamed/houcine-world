// The Command Center's calculation engine (supabase/functions/_shared/command/metrics.ts): period boundaries and
// comparisons, currencies never mixed, revenue classes kept apart, conversion from real stage events only, "no data"
// different from zero, and the documented project-health rules.
//
//   node --experimental-strip-types --test scripts/ci/command-metrics.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname;
const M = await import(join(root, "supabase/functions/_shared/command/metrics.ts"));
const empty = () => ({ leads: [], leadEvents: [], contactBrands: [], projects: [], tasks: [], milestones: [], invoices: [], payments: [], expenses: [] });
const A = "brand-a", B = "brand-b";

test("periods: whole days, both ends included, with the right previous period", () => {
  const today = "2026-10-31";
  assert.deepEqual(M.resolvePeriod("today", today), { preset: "today", start: today, end: today, label: "Today" });
  assert.deepEqual([M.resolvePeriod("last_7_days", today).start, M.resolvePeriod("last_30_days", today).start], ["2026-10-25", "2026-10-02"]);
  const lastMonth = M.resolvePeriod("last_month", today);
  assert.deepEqual([lastMonth.start, lastMonth.end], ["2026-09-01", "2026-09-30"]);
  assert.deepEqual([M.previousPeriod(lastMonth).start, M.previousPeriod(lastMonth).end], ["2026-08-01", "2026-08-31"]);
  const thisMonth = M.resolvePeriod("this_month", "2026-03-31");
  assert.deepEqual([M.previousPeriod(thisMonth).start, M.previousPeriod(thisMonth).end], ["2026-02-01", "2026-02-28"], "never runs past the shorter month");
  const q = M.resolvePeriod("this_quarter", "2026-11-15");
  assert.deepEqual([q.start, M.previousPeriod(q).start, M.previousPeriod(q).end], ["2026-10-01", "2026-07-01", "2026-08-15"]);
  const y = M.resolvePeriod("this_year", today);
  assert.deepEqual([M.previousPeriod(y).start, M.previousPeriod(y).end], ["2025-01-01", "2025-10-31"]);
  const w = M.resolvePeriod("last_7_days", today);
  assert.deepEqual([M.previousPeriod(w).start, M.previousPeriod(w).end], ["2026-10-18", "2026-10-24"]);
  assert.throws(() => M.resolvePeriod("custom", today, { start: "2026-10-10", end: "2026-10-01" }));
});

test("business days use Europe/Paris: 23:30 UTC on 31 October is 1 November there", () => {
  assert.equal(M.dayOf("2026-10-31T23:30:00Z"), "2026-11-01");
  assert.equal(M.dayOf("2026-10-31"), "2026-10-31");
});

test("changes never divide by zero or by a missing period", () => {
  assert.deepEqual(M.change(5, 4), { current: 5, previous: 4, delta: 1, pct: 25 });
  assert.equal(M.change(5, 0).pct, null);
  assert.match(M.change(5, 0).note, /New/);
  assert.equal(M.change(0, 0).note, "No change");
  assert.equal(M.change(3, null).pct, null);
});

test("money: integer cents, currencies never added together", () => {
  const d = empty();
  d.payments = [
    { id: "p1", brand_id: A, invoice_id: null, contact_id: null, project_id: null, amount: "0.10", currency: "EUR", received_on: "2026-10-05" },
    { id: "p2", brand_id: A, invoice_id: null, contact_id: null, project_id: null, amount: "0.20", currency: "EUR", received_on: "2026-10-06" },
    { id: "p3", brand_id: B, invoice_id: null, contact_id: null, project_id: null, amount: 100, currency: "USD", received_on: "2026-10-06" },
  ];
  const f = M.financeMetrics(d, M.resolvePeriod("this_month", "2026-10-31"));
  assert.deepEqual(f.received, { EUR: 30, USD: 10000 }, "0.10 + 0.20 is exactly 0.30, and USD stays apart");
  assert.equal(M.formatMoney(f.received), "€0.30 · US$100.00");
});

test("revenue classes stay apart: pipeline, contracted, invoiced, received, outstanding", () => {
  const d = empty();
  const p = M.resolvePeriod("this_month", "2026-10-31");
  d.leads = [{ id: "l1", brand_id: A, contact_id: null, stage: "proposal_sent", expected_value: 5000, currency: "EUR", source: null, created_at: "2026-10-02T10:00:00Z", won_at: null, lost_at: null, converted_project_id: null }];
  d.projects = [{ id: "pr1", brand_id: A, client_contact_id: null, name: "Site", status: "active", priority: "medium", start_date: null, deadline: null, currency: "EUR", budget: 2000, estimated_cost: null, contract_value: 2000, contract_signed_on: "2026-10-03", completed_at: null, created_at: "2026-10-03T00:00:00Z" }];
  d.invoices = [
    { id: "i1", brand_id: A, contact_id: "c1", project_id: "pr1", issue_date: "2026-10-04", due_date: "2026-10-20", amount: 1000, currency: "EUR", status: "sent" },
    { id: "i2", brand_id: A, contact_id: "c1", project_id: "pr1", issue_date: "2026-10-04", due_date: null, amount: 999, currency: "EUR", status: "draft" },
  ];
  d.payments = [{ id: "p1", brand_id: A, invoice_id: "i1", contact_id: "c1", project_id: "pr1", amount: 400, currency: "EUR", received_on: "2026-10-10" }];
  d.expenses = [{ id: "e1", brand_id: A, project_id: "pr1", amount: 150, currency: "EUR", incurred_on: "2026-10-11", category: null, status: "recorded" }];
  const f = M.financeMetrics(d, p);
  assert.deepEqual(M.leadMetrics(d, p).pipelineValue, { EUR: 500000 }, "a lead is pipeline, not revenue");
  assert.deepEqual(f.contracted, { EUR: 200000 });
  assert.deepEqual(f.invoiced, { EUR: 100000 }, "a draft invoice is not invoiced");
  assert.deepEqual(f.received, { EUR: 40000 });
  assert.deepEqual(f.outstanding, { EUR: 60000 });
  assert.equal(f.overdueInvoices, 1);
  assert.deepEqual(f.estimatedProfit.value, { EUR: 25000 });
  assert.equal(M.invoicePaymentStatus(d.invoices[0], d.payments, "2026-10-31"), "overdue");
  assert.equal(M.invoicePaymentStatus(d.invoices[0], d.payments, "2026-10-15"), "partially_paid");
});

test("finance hidden from a role is 'not available', never zero", () => {
  const d = { ...empty(), invoices: null, payments: null, expenses: null };
  const f = M.financeMetrics(d, M.resolvePeriod("this_month", "2026-10-31"));
  assert.equal(f.visible, false);
  assert.match(f.why, /brand admins/);
});

test("conversion comes from stage events only; renaming a lead to 'won' text converts nothing", () => {
  const d = empty();
  const p = M.resolvePeriod("this_month", "2026-10-31");
  d.leads = [
    { id: "l1", brand_id: A, contact_id: null, stage: "won", expected_value: null, currency: null, source: "website", created_at: "2026-10-01T09:00:00Z", won_at: "2026-10-09T09:00:00Z", lost_at: null, converted_project_id: null },
    { id: "l2", brand_id: A, contact_id: null, stage: "won", expected_value: null, currency: null, source: null, created_at: "2026-10-01T09:00:00Z", won_at: null, lost_at: null, converted_project_id: null },
  ];
  d.leadEvents = [
    { lead_id: "l1", brand_id: A, from_stage: null, to_stage: "new", created_at: "2026-10-01T09:00:00Z" },
    { lead_id: "l1", brand_id: A, from_stage: "new", to_stage: "won", created_at: "2026-10-09T09:00:00Z" },
    { lead_id: "l3", brand_id: A, from_stage: "new", to_stage: "lost", created_at: "2026-10-12T09:00:00Z" },
  ];
  const l = M.leadMetrics(d, p);
  assert.equal(l.won, 1, "l2 says won but has no won event");
  assert.equal(l.conversionRate.value, 50);
  assert.equal(M.leadMetrics(empty(), p).conversionRate.value, null);
  assert.equal(l.funnel.find((f) => f.stage === "new").leads, 1);
});

test("project health follows the documented rules", () => {
  const today = "2026-10-31";
  const base = { id: "p", brand_id: A, client_contact_id: null, name: "P", status: "active", priority: "medium", start_date: "2026-10-01", deadline: "2026-11-30", currency: "EUR", budget: 1000, estimated_cost: null, contract_value: null, contract_signed_on: null, completed_at: null, created_at: "2026-10-01" };
  const task = (id, status, due) => ({ id, project_id: "p", brand_id: A, milestone_id: null, kind: "task", status, due_date: due, completed_at: null, created_at: "2026-10-01" });
  assert.equal(M.projectHealth(base, [task("t1", "done", null), task("t2", "todo", "2026-11-20")], [], [], today).health, "on_track");
  assert.equal(M.projectHealth({ ...base, deadline: "2026-10-30" }, [], [], [], today).health, "off_track");
  const risky = M.projectHealth(base, [task("t1", "todo", "2026-10-20")], [], [], today);
  assert.equal(risky.health, "at_risk");
  assert.deepEqual(risky.reasons, ["1 overdue task", "Progress 0% vs 50% of time used"]);
  const over = M.projectHealth(base, [], [], [{ id: "e", brand_id: A, project_id: "p", amount: 1200, currency: "EUR", incurred_on: "2026-10-10", category: null, status: "recorded" }], today);
  assert.equal(over.health, "off_track");
  assert.equal(M.projectHealth({ ...base, deadline: null }, [], [], [], today).health, "not_enough_data");
  assert.equal(M.projectHealth({ ...base, status: "completed" }, [], [], [], today).health, "closed");
  const usd = M.projectHealth(base, [], [], [{ id: "e", brand_id: A, project_id: "p", amount: 5000, currency: "USD", incurred_on: "2026-10-10", category: null, status: "recorded" }], today);
  assert.notEqual(usd.health, "off_track", "USD costs are not compared with a EUR budget");
});

test("scoping by brand never leaks another brand's records", () => {
  const d = empty();
  d.payments = [
    { id: "p1", brand_id: A, invoice_id: null, contact_id: null, project_id: null, amount: 10, currency: "EUR", received_on: "2026-10-05" },
    { id: "p2", brand_id: B, invoice_id: null, contact_id: null, project_id: null, amount: 20, currency: "EUR", received_on: "2026-10-05" },
  ];
  const s = M.snapshot(M.forBrands(d, [A]), M.resolvePeriod("this_month", "2026-10-31"), "2026-10-31");
  assert.deepEqual(s.finance.received, { EUR: 1000 });
  const rows = M.brandComparison(d, [{ id: A, name: "A" }, { id: B, name: "B" }], M.resolvePeriod("this_month", "2026-10-31"), "2026-10-31");
  assert.deepEqual(rows.map((r) => r.received), [{ EUR: 1000 }, { EUR: 2000 }]);
});

test("revenue trend buckets by day, week or month and keeps currencies apart", () => {
  const pays = [
    { id: "p1", brand_id: A, invoice_id: null, contact_id: null, project_id: null, amount: 10, currency: "EUR", received_on: "2026-10-05" },
    { id: "p2", brand_id: A, invoice_id: null, contact_id: null, project_id: null, amount: 5, currency: "USD", received_on: "2026-10-05" },
  ];
  const day = M.revenueTrend(pays, M.resolvePeriod("this_month", "2026-10-31"));
  assert.equal(day.unit, "day");
  assert.deepEqual(day.rows.find((r) => r.bucket === "2026-10-05"), { bucket: "2026-10-05", EUR: 1000, USD: 500 });
  assert.equal(M.revenueTrend(pays, M.resolvePeriod("this_year", "2026-10-31")).unit, "month");
});
