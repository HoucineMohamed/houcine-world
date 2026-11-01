import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clientOsApi, REQUEST_CATEGORIES, type ClientRequest } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { FileLink, Section, StatusPill, fmtWhen, useAction } from "../shared";

// Client requests: revisions, support, changes, new projects, information. The team sets the status and the person
// responsible, and answers; internal notes are never shown to the client.

const Detail = ({ r, onChanged }: { r: ClientRequest; onChanged: () => void }) => {
  const { brandName } = useClientOs();
  const events = useAsync(() => clientOsApi.requestEvents(r.id), [r.id, r.status]);
  const admins = useAsync(() => clientOsApi.brandAdmins([r.brand_id]), [r.brand_id]);
  const a = useAction();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  return (
    <Panel title={r.title} description={`${brandName(r.brand_id)} · ${REQUEST_CATEGORIES[r.category]} · opened ${fmtWhen(r.created_at)}`} actions={<StatusPill status={r.status} />}>
      <div className="space-y-4">
        {r.description && <p className="whitespace-pre-wrap">{r.description}</p>}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Status" className="w-48"><select aria-label="Request status" className={inputCls} value={r.status} onChange={(e) => void a.run(() => clientOsApi.updateRequest(r.id, { status: e.target.value }), "Status changed; the client was notified in the portal.").then(onChanged)}>
            {["open", "in_progress", "waiting_client", "resolved", "closed"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></Field>
          <Field label="Responsible" className="w-56"><select aria-label="Responsible" className={inputCls} value={r.assigned_to ?? ""} onChange={(e) => void a.run(() => clientOsApi.updateRequest(r.id, { assigned_to: e.target.value || null }), "Responsible person set.").then(onChanged)}>
            <option value="">Nobody yet</option>{(admins.value ?? []).map((m) => <option key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || "Team member"}</option>)}</select></Field>
        </div>
        {a.view}
        <Section title="Conversation">
          <ol className="space-y-2">{(events.value ?? []).map((e) => (
            <li key={e.id} className={`rounded-md border p-2 text-xs ${e.internal ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}>
              <span className="text-muted-foreground">{fmtWhen(e.created_at)} · {e.kind}</span> {e.internal && <Pill tone="warn">internal</Pill>}
              {e.body && <p className="mt-1 whitespace-pre-wrap text-sm">{e.body}</p>}
              {e.file_id && <FileLink fileId={e.file_id} name="Attachment" />}
            </li>))}</ol>
          <textarea aria-label="Reply" className={`${inputCls} h-16 py-1.5`} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply to the client, or an internal note" />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (never shown to the client)</label>
            <Button size="sm" disabled={!body.trim()} onClick={() => void a.run(() => clientOsApi.commentRequest(r.id, r.brand_id, body, internal), internal ? "Internal note added." : "Reply added.").then((ok) => { if (ok) { setBody(""); events.reload(); } })}>{internal ? "Add note" : "Reply"}</Button>
          </div>
        </Section>
      </div>
    </Panel>
  );
};

const Requests = () => {
  const { brandIds, brandName } = useClientOs();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState("active");
  const list = useAsync(() => clientOsApi.requests(brandIds), [JSON.stringify(brandIds)]);
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />;
  if (!list.value) return <LoadingGrid tiles={4} />;
  const rows = list.value.filter((r) => (status === "active" ? !["resolved", "closed"].includes(r.status) : !status || r.status === status));
  const selected = list.value.find((r) => r.id === params.get("id"));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Panel title="Client requests" description="Opened by clients in the portal, or from a revision request on a deliverable">
        <select aria-label="Request filter" className={`${inputCls} mb-3 w-48`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Open and in progress</option><option value="">All</option><option value="waiting_client">Waiting for the client</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
        {rows.length === 0 ? <Empty title="No request" /> : (
          <ul className="divide-y divide-border/60">{rows.map((r) => (
            <li key={r.id}><button type="button" onClick={() => { const q = new URLSearchParams(params); q.set("id", r.id); setParams(q, { replace: true }); }} className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${selected?.id === r.id ? "bg-muted/60" : ""}`}>
              <span className="min-w-0"><span className="font-medium">{r.title}</span><span className="block text-xs text-muted-foreground">{REQUEST_CATEGORIES[r.category]} · {brandName(r.brand_id)} · {fmtWhen(r.created_at)}</span></span><StatusPill status={r.status} /></button></li>))}</ul>
        )}
      </Panel>
      {selected ? <Detail key={selected.id} r={selected} onChanged={list.reload} /> : <Panel title="Request"><Empty title="Choose a request" /></Panel>}
    </div>
  );
};

export default Requests;
