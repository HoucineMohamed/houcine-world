import React, { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commandApi } from "@/services/command";
import { renderPdf, toCsv } from "@/lib/command/pdf";
import { useCommand } from "./context";
import { useAsync } from "./useAsync";
import { Empty, ErrorBox, Field, fmtMoneyCents, inputCls, label, Panel } from "./ui";
import {
  addMoney, brandComparison, cents, CURRENCIES, forBrands, invoiceBalance, projectHealth, type Currency, type Money,
} from "../../../supabase/functions/_shared/command/metrics.ts";

// Reports: the same engine and the same records as the dashboards (never a second calculation), for the scope and
// period in the header, previewed here and exported as CSV or PDF. Each generation is recorded in the activity
// history. Only records the database lets this person read can appear in a report.

const KINDS = [
  ["ecosystem", "Monthly performance summary"],
  ["brands", "Brand performance comparison"],
  ["revenue", "Revenue summary"],
  ["outstanding", "Outstanding payments"],
  ["clients", "Client acquisition"],
  ["leads", "Lead conversion"],
  ["delivery", "Project delivery"],
  ["profitability", "Project profitability"],
  ["activity", "Operational activity"],
] as const;
type Kind = (typeof KINDS)[number][0];

interface Report { title: string; columns: string[]; rows: string[][]; notes: string[] }

