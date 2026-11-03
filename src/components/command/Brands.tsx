import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { fetchBrandMembers } from "@/services/memberships";
import { brandRoleLabel } from "@/lib/roles";
import { useCommand } from "./context";
import { useAsync } from "./useAsync";
import { Empty, fmtDate, HEALTH, Kpi, LoadingGrid, MoneyLines, Panel, Pill, StatusPill } from "./ui";
import { daysBetween, forBrands, snapshot } from "../../../supabase/functions/_shared/command/metrics.ts";

// Brand performance profiles: identity (name, category, status, administrators), the brand's own figures for the
// period, upcoming deadlines, open work and alerts. Super admins see every brand; others their own brands.

const BrandProfile = ({ brandId }: { brandId: string }) => {
  const { brands, data, period, today, link, mode } = useCommand();
  const brand = brands.find((b) => b.id === brandId);
  const members = useAsync(() => fetchBrandMembers(brandId), [brandId]);
  if (!brand || !data) return null;
  const d = forBrands(data.dataset, [brandId]);
  const s = snapshot(d, period, today);
  const upcoming = d.projects.filter((p) => !p.deleted_at && p.deadline && p.deadline >= today && p.status !== "completed" && p.status !== "cancelled").sort((a, b) => a.deadline!.localeCompare(b.deadline!)).slice(0, 6);
  const brandLink = (section: string, extra: Record<string, string> = {}) => (mode === "global" ? link(section, { ...extra, brands: brandId }) : link(section, extra));
  return (
    <div className="space-y-4">
      <Panel title={brand.name} description={`${brand.service ?? "No category"} · /${brand.slug}`} actions={<StatusPill status={brand.status === "active" ? "active" : brand.status} />}>
        <div className="grid gap-5 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authorized administrators</h3>
            {members.error ? <p className="text-sm text-muted-foreground">Visible to the brand's admins.</p> : !members.value ? <p className="text-sm text-muted-foreground">Loading…</p> : members.value.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
              <ul className="space-y-1 text-sm">{members.value.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="truncate">{m.profile?.full_name || m.profile?.email || "A team member"}</span><span className="text-xs text-muted-foreground">{brandRoleLabel(m.role)}</span></li>)}</ul>
            )}
          </div>
          <div className="lg:col-span-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{period.label}</h3>
            {!s.hasAnyRecords ? <Empty title="No records for this brand yet">This brand has no contact, lead, project or financial record in the Command Center.</Empty> : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Kpi label="Revenue received" value={<MoneyLines money={s.finance.visible ? s.finance.received : null} empty="—" className="text-lg" />} unavailable={s.finance.visible ? undefined : s.finance.why} to={brandLink("finance", { tab: "payments" })} />
                <Kpi label="Active clients" value={s.clients.activeClients} to={brandLink("crm", { status: "client" })} />
                <Kpi label="New leads" value={s.leads.newLeads} to={brandLink("crm", { tab: "pipeline" })} />
                <Kpi label="Active projects" value={s.projects.activeProjects} to={brandLink("projects", { status: "active" })} />
                <Kpi label="Deliverables completed" value={s.projects.deliverablesCompletedInPeriod} to={brandLink("projects")} />
                <Kpi label="Open tasks" value={s.projects.tasksAwaiting} to={brandLink("projects", { filter: "open_tasks" })} />
              </div>
            )}
          </div>
        </div>
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Upcoming deadlines">
          {upcoming.length === 0 ? <Empty title="No upcoming deadline" /> : (
            <ul className="divide-y divide-border/60 text-sm">{upcoming.map((p) => <li key={p.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" to={brandLink("projects", { id: p.id })}>{p.name}</Link><span className="text-muted-foreground">{fmtDate(p.deadline)} · in {daysBetween(today, p.deadline!)} days</span></li>)}</ul>
          )}
        </Panel>
        <Panel title="Alerts" description="Projects at risk or off track, and overdue invoices">
          {s.projects.needsAttention.length === 0 && !(s.finance.visible && s.finance.overdueInvoices) ? <Empty title="No alert" /> : (
            <ul className="space-y-2 text-sm">
              {s.projects.needsAttention.map((h) => <li key={h.project.id} className="flex items-start justify-between gap-2"><Link className="hover:underline" to={brandLink("projects", { id: h.project.id })}>{h.project.name}<span className="block text-xs text-muted-foreground">{h.reasons.join(" · ")}</span></Link><Pill tone={HEALTH[h.health]!.tone}>{HEALTH[h.health]!.label}</Pill></li>)}
              {s.finance.visible && s.finance.overdueInvoices > 0 && <li><Link className="hover:underline" to={brandLink("finance", { tab: "invoices", filter: "outstanding" })}>{s.finance.overdueInvoices} overdue invoice{s.finance.overdueInvoices > 1 ? "s" : ""}</Link></li>}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
};

const Brands = () => {
  const { scopeBrands, loading, data, mode } = useCommand();
  const [params, setParams] = useSearchParams();
  if (loading && !data) return <LoadingGrid />;
  if (mode === "brand") return scopeBrands[0] ? <BrandProfile brandId={scopeBrands[0].id} /> : null;
  const open = params.get("id");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Brands">
        {scopeBrands.map((b) => (
          <button key={b.id} type="button" role="tab" aria-selected={open === b.id} onClick={() => { const n = new URLSearchParams(params); n.set("id", b.id); setParams(n, { replace: true }); }}
            className={`rounded-md border px-3 py-1.5 text-sm ${open === b.id ? "border-foreground/40 bg-muted text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>{b.name}</button>
        ))}
      </div>
      {open ? <BrandProfile brandId={open} /> : <Empty title="Choose a brand">Each brand has its own profile. To compare brands side by side, open Analytics.</Empty>}
    </div>
  );
};

export default Brands;
