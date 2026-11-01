import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientOsApi, contractPdf, downloadBytes, type Contract } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { Section, StatusPill, fmtDay, fmtWhen, useAction } from "../shared";

// Contracts: drafted from a template or by hand, sent as a frozen and fingerprinted version, approved or declined by
// the client in the portal. An approval is a recorded decision, NOT an electronic signature (no provider is set up).

const Editor = ({ initial, onDone }: { initial: Partial<Contract>; onDone: (id?: string) => void }) => {
  const { scopeBrands } = useClientOs();
  const [c, setC] = useState<Partial<Contract>>({ brand_id: scopeBrands[0]?.id, ...initial });
  const rels = useAsync(() => (c.brand_id ? clientOsApi.relationships([c.brand_id], ["client", "prospect", "partner"]) : Promise.resolve([])), [c.brand_id]);
  const templates = useAsync(() => clientOsApi.templates(), []);
  const proposals = useAsync(() => (c.brand_id ? clientOsApi.proposals([c.brand_id]) : Promise.resolve([])), [c.brand_id]);
  const projects = useAsync(() => (c.brand_id ? clientOsApi.projects([c.brand_id]) : Promise.resolve([])), [c.brand_id]);
  const a = useAction();
  return (
    <Panel title={initial.id ? `Edit: ${initial.title}` : "New contract"}>
      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Brand"><select aria-label="Contract brand" className={inputCls} disabled={!!initial.id} value={c.brand_id ?? ""} onChange={(e) => setC({ ...c, brand_id: e.target.value, contact_id: undefined })}>{scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Client or partner"><select aria-label="Contract party" className={inputCls} disabled={!!initial.id} value={c.contact_id ?? ""} onChange={(e) => setC({ ...c, contact_id: e.target.value })}><option value="">Choose…</option>{(rels.value ?? []).map((r) => <option key={r.id} value={r.contact_id}>{r.contact?.name} ({r.status})</option>)}</select></Field>
          {!initial.id && <Field label="Linked proposal (optional)"><select aria-label="Linked proposal" className={inputCls} value={c.proposal_id ?? ""} onChange={(e) => setC({ ...c, proposal_id: e.target.value || null })}><option value="">None</option>{(proposals.value ?? []).filter((p) => p.contact_id === c.contact_id).map((p) => <option key={p.id} value={p.id}>{p.reference} · {p.title}</option>)}</select></Field>}
          {!initial.id && <Field label="Linked project (optional)"><select aria-label="Linked project" className={inputCls} value={c.project_id ?? ""} onChange={(e) => setC({ ...c, project_id: e.target.value || null })}><option value="">None</option>{(projects.value ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>}
        </div>
        {!initial.id && (templates.value ?? []).length > 0 && (
          <Field label="Start from a template"><select aria-label="Template" className={inputCls} value="" onChange={(e) => { const t = templates.value?.find((x) => x.id === e.target.value); if (t) setC({ ...c, template_id: t.id, title: c.title || t.name, body: t.body }); }}><option value="">Choose…</option>{templates.value!.filter((t) => !t.brand_id || t.brand_id === c.brand_id).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        )}
        <Field label="Title"><input className={inputCls} value={c.title ?? ""} onChange={(e) => setC({ ...c, title: e.target.value })} /></Field>
        <Field label="Text"><textarea className={`${inputCls} h-64 py-1.5 font-mono text-xs`} value={c.body ?? ""} onChange={(e) => setC({ ...c, body: e.target.value })} /></Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={a.busy || !c.brand_id || !c.contact_id || !c.title?.trim() || !c.body?.trim()} onClick={async () => { let id: string | undefined; const ok = await a.run(async () => { id = await clientOsApi.saveContract(c as Contract); }, "Saved."); if (ok) onDone(id); }}>Save draft</Button>
          <Button size="sm" variant="ghost" onClick={() => onDone()}>Cancel</Button>{a.view}
        </div>
      </div>
    </Panel>
  );
};

const Detail = ({ c, onChanged, onEdit }: { c: Contract; onChanged: () => void; onEdit: () => void }) => {
  const { brandName } = useClientOs();
  const events = useAsync(() => clientOsApi.contractEvents(c.id), [c.id, c.status, c.version]);
  const rels = useAsync(() => clientOsApi.relationships([c.brand_id], ["client", "prospect", "partner"]), [c.id]);
  const a = useAction();
  const party = rels.value?.find((r) => r.contact_id === c.contact_id)?.contact?.name ?? "Client";
  const pdf = async () => { const v = await clientOsApi.contractVersion(c.id, c.version); if (v) downloadBytes(`contract-v${v.version}.pdf`, contractPdf(v, brandName(c.brand_id), party)); };
  return (
    <Panel title={c.title} description={`${brandName(c.brand_id)} · ${party}${c.version ? ` · version ${c.version}` : ""}`} actions={<StatusPill status={c.status} />}>
      <div className="space-y-4">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs">{c.body}</pre>
        <div className="flex flex-wrap gap-2">
          {c.status === "draft" && <><Button size="sm" variant="outline" onClick={onEdit}>Edit</Button><Button size="sm" onClick={() => void a.run(() => clientOsApi.contractAction(c.id, "send"), "Sent for review in the portal (no email is sent).").then(onChanged)}>Send for approval</Button></>}
          {["sent", "declined"].includes(c.status) && <Button size="sm" variant="outline" onClick={() => void a.run(() => clientOsApi.contractAction(c.id, "reopen"), "Back to draft; sending again makes a new version.").then(onChanged)}>Reopen</Button>}
          {["draft", "sent", "declined"].includes(c.status) && <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Cancel this contract?")) void a.run(() => clientOsApi.contractAction(c.id, "cancel"), "Cancelled.").then(onChanged); }}>Cancel</Button>}
          {c.version > 0 && <Button size="sm" variant="outline" className="gap-1" onClick={() => void pdf()}><FileDown className="h-3.5 w-3.5" aria-hidden="true" /> PDF of version {c.version}</Button>}
        </div>
        {a.view}
        <p className="text-xs text-muted-foreground">An approval in the portal is a recorded decision with the person and time, not an electronic signature: no signature provider is configured.</p>
        <Section title="History"><ol className="space-y-1 text-xs">{(events.value ?? []).map((e) => <li key={e.id}><span className="text-muted-foreground">{fmtWhen(e.created_at)}</span> · {e.actor_kind} · {e.kind}{e.version ? ` (v${e.version})` : ""}{e.body ? `: ${e.body}` : ""}</li>)}</ol></Section>
      </div>
    </Panel>
  );
};

const Contracts = () => {
  const { brandIds, brandName } = useClientOs();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Partial<Contract> | null>(null);
  const contracts = useAsync(() => clientOsApi.contracts(brandIds), [JSON.stringify(brandIds)]);
  if (contracts.error) return <ErrorBox message={contracts.error} onRetry={contracts.reload} />;
  if (!contracts.value) return <LoadingGrid tiles={4} />;
  const selected = contracts.value.find((c) => c.id === params.get("id"));
  const select = (id: string) => { const q = new URLSearchParams(params); q.set("id", id); setParams(q, { replace: true }); };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Panel title="Contracts" actions={<Button size="sm" className="gap-1" onClick={() => setEditing({})}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New contract</Button>}>
        {contracts.value.length === 0 ? <Empty title="No contract yet">Templates are managed in Settings.</Empty> : (
          <ul className="divide-y divide-border/60">{contracts.value.map((c) => (
            <li key={c.id}><button type="button" onClick={() => { setEditing(null); select(c.id); }} className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${selected?.id === c.id ? "bg-muted/60" : ""}`}>
              <span className="min-w-0"><span className="font-medium">{c.title}</span><span className="block text-xs text-muted-foreground">{brandName(c.brand_id)} · {c.sent_at ? `sent ${fmtDay(c.sent_at)}` : "not sent"}</span></span><StatusPill status={c.status} /></button></li>))}</ul>
        )}
      </Panel>
      {editing ? <Editor key={editing.id ?? "new"} initial={editing} onDone={(id) => { setEditing(null); contracts.reload(); if (id) select(id); }} />
        : selected ? <Detail key={selected.id} c={selected} onChanged={contracts.reload} onEdit={() => setEditing(selected)} />
        : <Panel title="Contract"><Empty title="Choose or create a contract" /></Panel>}
    </div>
  );
};

export default Contracts;
