import React from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useCommand } from "./context";
import { tokenColor, Empty, fmtMoneyCents, HEALTH, Kpi, LoadingGrid, MoneyLines, Panel, Pill, label } from "./ui";
import RecentActivity from "./RecentActivity";
import { brandComparison, change, CURRENCIES, forBrands, type Currency, type Money } from "../../../supabase/functions/_shared/command/metrics.ts";

// The executive overview: how the ecosystem (or one brand) is doing in the chosen period, compared with the
// equivalent previous period. Every figure comes from the shared engine; every KPI links to its records.

const axis = { stroke: tokenColor("muted-foreground"), fontSize: 11 };
const grid = tokenColor("border");
const tooltipStyle = { background: tokenColor("card"), border: `1px solid ${tokenColor("border")}`, borderRadius: 8, fontSize: 12 };
const CURRENCY_COLOR: Record<Currency, string> = { EUR: tokenColor("foreground"), USD: tokenColor("muted-foreground") };

const moneyValue = (m: Money | undefined) => {
  const present = CURRENCIES.filter((c) => m && m[c] !== undefined);
  if (!present.length) return "—";
  return <span className="flex flex-col text-xl">{present.map((c) => <span key={c}>{fmtMoneyCents(m![c]!, c)}</span>)}</span>;
};
/** A change for a single currency, only when both periods have that currency. */
const moneyChange = (cur: Money | undefined, prev: Money | undefined) => {
  const present = CURRENCIES.filter((c) => cur?.[c] !== undefined || prev?.[c] !== undefined);
  if (present.length !== 1) return null;
  const c = present[0]!;
  return change(cur?.[c] ?? 0, prev?.[c] ?? 0);
};

