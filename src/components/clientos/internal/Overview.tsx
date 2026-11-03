import React from "react";
import { Link } from "react-router-dom";
import { clientOsApi } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Kpi, LoadingGrid, Panel } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { PerCurrency, StatusPill, fmtWhen } from "../shared";

// Overview: counts from the records (database-side analytics) and the items waiting for someone.
const Overview = () => {
  const { brandIds, link, brandName } = useClientOs();
  const key = [JSON.stringify(brandIds)];
  const stats = useAsync(() => clientOsApi.analytics(brandIds?.length === 1 ? brandIds[0]! : null), key);
  const requests = useAsync(() => clientOsApi.requests(brandIds), key);
  const deliverables = useAsync(() => clientOsApi.deliverables(brandIds), key);
  const proposals = useAsync(() => clientOsApi.proposals(brandIds), key);
  const error = stats.error ?? requests.error ?? deliverables.error ?? proposals.error;
  if (error) return <ErrorBox message={error} />;
  if (!stats.value || !requests.value || !deliverables.value || !proposals.value) return <LoadingGrid />;
  const s = stats.value;
  const open = requests.value.filter((r) => r.status === "open" || r.status === "in_progress");
  const review = deliverables.value.filter((d) => d.status === "internal_review");
  const waiting = deliverables.value.filter((d) => d.status === "submitted");
  return (
    <div className="space-y-5">
      <Panel title="Relationships and delivery" description="Counted in the database from the records of the brands in view">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Clients" value={s.clients.total} to={link("clients")} />
          <Kpi label="Active clients" value={s.clients.active} hint="With an active project" to={link("clients")} />
          <Kpi label="Active projects" value={s.projects.active} to={link("projects")} />
          <Kpi label="Delayed projects" value={s.projects.delayed} invert to={link("projects")} />
          <Kpi label="Awaiting client approval" value={s.projects.awaiting_approval} hint="Projects with a submitted deliverable" to={link("deliverables")} />
          <Kpi label="Open proposals" value={s.proposals.open} to={link("proposals")} />
        </div>
      </Panel>
      <Panel title="Money" description="Per currency, never added together. Formulas: Analytics">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {(["expected", "contracted", "invoiced", "received", "outstanding"] as const).map((k) => (
            <Kpi key={k} label={k[0]!.toUpperCase() + k.slice(1)} value={<PerCurrency values={Object.fromEntries(Object.entries(s.money).map(([c, v]) => [c, v[k]]))} />} to={link("analytics")} />
          ))}
        </div>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Open client requests" actions={<Link className="text-xs text-muted-foreground hover:underline" to={link("requests")}>All requests</Link>}>
          {open.length === 0 ? <Empty title="No open request" /> : <ul className="divide-y divide-border/60">{open.slice(0, 8).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2"><Link className="min-w-0 hover:underline" to={link("requests", { id: r.id })}><span className="font-medium">{r.title}</span><span className="block text-xs text-muted-foreground">{brandName(r.brand_id)} · {fmtWhen(r.created_at)}</span></Link><StatusPill status={r.status} /></li>))}</ul>}
        </Panel>
        <Panel title="Partner work to review" actions={<Link className="text-xs text-muted-foreground hover:underline" to={link("deliverables")}>Deliverables</Link>}>
          {review.length === 0 ? <Empty title="Nothing to review" /> : <ul className="divide-y divide-border/60">{review.slice(0, 8).map((d) => (
            <li key={d.id} className="py-2"><Link className="hover:underline" to={link("deliverables", { id: d.id })}><span className="font-medium">{d.title}</span> <span className="text-xs text-muted-foreground">v{d.current_version}</span></Link></li>))}</ul>}
        </Panel>
        <Panel title="Waiting for the client">
          {waiting.length === 0 ? <Empty title="Nothing waiting" /> : <ul className="divide-y divide-border/60">{waiting.slice(0, 8).map((d) => (
            <li key={d.id} className="flex justify-between gap-2 py-2"><Link className="hover:underline" to={link("deliverables", { id: d.id })}>{d.title} <span className="text-xs text-muted-foreground">v{d.current_version}</span></Link><span className="text-xs text-muted-foreground">since {fmtWhen(d.submitted_at)}</span></li>))}</ul>}
        </Panel>
      </div>
    </div>
  );
};

export default Overview;
