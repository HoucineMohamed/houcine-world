import React from "react";
import { clientOsApi, fmtMoney } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { ErrorBox, Kpi, LoadingGrid, Panel } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { fmtWhen } from "../shared";

// Client intelligence, computed in the database (cos_analytics) for the brands in view. Every figure has its formula
// here and in docs/client-os.md section 15. Money stays per currency; a figure without data says so instead of 0.

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((1000 * n) / d) / 10}%` : null);

const Analytics = () => {
  const { brandIds } = useClientOs();
  const s = useAsync(() => clientOsApi.analytics(brandIds?.length === 1 ? brandIds[0]! : null), [JSON.stringify(brandIds)]);
  if (s.error) return <ErrorBox message={s.error} onRetry={s.reload} />;
  if (!s.value) return <LoadingGrid />;
  const a = s.value;
  const repeat = pct(a.clients.repeat, a.clients.with_project);
  const retention = pct(a.clients.retained, a.clients.eligible_for_retention);
  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Computed {fmtWhen(a.computed_at)} across {a.scope_brands} brand{a.scope_brands === 1 ? "" : "s"}.</p>
      <Panel title="Clients">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Clients" value={a.clients.total} hint="Brand relationships with status client" />
          <Kpi label="Active clients" value={a.clients.active} hint="With at least one active project" />
          <Kpi label="Repeat-client rate" value={repeat ?? "—"} unavailable={repeat ? undefined : "No client with a project yet."} hint="Clients with 2+ projects ÷ clients with a project" />
          <Kpi label="Retention (12 months)" value={retention ?? "—"} unavailable={retention ? undefined : "No client older than 12 months."} hint="Clients from before 12 months who had a project in the last 12 months" />
          <Kpi label="Proposal conversion" value={a.proposals.conversion_pct !== null ? `${a.proposals.conversion_pct}%` : "—"} unavailable={a.proposals.conversion_pct === null ? "No decided proposal yet." : undefined} hint="Accepted ÷ (accepted + rejected)" />
          <Kpi label="Open proposals" value={a.proposals.open} hint="Sent, viewed or in negotiation" />
        </div>
        {a.clients.new_by_month.length > 0 && (
          <div className="mt-4"><p className="mb-1 text-xs text-muted-foreground">New clients per month (date they became a client)</p>
            <ul className="flex flex-wrap gap-2 text-xs">{a.clients.new_by_month.map((m) => <li key={m.month} className="rounded border border-border px-2 py-1 tabular-nums">{m.month}: {m.count}</li>)}</ul></div>
        )}
        {a.clients.by_brand.length > 1 && <ul className="mt-3 flex flex-wrap gap-2 text-xs">{a.clients.by_brand.map((b) => <li key={b.brand_id} className="rounded border border-border px-2 py-1">{b.brand}: {b.count}</li>)}</ul>}
      </Panel>
      <Panel title="Delivery">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Active projects" value={a.projects.active} />
          <Kpi label="Completed projects" value={a.projects.completed} />
          <Kpi label="Delayed projects" value={a.projects.delayed} invert hint="Not completed, deadline passed" />
          <Kpi label="Awaiting client approval" value={a.projects.awaiting_approval} hint="Projects with a submitted deliverable" />
          <Kpi label="Average delivery time" value={a.projects.avg_delivery_days !== null ? `${a.projects.avg_delivery_days} days` : "—"} unavailable={a.projects.avg_delivery_days === null ? "No completed project measured." : undefined} hint={`Start (or creation) to completion · ${a.projects.completed_measured} projects`} />
          <Kpi label="Average approval time" value={a.projects.avg_approval_hours !== null ? `${a.projects.avg_approval_hours} h` : "—"} unavailable={a.projects.avg_approval_hours === null ? "No client decision yet." : undefined} hint={`Version submitted to client decision · ${a.projects.approvals_measured} decisions`} />
        </div>
      </Panel>
      <Panel title="Revenue, per currency" description="Expected: open proposals. Contracted: accepted proposals. Invoiced: sent invoices. Received: payments. Outstanding: invoiced minus payments on those invoices (overdue: past due date).">
        {Object.entries(a.money).map(([cur, m]) => (
          <div key={cur} className="mb-3">
            <p className="mb-1 text-xs font-semibold">{cur}</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              {(["expected", "contracted", "invoiced", "received", "outstanding", "overdue"] as const).map((k) => <Kpi key={k} label={k[0]!.toUpperCase() + k.slice(1)} value={fmtMoney(m[k], cur)} />)}
            </div>
          </div>
        ))}
        <div className="grid gap-5 md:grid-cols-3">
          <div><p className="mb-1 text-xs text-muted-foreground">Received by client (top 20)</p><ul className="space-y-0.5 text-xs">{a.revenue_by_client.length === 0 ? <li className="text-muted-foreground">No payment linked to a client.</li> : a.revenue_by_client.map((r) => <li key={r.contact_id + r.currency}>{r.client}: {fmtMoney(r.received, r.currency)}</li>)}</ul></div>
          <div><p className="mb-1 text-xs text-muted-foreground">Received by brand</p><ul className="space-y-0.5 text-xs">{a.revenue_by_brand.length === 0 ? <li className="text-muted-foreground">No payment yet.</li> : a.revenue_by_brand.map((r) => <li key={r.brand_id + r.currency}>{r.brand}: {fmtMoney(r.received, r.currency)}</li>)}</ul></div>
          <div><p className="mb-1 text-xs text-muted-foreground">Contracted by service category (accepted proposals, before tax)</p><ul className="space-y-0.5 text-xs">{a.contracted_by_category.length === 0 ? <li className="text-muted-foreground">No accepted proposal yet.</li> : a.contracted_by_category.map((r) => <li key={r.category + r.currency}>{r.category}: {fmtMoney(r.amount, r.currency)}</li>)}</ul></div>
        </div>
      </Panel>
    </div>
  );
};

export default Analytics;