const Reports = () => {
  const { snap, data, scope, scopeBrands, period, today, mode, brandName, canAdmin } = useCommand();
  const [kind, setKind] = useState<Kind>("ecosystem");
  const [currency, setCurrency] = useState<"all" | Currency>("all");
  const [err, setErr] = useState<string | null>(null);
  const needsLists = kind === "outstanding" || kind === "profitability" || kind === "delivery";
  const invoices = useAsync(() => (canAdmin && kind === "outstanding" ? commandApi.invoices(scope) : Promise.resolve([])), [kind, JSON.stringify(scope.brandIds)]);
  const contacts = useAsync(() => (needsLists ? commandApi.contacts() : Promise.resolve([])), [kind]);
  const projects = useAsync(() => (needsLists ? commandApi.projects(scope) : Promise.resolve([])), [kind, JSON.stringify(scope.brandIds)]);
  const activity = useAsync(() => (kind === "activity" ? commandApi.activity(scope, { from: period.start, to: period.end }) : Promise.resolve([])), [kind, period.start, period.end, JSON.stringify(scope.brandIds)]);

  const cur = CURRENCIES.filter((c) => currency === "all" || c === currency);
  const m = (money: Money | null | undefined) => (money ? cur.filter((c) => money[c] !== undefined).map((c) => fmtMoneyCents(money[c]!, c)).join(" / ") || "—" : "n/a");

  const report: Report | null = useMemo(() => {
    if (!snap || !data) return null;
    const d = forBrands(data.dataset, scope.brandIds);
    const fin = snap.finance.visible ? snap.finance : null;
    const finNote = snap.finance.visible ? [] : [snap.finance.why];
    const scopeLine = `Scope: ${mode === "global" ? (scope.brandIds ? scopeBrands.map((b) => b.name).join(", ") : "all brands") : scopeBrands[0]?.name ?? ""}. Period: ${period.start} to ${period.end} (business days, Europe/Paris). Amounts per currency, never converted.`;
    switch (kind) {
      case "ecosystem": {
        const p = snap.projects;
        return { title: "Performance summary", columns: ["Metric", "Value", "Previous period"], notes: [scopeLine, ...finNote], rows: [
          ["New leads", String(snap.leads.newLeads), String(snap.leadsPrevious.newLeads)],
          ["Lead conversion (won ÷ won+lost)", snap.leads.conversionRate.value !== null ? `${snap.leads.conversionRate.value}%` : "not available", snap.leadsPrevious.conversionRate.value !== null ? `${snap.leadsPrevious.conversionRate.value}%` : "not available"],
          ["New clients", String(snap.clients.newClients), String(snap.clientsPrevious.newClients)],
          ["Active clients", String(snap.clients.activeClients), ""],
          ["Active projects", String(p.activeProjects), ""],
          ["Projects completed", String(p.completedInPeriod), ""],
          ["Overdue projects", String(p.overdueProjects), ""],
          ["Tasks completed", String(p.tasksCompletedInPeriod), ""],
          ["Revenue received", m(fin?.received), m(snap.financePrevious.visible ? snap.financePrevious.received : null)],
          ["Invoiced", m(fin?.invoiced), m(snap.financePrevious.visible ? snap.financePrevious.invoiced : null)],
          ["Outstanding at period end", m(fin?.outstanding), ""],
          ["Expenses", m(fin?.expenses), m(snap.financePrevious.visible ? snap.financePrevious.expenses : null)],
        ] };
      }
      case "brands": {
        const rows = brandComparison(d, scopeBrands.map((b) => ({ id: b.id, name: b.name })), period, today);
        return { title: "Brand performance comparison", columns: ["Brand", "Received", "Outstanding", "New leads", "Conversion", "New clients", "Active projects", "Completed"], notes: [scopeLine], rows: rows.map((r) => [r.brand.name, m(r.received), m(r.outstanding), String(r.newLeads), r.conversionRate.value !== null ? `${r.conversionRate.value}%` : "—", String(r.newClients), String(r.activeProjects), String(r.completedProjects)]) };
      }
      case "revenue":
        return { title: "Revenue summary", columns: ["Class", "Amount", "What it counts"], notes: [scopeLine, ...finNote], rows: [
          ["Pipeline (expected, not revenue)", m(snap.leads.pipelineValue), "Expected values of open leads"],
          ["Contracted", m(snap.finance.contracted), "Contracts signed in the period"],
          ["Invoiced", m(fin?.invoiced), "Sent invoices issued in the period"],
          ["Received", m(fin?.received), "Payments received in the period"],
          ["Outstanding", m(fin?.outstanding), `Sent invoices minus their payments at ${period.end}`],
          ["Expenses", m(fin?.expenses), "Recorded expenses in the period"],
          ["Estimated profit", fin?.estimatedProfit.value ? m(fin.estimatedProfit.value) : "not available", "Received minus expenses, per currency (estimate)"],
        ] };
      case "outstanding": {
        if (!canAdmin || !d.payments) return { title: "Outstanding payments", columns: [], rows: [], notes: finNote.length ? finNote : ["Finance is visible to brand admins only."] };
        const rows = (invoices.value ?? []).filter((i) => i.status === "sent" && i.issue_date <= period.end && cur.includes(i.currency))
          .map((i) => ({ i, due: invoiceBalance(i as never, d.payments!, period.end) })).filter((x) => x.due > 0)
          .map(({ i, due }) => [i.number, brandName(i.brand_id), (contacts.value ?? []).find((c) => c.id === i.contact_id)?.name ?? "—", i.issue_date, i.due_date ?? "—", fmtMoneyCents(cents(i.amount), i.currency), fmtMoneyCents(due, i.currency)]);
        return { title: "Outstanding payments", columns: ["Invoice", "Brand", "Client", "Issued", "Due", "Amount", "Still due"], rows, notes: [scopeLine, `Balances at ${period.end}.`] };
      }
      case "clients":
        return { title: "Client acquisition", columns: ["Source", "New clients"], notes: [scopeLine, `New clients: ${snap.clients.newClients} (previous period ${snap.clientsPrevious.newClients}).`, snap.clients.returning.value ? `Paying for the first time: ${snap.clients.returning.value.newPaying}; returning: ${snap.clients.returning.value.returning}.` : `Returning clients: ${snap.clients.returning.unavailable}`], rows: snap.clients.acquisitionSources.map((s) => [s.key, String(s.count)]) };
      case "leads":
        return { title: "Lead conversion", columns: ["Stage", "Leads that entered it in the period"], notes: [scopeLine, `Conversion: ${snap.leads.conversionRate.value !== null ? `${snap.leads.conversionRate.value}% (${snap.leads.won} won, ${snap.leads.lost} lost)` : snap.leads.conversionRate.unavailable}. Counted from the recorded stage history only.`], rows: snap.leads.funnel.map((f) => [label(f.stage), String(f.leads)]) };
      case "delivery": {
        const list = (projects.value ?? []).map((p) => {
          const h = projectHealth(p as never, d.tasks, d.milestones, d.expenses, today);
          return [p.name, brandName(p.brand_id), label(p.status), label(h.health), h.progress !== null ? `${Math.round(h.progress * 100)}%` : "—", p.deadline ?? "—", h.reasons.join("; ")];
        });
        return { title: "Project delivery", columns: ["Project", "Brand", "Status", "Health", "Progress", "Deadline", "Reasons"], rows: list, notes: [scopeLine, "Health follows the documented rules (docs/command-center.md)."] };
      }
      case "profitability": {
        if (!d.payments || !d.expenses) return { title: "Project profitability", columns: [], rows: [], notes: finNote };
        const rows = (projects.value ?? []).map((p) => {
          let rec: Money = {};
          let cost: Money = {};
          for (const x of d.payments!.filter((y) => y.project_id === p.id)) rec = addMoney(rec, x.currency, cents(x.amount));
          for (const x of d.expenses!.filter((y) => y.project_id === p.id && y.status !== "void")) cost = addMoney(cost, x.currency, cents(x.amount));
          const margin: Money = {};
          for (const c of CURRENCIES) if (rec[c] !== undefined || cost[c] !== undefined) margin[c] = (rec[c] ?? 0) - (cost[c] ?? 0);
          return [p.name, brandName(p.brand_id), p.currency && p.budget !== null ? fmtMoneyCents(cents(p.budget), p.currency) : "—", m(rec), m(cost), m(margin)];
        });
        return { title: "Project profitability (all time, estimate)", columns: ["Project", "Brand", "Budget", "Received", "Actual cost", "Received − cost"], rows, notes: [scopeLine, "All recorded payments and expenses of each project, per currency. An estimate, not accounting."] };
      }
      case "activity": {
        const counts = new Map<string, number>();
        for (const e of activity.value ?? []) counts.set(e.action, (counts.get(e.action) ?? 0) + 1);
        return { title: "Operational activity", columns: ["Action", "Times"], rows: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => [a, String(n)]), notes: [scopeLine, `The ${(activity.value ?? []).length} most recent recorded operations of the period (at most 100).`] };
      }
    }
  }, [kind, currency, snap, data, invoices.value, contacts.value, projects.value, activity.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = (name: string, blob: Blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportAs = async (format: "csv" | "pdf") => {
    if (!report) return;
    try {
      await commandApi.logReport(mode === "brand" || scope.brandIds?.length === 1 ? scopeBrands[0]?.id ?? null : null, kind, { format, from: period.start, to: period.end, currency, brands: scope.brandIds ?? "all" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The report could not be recorded.");
      return;
    }
    const base = `${report.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${period.start}-${period.end}`;
    if (format === "csv") download(`${base}.csv`, new Blob([toCsv(report.columns, report.rows)], { type: "text/csv;charset=utf-8" }));
    else {
      const lines = [
        { text: `Houcine.world Command Center: ${report.title}`, size: 14, bold: true },
        ...report.notes.map((n) => ({ text: n, size: 8 })),
        { text: `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, size: 8, gap: 6 },
        { text: report.columns.join("  |  "), bold: true, gap: 4 },
        ...report.rows.map((r) => ({ text: r.join("  |  ") })),
      ];
      download(`${base}.pdf`, new Blob([renderPdf(lines) as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Reports" description="Same records and same calculations as the dashboards, for the brands and period chosen at the top. Exports contain only what you are allowed to see, and are recorded in the activity history.">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Report"><select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Currency"><select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)}><option value="all">EUR and USD (separately)</option><option value="EUR">EUR only</option><option value="USD">USD only</option></select></Field>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!report?.rows.length} onClick={() => void exportAs("csv")}><Download className="h-3.5 w-3.5" aria-hidden="true" /> CSV</Button>
          <Button size="sm" variant="outline" className="gap-1.5" disabled={!report?.rows.length} onClick={() => void exportAs("pdf")}><FileText className="h-3.5 w-3.5" aria-hidden="true" /> PDF</Button>
        </div>
      </Panel>
      {err && <ErrorBox message={err} />}
      {report && (
        <Panel title={`Preview: ${report.title}`} description={report.notes.join(" ")}>
          {report.rows.length === 0 ? <Empty title="Nothing to report for this scope and period" /> : (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{report.columns.map((c) => <th key={c} scope="col" className="px-2 py-2 font-medium">{c}</th>)}</tr></thead>
              <tbody>{report.rows.map((r, i) => <tr key={i} className="border-t border-border/60">{r.map((v, j) => <td key={j} className="px-2 py-2 tabular-nums">{v}</td>)}</tr>)}</tbody>
            </table></div>
          )}
        </Panel>
      )}
    </div>
  );
};

export default Reports;