const Overview = () => {
  const { snap, loading, data, link, mode, scopeBrands, period, today, scope } = useCommand();
  if (loading && !snap) return <LoadingGrid tiles={12} />;
  if (!snap || !data) return null;
  const { leads, leadsPrevious, clients, clientsPrevious, finance, financePrevious, projects } = snap;
  const f = finance.visible ? finance : null;
  const fp = financePrevious.visible ? financePrevious : null;
  const financeNote = finance.visible ? undefined : finance.why;

  if (!snap.hasAnyRecords) {
    return (
      <Empty title="No records yet">
        The Command Center shows figures from real records only. Start in <Link className="underline" to={link("crm")}>CRM</Link> (contacts and leads), <Link className="underline" to={link("projects")}>Projects</Link>
        {finance.visible && <> or <Link className="underline" to={link("finance")}>Finance</Link></>}. Nothing here is sample data.
      </Empty>
    );
  }

  const trend = snap.revenueTrend;
  const comparison = mode === "global" ? brandComparison(forBrands(data.dataset, scope.brandIds), scopeBrands.map((b) => ({ id: b.id, name: b.name })), period, today) : [];
  const funnelMax = Math.max(1, ...leads.funnel.map((x) => x.leads));

  return (
    <div className="space-y-5">
      <Panel title="Business" description={`${period.label}, compared with ${snap.previous.label.toLowerCase()} (${snap.previous.start} to ${snap.previous.end})`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {mode === "global" && <Kpi label="Active brands" value={scopeBrands.filter((b) => b.status === "active").length} to={link("brands")} />}
          <Kpi label="Active clients" value={clients.activeClients} to={link("crm", { status: "client" })} hint="Contacts with client status" />
          <Kpi label="New clients" value={clients.newClients} change={change(clients.newClients, clientsPrevious.newClients)} to={link("crm", { status: "client" })} />
          <Kpi label="New leads" value={leads.newLeads} change={change(leads.newLeads, leadsPrevious.newLeads)} to={link("crm", { tab: "pipeline" })} />
          <Kpi label="Lead conversion" value={leads.conversionRate.value !== null ? `${leads.conversionRate.value}%` : "—"} unavailable={leads.conversionRate.unavailable} hint="Won ÷ (won + lost) in the period" to={link("crm", { tab: "pipeline" })} />
          <Kpi label="Active projects" value={projects.activeProjects} to={link("projects", { status: "active" })} />
          <Kpi label="Completed projects" value={projects.completedInPeriod} to={link("projects", { status: "completed" })} hint="In the period" />
          <Kpi label="Overdue projects" value={projects.overdueProjects} to={link("projects", { filter: "overdue" })} invert />
          <Kpi label="Recorded revenue" value={moneyValue(f?.received)} change={moneyChange(f?.received, fp?.received)} unavailable={financeNote} to={link("finance", { tab: "payments" })} hint="Payments received" />
          <Kpi label="Outstanding payments" value={moneyValue(f?.outstanding)} unavailable={financeNote} to={link("finance", { tab: "invoices", filter: "outstanding" })} hint={`At ${period.end}`} invert />
        </div>
      </Panel>

      <Panel title="Financial" description="Each currency separately; nothing is converted.">
        {!f ? <Empty title="Finance not available">{financeNote}</Empty> : !f.hasRecords ? (
          <Empty title="No financial record yet">Record invoices, payments and expenses in <Link className="underline" to={link("finance")}>Finance</Link>.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Contracted" value={moneyValue(finance.contracted)} hint="Contracts signed in the period" to={link("projects")} />
            <Kpi label="Invoiced" value={moneyValue(f.invoiced)} change={moneyChange(f.invoiced, fp?.invoiced)} to={link("finance", { tab: "invoices" })} hint="Sent invoices issued" />
            <Kpi label="Received" value={moneyValue(f.received)} change={moneyChange(f.received, fp?.received)} to={link("finance", { tab: "payments" })} />
            <Kpi label="Outstanding" value={moneyValue(f.outstanding)} to={link("finance", { tab: "invoices", filter: "outstanding" })} hint={`${f.overdueInvoices} overdue invoice${f.overdueInvoices === 1 ? "" : "s"}`} invert />
            <Kpi label="Expenses" value={moneyValue(f.expenses)} change={moneyChange(f.expenses, fp?.expenses)} to={link("finance", { tab: "expenses" })} invert />
            <Kpi label="Estimated profit" value={moneyValue(f.estimatedProfit.value ?? undefined)} unavailable={f.estimatedProfit.unavailable} hint="Received − expenses (estimate)" />
          </div>
        )}
      </Panel>

      <Panel title="Operations">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Approaching deadline" value={projects.approachingDeadline} hint="Within 14 days" to={link("projects", { filter: "due_soon" })} />
          <Kpi label="Overdue deliverables" value={projects.overdueDeliverables} to={link("projects", { filter: "overdue_tasks" })} invert />
          <Kpi label="Tasks completed" value={projects.tasksCompletedInPeriod} hint="In the period" to={link("projects")} />
          <Kpi label="Tasks awaiting action" value={projects.tasksAwaiting} to={link("projects", { filter: "open_tasks" })} />
          <Kpi label="Overdue tasks" value={projects.overdueTasks} to={link("projects", { filter: "overdue_tasks" })} invert />
          <Kpi label="Projects needing attention" value={projects.needsAttention.length} to={link("projects", { filter: "attention" })} invert />
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Revenue received" description={trend ? `Per ${trend.unit}, each currency on its own line` : undefined}>
          {!trend ? <Empty title="Finance not available">{financeNote}</Empty> : trend.rows.every((r) => !r.EUR && !r.USD) ? <Empty title="No payment received in this period" /> : (
            <div className="h-64" role="img" aria-label="Revenue received over time">
              <ResponsiveContainer>
                <LineChart data={trend.rows.map((r) => ({ bucket: r.bucket, EUR: r.EUR / 100, USD: r.USD / 100 }))}>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" {...axis} tickLine={false} />
                  <YAxis {...axis} tickLine={false} width={60} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {CURRENCIES.filter((c) => trend.rows.some((r) => r[c])).map((c) => <Line key={c} type="linear" dataKey={c} stroke={CURRENCY_COLOR[c]} strokeWidth={2} dot={false} isAnimationActive={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Lead funnel" description="Distinct leads that entered each stage in the period (from the stage history)">
          {leads.funnel.every((x) => x.leads === 0) ? <Empty title="No pipeline movement in this period" /> : (
            <ul className="space-y-1.5">
              {leads.funnel.map((x) => (
                <li key={x.stage}>
                  <Link to={link("crm", { tab: "pipeline", stage: x.stage })} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 rounded px-1 py-0.5 text-sm hover:bg-muted/30">
                    <span className="text-muted-foreground">{label(x.stage)}</span>
                    <span className="h-2 rounded-full bg-muted"><span className={`block h-2 rounded-full ${x.stage === "lost" ? "bg-rose-400/70" : x.stage === "won" ? "bg-emerald-400/70" : "bg-foreground/60"}`} style={{ width: `${(100 * x.leads) / funnelMax}%` }} /></span>
                    <span className="text-right tabular-nums">{x.leads}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Project status">
          {projects.statusDistribution.every((x) => x.count === 0) ? <Empty title="No project yet" /> : (
            <div className="h-56" role="img" aria-label="Projects by status">
              <ResponsiveContainer>
                <BarChart data={projects.statusDistribution.map((x) => ({ status: label(x.status), count: x.count }))}>
                  <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="status" {...axis} tickLine={false} />
                  <YAxis {...axis} allowDecimals={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: tokenColor("muted", 0.3) }} />
                  <Bar dataKey="count" fill={tokenColor("foreground", 0.7)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="Projects needing attention" description="From the documented health rules (Projects shows every reason)">
          {projects.needsAttention.length === 0 ? <Empty title="No project at risk or off track" /> : (
            <ul className="divide-y divide-border/60">
              {projects.needsAttention.slice(0, 8).map((h) => (
                <li key={h.project.id}>
                  <Link to={link("projects", { id: h.project.id })} className="flex items-start justify-between gap-3 py-2 text-sm hover:bg-muted/20">
                    <span className="min-w-0"><span className="font-medium">{h.project.name}</span><span className="block text-xs text-muted-foreground">{h.reasons.join(" · ")}</span></span>
                    <Pill tone={HEALTH[h.health]!.tone}>{HEALTH[h.health]!.label}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {mode === "global" && (
        <Panel title="Brand performance" description="Each brand's own figures; amounts per currency, never summed across currencies">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Brand", "Received", "Outstanding", "New leads", "Conversion", "New clients", "Active projects", "Overdue"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {comparison.map((r) => (
                  <tr key={r.brand.id} className="border-t border-border/60">
                    <th scope="row" className="px-2 py-2 font-medium"><Link className="hover:underline" to={link("brands", { id: r.brand.id })}>{r.brand.name}</Link>{!r.hasAnyRecords && <span className="ml-2 text-xs font-normal text-muted-foreground">no records yet</span>}</th>
                    <td className="px-2 py-2"><MoneyLines money={r.received} empty={r.received === null ? "n/a" : "—"} /></td>
                    <td className="px-2 py-2"><MoneyLines money={r.outstanding} empty={r.outstanding === null ? "n/a" : "—"} /></td>
                    <td className="px-2 py-2 tabular-nums">{r.newLeads}</td>
                    <td className="px-2 py-2 tabular-nums">{r.conversionRate.value !== null ? `${r.conversionRate.value}%` : "—"}</td>
                    <td className="px-2 py-2 tabular-nums">{r.newClients}</td>
                    <td className="px-2 py-2 tabular-nums">{r.activeProjects}</td>
                    <td className="px-2 py-2 tabular-nums">{r.overdueProjects}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Recent activity" actions={<Link to={link("activity")} className="text-xs text-muted-foreground hover:text-foreground hover:underline">All activity</Link>}>
        <RecentActivity limit={8} />
      </Panel>
    </div>
  );
};

export default Overview;
