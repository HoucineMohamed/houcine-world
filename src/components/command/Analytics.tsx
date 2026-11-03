import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCommand } from "./context";
import { tokenColor, Empty, LoadingGrid, MoneyLines, Panel } from "./ui";
import { addDays, brandComparison, daysBetween, dayOf, forBrands } from "../../../supabase/functions/_shared/command/metrics.ts";

// Analytics: brand comparison (global), client acquisition, lead sources, new versus returning paying clients. Each
// brand shows only the figures it actually records: a brand with no lead pipeline is "not tracked", never "0%".

const axis = { stroke: tokenColor("muted-foreground"), fontSize: 11 };
const tooltipStyle = { background: tokenColor("card"), border: `1px solid ${tokenColor("border")}`, borderRadius: 8, fontSize: 12 };

const Analytics = () => {
  const { snap, data, loading, mode, scopeBrands, period, today, scope } = useCommand();
  if (loading && !snap) return <LoadingGrid />;
  if (!snap || !data) return null;
  const d = forBrands(data.dataset, scope.brandIds);

  // New clients per bucket (week for long periods, day otherwise), from the date each became a client of a brand.
  const len = daysBetween(period.start, period.end) + 1;
  const weekly = len > 31;
  const bucketOf = (day: string) => (weekly ? addDays(day, -((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7)) : day);
  const buckets = new Map<string, number>();
  for (let x = period.start; x <= period.end; x = addDays(x, 1)) buckets.set(bucketOf(x), 0);
  for (const c of d.contactBrands) {
    if (c.status !== "client" || !c.became_client_at) continue;
    const day = dayOf(c.became_client_at);
    if (day < period.start || day > period.end) continue;
    buckets.set(bucketOf(day), (buckets.get(bucketOf(day)) ?? 0) + 1);
  }
  const acquisition = [...buckets.entries()].map(([bucket, clients]) => ({ bucket, clients }));
  const rows = mode === "global" ? brandComparison(d, scopeBrands.map((b) => ({ id: b.id, name: b.name })), period, today) : [];
  const tracks = (brandId: string) => ({
    leads: d.leads.some((l) => l.brand_id === brandId),
    projects: d.projects.some((p) => p.brand_id === brandId),
    clients: d.contactBrands.some((c) => c.brand_id === brandId),
    finance: !!d.payments && (d.payments.some((p) => p.brand_id === brandId) || (d.invoices ?? []).some((i) => i.brand_id === brandId)),
  });
  const nt = <span className="text-xs text-muted-foreground">not tracked</span>;
  const ret = snap.clients.returning;

  return (
    <div className="space-y-5">
      {mode === "global" && (
        <Panel title="Brand comparison" description={`${period.label}. A brand that does not record a kind of data shows "not tracked", so brands with different business models are not ranked on figures that do not apply to them.`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Brand", "Revenue received", "Outstanding", "New leads", "Lead conversion", "New clients", "Active projects", "Projects completed", "Tasks completed"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => {
                  const t = tracks(r.brand.id);
                  return (
                    <tr key={r.brand.id} className="border-t border-border/60">
                      <th scope="row" className="px-2 py-2 font-medium">{r.brand.name}</th>
                      <td className="px-2 py-2">{r.received === null ? "n/a" : t.finance ? <MoneyLines money={r.received} empty="—" /> : nt}</td>
                      <td className="px-2 py-2">{r.outstanding === null ? "n/a" : t.finance ? <MoneyLines money={r.outstanding} empty="—" /> : nt}</td>
                      <td className="px-2 py-2 tabular-nums">{t.leads ? r.newLeads : nt}</td>
                      <td className="px-2 py-2 tabular-nums">{t.leads ? (r.conversionRate.value !== null ? `${r.conversionRate.value}%` : "—") : nt}</td>
                      <td className="px-2 py-2 tabular-nums">{t.clients ? r.newClients : nt}</td>
                      <td className="px-2 py-2 tabular-nums">{t.projects ? r.activeProjects : nt}</td>
                      <td className="px-2 py-2 tabular-nums">{t.projects ? r.completedProjects : nt}</td>
                      <td className="px-2 py-2 tabular-nums">{t.projects ? r.tasksCompleted : nt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Client acquisition" description={`New clients per ${weekly ? "week" : "day"} (the day a contact became a client of a brand)`}>
          {acquisition.every((a) => a.clients === 0) ? <Empty title="No new client in this period" /> : (
            <div className="h-56" role="img" aria-label="New clients over time">
              <ResponsiveContainer>
                <BarChart data={acquisition}>
                  <CartesianGrid stroke={tokenColor("border")} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="bucket" {...axis} tickLine={false} />
                  <YAxis {...axis} allowDecimals={false} width={30} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: tokenColor("muted", 0.3) }} />
                  <Bar dataKey="clients" fill={tokenColor("foreground", 0.7)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel title="New and returning paying clients" description="Returning = paid in the period and also before it">
          {ret.value ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">Paying for the first time</dt><dd className="text-2xl font-semibold tabular-nums">{ret.value.newPaying}</dd></div>
              <div className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">Returning</dt><dd className="text-2xl font-semibold tabular-nums">{ret.value.returning}</dd></div>
            </dl>
          ) : <Empty title="Not available">{ret.unavailable} Retention and lifetime value need a longer payment history and are not shown until it exists.</Empty>}
        </Panel>

        <Panel title="Acquisition sources" description="Where the period's new clients and new leads came from (as recorded)">
          {snap.clients.acquisitionSources.length === 0 && snap.leads.bySource.length === 0 ? <Empty title="No new client or lead in this period" /> : (
            <div className="grid gap-4 sm:grid-cols-2">
              {[["New clients", snap.clients.acquisitionSources], ["New leads", snap.leads.bySource]].map(([title, list]) => (
                <div key={title as string}>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title as string}</h3>
                  <ul className="space-y-1 text-sm">{(list as { key: string; count: number }[]).map((s) => <li key={s.key} className="flex justify-between"><span>{s.key}</span><span className="tabular-nums text-muted-foreground">{s.count}</span></li>)}</ul>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Projects">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">Completion rate</dt><dd className="text-xl font-semibold">{snap.projects.completionRate.value !== null ? `${snap.projects.completionRate.value}%` : "—"}</dd><dd className="text-[0.7rem] text-muted-foreground">{snap.projects.completionRate.unavailable ?? "Completed ÷ (completed + cancelled)"}</dd></div>
            <div className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">Average project value</dt><dd className="text-lg font-semibold"><MoneyLines money={snap.projects.averageProjectValue.value} empty="—" /></dd><dd className="text-[0.7rem] text-muted-foreground">{snap.projects.averageProjectValue.unavailable ?? "Budgets of projects created in the period, per currency"}</dd></div>
          </dl>
        </Panel>
      </div>
    </div>
  );
};

export default Analytics;
