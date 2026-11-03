import React from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ActivityList, useActivity } from "./RecentActivity";
import { useCommand } from "./context";
import { Empty, ErrorBox, Field, inputCls, Panel } from "./ui";

// The full activity and audit history with server-side filters (type, entity, date range; the brand filter of the
// header). Read-only: the history can only be written by the database itself.

const TYPES = [
  ["", "All activity"], ["contact", "Contacts"], ["contact_brand", "Client relationships"], ["lead", "Leads"], ["interaction", "Interactions"],
  ["project", "Projects"], ["milestone", "Milestones"], ["task", "Tasks and deliverables"], ["invoice", "Invoices"], ["payment", "Payments"],
  ["expense", "Expenses"], ["report", "Reports"], ["membership", "Brand administration"],
] as const;

const Activity = () => {
  const { canAdmin } = useCommand();
  const [params, setParams] = useSearchParams();
  const f = { action: params.get("type") ?? "", from: params.get("afrom") ?? "", to: params.get("ato") ?? "" };
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  const { events, error, more, loadMore, reload } = useActivity({ action: f.action || undefined, from: f.from || undefined, to: f.to || undefined });
  return (
    <Panel title="Activity and audit history" description="Every change to contacts, leads, projects, tasks and finance, written by the database. It cannot be edited or deleted.">
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="Type"><select className={inputCls} value={f.action} onChange={(e) => set("type", e.target.value)}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="From"><input type="date" className={inputCls} value={f.from} onChange={(e) => set("afrom", e.target.value)} /></Field>
        <Field label="To"><input type="date" className={inputCls} value={f.to} onChange={(e) => set("ato", e.target.value)} /></Field>
      </div>
      {!canAdmin && <p className="mb-3 text-xs text-muted-foreground">The history is visible to brand admins; with another role this list stays empty.</p>}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {!events ? <p className="text-sm text-muted-foreground" role="status">Loading…</p> : events.length === 0 ? <Empty title="No activity for these filters" /> : (
        <>
          <ActivityList events={events} />
          {more && <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadMore()}>Load older activity</Button>}
        </>
      )}
    </Panel>
  );
};

export default Activity;
