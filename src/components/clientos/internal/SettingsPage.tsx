import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { clientOsApi, fmtMoney, type Lifecycle } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { useAction } from "../shared";

// Settings: lifecycles (stages per brand and project type), the service catalogue and contract templates.

const REQUIRES: Record<string, string> = { tasks_done: "all tasks done", deliverables_approved: "all deliverables approved", proposal_accepted: "an accepted proposal", contract_approved: "an approved contract" };

const Lifecycles = () => {
  const { scopeBrands, isSuperAdmin, brandName } = useClientOs();
  const lifecycles = useAsync(() => clientOsApi.lifecycles(), []);
  const stages = useAsync(() => clientOsApi.stages(), []);
  const a = useAction();
  const [open, setOpen] = useState<string | null>(null);
  const [nl, setNl] = useState({ brand: scopeBrands[0]?.id ?? "", name: "", type: "", def: false });
  const [ns, setNs] = useState({ key: "", label: "", client: "", next: "", requires: [] as string[], final: false });
  if (!lifecycles.value || !stages.value) return <LoadingGrid tiles={2} />;
  const reload = () => { lifecycles.reload(); stages.reload(); };
  const canEdit = (l: Lifecycle) => (l.brand_id ? scopeBrands.some((b) => b.id === l.brand_id) : isSuperAdmin);
  return (
    <Panel title="Project lifecycles" description="Stages, what the client sees for each, which moves are allowed and what must be true first">
      <ul className="space-y-3">{lifecycles.value.map((l) => {
        const st = stages.value!.filter((s) => s.lifecycle_id === l.id);
        return (
          <li key={l.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span><span className="font-medium">{l.name}</span> <span className="text-xs text-muted-foreground">{l.brand_id ? brandName(l.brand_id) : "Global"}{l.project_type ? ` · ${l.project_type}` : ""}</span> {l.is_default && <Pill tone="info">default</Pill>}</span>
              <Button size="sm" variant="ghost" onClick={() => setOpen(open === l.id ? null : l.id)}>{open === l.id ? "Close" : `${st.length} stages`}</Button>
            </div>
            {open === l.id && (
              <div className="mt-2 space-y-2">
                <ol className="space-y-1 text-xs">{st.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{s.position}. <span className="font-medium">{s.label}</span> → client sees "{s.client_label ?? s.label}"{s.allowed_next.length ? ` · next: ${s.allowed_next.join(", ")}` : ""}{s.requires.length ? ` · needs ${s.requires.map((r) => REQUIRES[r]).join(", ")}` : ""}{s.is_final ? " · final" : ""}</span>
                    {canEdit(l) && <Button size="sm" variant="ghost" className="h-7" onClick={() => void a.run(() => clientOsApi.deleteStage(s.id), "Stage removed.").then(reload)}>Remove</Button>}
                  </li>))}</ol>
                {canEdit(l) && (
                  <div className="grid gap-2 md:grid-cols-3">
                    <Field label="Key (a-z, _)"><input className={inputCls} value={ns.key} onChange={(e) => setNs({ ...ns, key: e.target.value })} /></Field>
                    <Field label="Label"><input className={inputCls} value={ns.label} onChange={(e) => setNs({ ...ns, label: e.target.value })} /></Field>
                    <Field label="Client sees"><input className={inputCls} value={ns.client} onChange={(e) => setNs({ ...ns, client: e.target.value })} /></Field>
                    <Field label="Allowed next keys (comma separated, empty = any)" className="md:col-span-2"><input className={inputCls} value={ns.next} onChange={(e) => setNs({ ...ns, next: e.target.value })} /></Field>
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={ns.final} onChange={(e) => setNs({ ...ns, final: e.target.checked })} /> Final stage</label>
                    <fieldset className="md:col-span-3"><legend className="text-xs text-muted-foreground">Required before entering</legend><div className="flex flex-wrap gap-3">{Object.entries(REQUIRES).map(([k, v]) => <label key={k} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={ns.requires.includes(k)} onChange={() => setNs({ ...ns, requires: ns.requires.includes(k) ? ns.requires.filter((x) => x !== k) : [...ns.requires, k] })} /> {v}</label>)}</div></fieldset>
                    <div><Button size="sm" disabled={!ns.key || !ns.label} onClick={() => void a.run(() => clientOsApi.saveStage({ lifecycle_id: l.id, key: ns.key, label: ns.label, client_label: ns.client || null, position: st.length + 1, allowed_next: ns.next.split(",").map((x) => x.trim()).filter(Boolean), requires: ns.requires, is_final: ns.final }), "Stage added.").then((ok) => { if (ok) { setNs({ key: "", label: "", client: "", next: "", requires: [], final: false }); reload(); } })}>Add stage</Button></div>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}</ul>
      <div className="mt-4 grid gap-2 border-t border-border pt-3 md:grid-cols-4">
        <Field label="Brand"><select aria-label="Lifecycle brand" className={inputCls} value={nl.brand} onChange={(e) => setNl({ ...nl, brand: e.target.value })}>{isSuperAdmin && <option value="">Global</option>}{scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Name"><input className={inputCls} value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} /></Field>
        <Field label="Project type (optional)"><input className={inputCls} value={nl.type} onChange={(e) => setNl({ ...nl, type: e.target.value })} placeholder="e.g. software" /></Field>
        <div className="flex items-end gap-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={nl.def} onChange={(e) => setNl({ ...nl, def: e.target.checked })} /> default</label>
          <Button size="sm" disabled={!nl.name.trim()} onClick={() => void a.run(() => clientOsApi.saveLifecycle({ brand_id: nl.brand || null, name: nl.name, project_type: nl.type || null, is_default: nl.def }), "Lifecycle created; add its stages.").then((ok) => { if (ok) { setNl({ ...nl, name: "", type: "", def: false }); reload(); } })}>Create lifecycle</Button></div>
      </div>
      {a.view}
    </Panel>
  );
};

const Catalogue = () => {
  const { brandIds, scopeBrands, brandName } = useClientOs();
  const items = useAsync(() => clientOsApi.catalog(brandIds), [JSON.stringify(brandIds)]);
  const a = useAction();
  const [f, setF] = useState({ brand: scopeBrands[0]?.id ?? "", name: "", category: "", unit: "", price: "", currency: "EUR" });
  return (
    <Panel title="Service catalogue" description="Per brand and currency; proposals can start from these lines">
      {!items.value ? <LoadingGrid tiles={1} /> : items.value.length === 0 ? <Empty title="No service yet" /> : (
        <ul className="divide-y divide-border/60 text-xs">{items.value.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5"><span><span className="text-sm">{c.name}</span> · {brandName(c.brand_id)}{c.category ? ` · ${c.category}` : ""} · {fmtMoney(c.unit_price, c.currency)}{c.unit ? ` / ${c.unit}` : ""}</span>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => void a.run(() => clientOsApi.saveCatalog({ id: c.id, brand_id: c.brand_id, active: !c.active }), c.active ? "Hidden from new proposals." : "Available again.").then(items.reload)}>{c.active ? "Retire" : "Restore"}</Button></li>))}</ul>
      )}
      <div className="mt-3 grid gap-2 md:grid-cols-6">
        <Field label="Brand"><select aria-label="Service brand" className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>{scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Service" className="md:col-span-2"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Category"><input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
        <Field label="Unit price"><input className={inputCls} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
        <Field label="Currency"><select aria-label="Service currency" className={inputCls} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}><option>EUR</option><option>USD</option></select></Field>
      </div>
      <div className="mt-2 flex items-center gap-2"><Button size="sm" disabled={!f.brand || !f.name.trim() || !/^\d{1,12}(\.\d{1,2})?$/.test(f.price)} onClick={() => void a.run(() => clientOsApi.saveCatalog({ brand_id: f.brand, name: f.name, category: f.category || null, unit: f.unit || null, unit_price: f.price, currency: f.currency }), "Service added.").then((ok) => { if (ok) { setF({ ...f, name: "", category: "", price: "" }); items.reload(); } })}>Add service</Button>{a.view}</div>
    </Panel>
  );
};

const Templates = () => {
  const { scopeBrands, isSuperAdmin, brandName } = useClientOs();
  const templates = useAsync(() => clientOsApi.templates(), []);
  const a = useAction();
  const [f, setF] = useState({ brand: scopeBrands[0]?.id ?? "", name: "", body: "" });
  return (
    <Panel title="Contract templates" description="Starting texts for contracts; a sent contract keeps its own frozen text">
      {!templates.value ? <LoadingGrid tiles={1} /> : templates.value.length === 0 ? <Empty title="No template yet" /> : <ul className="space-y-1 text-xs">{templates.value.map((t) => <li key={t.id}><span className="text-sm">{t.name}</span> · {t.brand_id ? brandName(t.brand_id) : "Global"} · {t.body.length} characters</li>)}</ul>}
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <Field label="Brand"><select aria-label="Template brand" className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })}>{isSuperAdmin && <option value="">Global</option>}{scopeBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Text" className="md:col-span-2"><textarea className={`${inputCls} h-32 py-1.5 font-mono text-xs`} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      </div>
      <div className="mt-2 flex items-center gap-2"><Button size="sm" disabled={!f.name.trim() || !f.body.trim()} onClick={() => void a.run(() => clientOsApi.saveTemplate({ brand_id: f.brand || null, name: f.name, body: f.body }), "Template saved.").then((ok) => { if (ok) { setF({ ...f, name: "", body: "" }); templates.reload(); } })}>Save template</Button>{a.view}</div>
    </Panel>
  );
};

const SettingsPage = () => (
  <div className="space-y-5">
    <Lifecycles />
    <div className="grid gap-5 xl:grid-cols-2"><Catalogue /><Templates /></div>
    <Panel title="Delivery channels">
      <p className="text-xs text-muted-foreground">Notifications to clients and partners are in-app (their portal) only. No email provider is configured, so nothing is emailed and invitation links are shared by hand. Electronic signatures are not available: contract approvals are recorded decisions.</p>
    </Panel>
  </div>
);

export default SettingsPage;
