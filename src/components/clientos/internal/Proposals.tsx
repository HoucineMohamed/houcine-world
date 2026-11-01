import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Trash2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientOsApi, downloadBytes, fmtMoney, proposalPdf, type Proposal, type ProposalItem } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { Section, StatusPill, fmtDay, fmtWhen, useAction } from "../shared";

// Proposals: built here, totals computed by the database (exact decimals, one currency), sent as a frozen, numbered
// version. The client accepts or rejects that exact version in the portal. After acceptance an admin creates the
// project, once.

const blankItem = (): ProposalItem => ({ position: 0, catalog_id: null, category: null, description: "", quantity: "1", unit_price: "0", discount_pct: "0", tax_pct: "0" });
const DEC = /^\d{1,12}(\.\d{1,2})?$/;

const Editor = ({ initial, onDone }: { initial: Partial<Proposal>; onDone: (id?: string) => void }) => {
  const { scopeBrands, brands } = useClientOs();
  const [p, setP] = useState<Partial<Proposal>>({ currency: "EUR", brand_id: scopeBrands[0]?.id, ...initial });
  const [items, setItems] = useState<ProposalItem[]>([blankItem()]);
  const rels = useAsync(() => (p.brand_id ? clientOsApi.relationships([p.brand_id], ["client", "prospect"]) : Promise.resolve([])), [p.brand_id]);
  const catalog = useAsync(() => (p.brand_id ? clientOsApi.catalog([p.brand_id]) : Promise.resolve([])), [p.brand_id]);
  const a = useAction();
  useEffect(() => { if (initial.id) clientOsApi.proposalItems(initial.id).then((x) => setItems(x.length ? x.map((i) => ({ ...i, quantity: String(i.quantity), unit_price: String(i.unit_price), discount_pct: String(i.discount_pct), tax_pct: String(i.tax_pct) })) : [blankItem()])).catch(() => {}); }, [initial.id]);
  const set = (i: number, patch: Partial<ProposalItem>) => setItems((x) => x.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const invalid = items.some((it) => !it.description.trim() || !DEC.test(it.quantity) || Number(it.quantity) <= 0 || !DEC.test(it.unit_price) || !DEC.test(it.discount_pct || "0") || !DEC.test(it.tax_pct || "0") || Number(it.discount_pct) > 100 || Number(it.tax_pct) > 100);
  const save = async () => {
    let id: string | undefined;
    const ok = await a.run(async () => { id = await clientOsApi.saveProposal({ ...p, brand_id: p.brand_id!, contact_id: p.contact_id! }, items); }, "Saved. The totals below are computed by the database.");
    if (ok) onDone(id);
  };
  return (
    <Panel title={initial.id ? `Edit ${initial.reference}` : "New proposal"} description="Amounts are exact decimals; currencies are never mixed in one proposal">
      <div className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <Field label="Brand"><select aria-label="Proposal brand" className={inputCls} disabled={!!initial.id} value={p.brand_id ?? ""} onChange={(e) => setP({ ...p, brand_id: e.target.value, contact_id: undefined })}>{(initial.id ? brands : scopeBrands).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
          <Field label="Client"><select aria-label="Proposal client" className={inputCls} disabled={!!initial.id} value={p.contact_id ?? ""} onChange={(e) => setP({ ...p, contact_id: e.target.value })}><option value="">Choose…</option>{(rels.value ?? []).map((r) => <option key={r.contact_id} value={r.contact_id}>{r.contact?.name}</option>)}</select></Field>
          <Field label="Currency"><select aria-label="Currency" className={inputCls} value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value as "EUR" | "USD" })}><option>EUR</option><option>USD</option></select></Field>
          <Field label="Reference"><input className={inputCls} value={p.reference ?? ""} onChange={(e) => setP({ ...p, reference: e.target.value })} placeholder="e.g. HT-2026-014" /></Field>
          <Field label="Title" className="md:col-span-2"><input className={inputCls} value={p.title ?? ""} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
        </div>
        <Field label="Description"><textarea className={`${inputCls} h-20 py-1.5`} value={p.summary ?? ""} onChange={(e) => setP({ ...p, summary: e.target.value })} /></Field>
        <Section title="Items" actions={
          <span className="flex gap-2">
            {(catalog.value ?? []).filter((c) => c.active && c.currency === p.currency).length > 0 && (
              <select aria-label="Add from the catalogue" className="h-8 rounded-md border border-input bg-background px-2 text-xs" value="" onChange={(e) => { const c = catalog.value?.find((x) => x.id === e.target.value); if (c) setItems((x) => [...x.filter((it) => it.description.trim()), { ...blankItem(), catalog_id: c.id, category: c.category, description: c.name, unit_price: String(c.unit_price) }]); }}>
                <option value="">Add from the catalogue…</option>{catalog.value!.filter((c) => c.active && c.currency === p.currency).map((c) => <option key={c.id} value={c.id}>{c.name} · {fmtMoney(c.unit_price, c.currency)}</option>)}
              </select>
            )}
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setItems((x) => [...x, blankItem()])}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Line</Button>
          </span>}>
          <div className="space-y-2">{items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-border p-2 md:grid-cols-[minmax(0,2fr)_80px_110px_80px_80px_32px]">
              <input aria-label={`Line ${i + 1} description`} className={inputCls} value={it.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="Description" />
              <input aria-label={`Line ${i + 1} quantity`} className={inputCls} inputMode="decimal" value={it.quantity} onChange={(e) => set(i, { quantity: e.target.value })} />
              <input aria-label={`Line ${i + 1} unit price`} className={inputCls} inputMode="decimal" value={it.unit_price} onChange={(e) => set(i, { unit_price: e.target.value })} />
              <input aria-label={`Line ${i + 1} discount %`} className={inputCls} inputMode="decimal" value={it.discount_pct} onChange={(e) => set(i, { discount_pct: e.target.value })} title="Discount %" />
              <input aria-label={`Line ${i + 1} tax %`} className={inputCls} inputMode="decimal" value={it.tax_pct} onChange={(e) => set(i, { tax_pct: e.target.value })} title="Tax %" />
              <Button size="icon" variant="ghost" aria-label={`Remove line ${i + 1}`} onClick={() => setItems((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>))}
            <p className="text-xs text-muted-foreground">Columns: description, quantity, unit price ({p.currency}), discount %, tax %. Up to 2 decimals.</p>
          </div>
        </Section>
        <div className="grid gap-2 md:grid-cols-3">
          <Field label="Payment terms" className="md:col-span-2"><input className={inputCls} value={p.payment_terms ?? ""} onChange={(e) => setP({ ...p, payment_terms: e.target.value })} placeholder="e.g. 50% at signature, 50% on delivery" /></Field>
          <Field label="Valid until"><input type="date" className={inputCls} value={p.valid_until ?? ""} onChange={(e) => setP({ ...p, valid_until: e.target.value })} /></Field>
          <Field label="Delivery estimate" className="md:col-span-3"><input className={inputCls} value={p.delivery_estimate ?? ""} onChange={(e) => setP({ ...p, delivery_estimate: e.target.value })} placeholder="e.g. 6 weeks after kick-off" /></Field>
        </div>
        <Field label="Terms and conditions"><textarea className={`${inputCls} h-24 py-1.5`} value={p.terms ?? ""} onChange={(e) => setP({ ...p, terms: e.target.value })} /></Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void save()} disabled={a.busy || !p.brand_id || !p.contact_id || !p.reference?.trim() || !p.title?.trim() || invalid}>Save draft</Button>
          <Button size="sm" variant="ghost" onClick={() => onDone()}>Cancel</Button>
          {invalid && <span className="text-xs text-destructive">Each line needs a description and valid numbers.</span>}
          {a.view}
        </div>
      </div>
    </Panel>
  );
};

const Detail = ({ p, onChanged, onEdit }: { p: Proposal; onChanged: () => void; onEdit: () => void }) => {
  const { brandName, link } = useClientOs();
  const totals = useAsync(() => clientOsApi.proposalTotals(p.id), [p.id, p.updated_at]);
  const items = useAsync(() => clientOsApi.proposalItems(p.id), [p.id, p.updated_at]);
  const events = useAsync(() => clientOsApi.proposalEvents(p.id), [p.id, p.updated_at]);
  const rels = useAsync(() => clientOsApi.relationships([p.brand_id], ["client", "prospect"]), [p.id]);
  const a = useAction();
  const [comment, setComment] = useState("");
  const client = rels.value?.find((r) => r.contact_id === p.contact_id)?.contact?.name ?? "Client";
  const expired = ["sent", "viewed"].includes(p.status) && p.valid_until && p.valid_until < new Date().toISOString().slice(0, 10);
  const pdf = async () => {
    const v = await clientOsApi.proposalVersion(p.id, p.version);
    if (v) downloadBytes(`${p.reference}-v${p.version}.pdf`, proposalPdf(v.snapshot, brandName(p.brand_id), client, p.version));
  };
  return (
    <Panel title={`${p.reference} · ${p.title}`} description={`${brandName(p.brand_id)} · ${client} · ${p.currency}${p.version ? ` · version ${p.version}` : ""}`} actions={<StatusPill status={expired ? "expired" : p.status} />}>
      <div className="space-y-4">
        <Section title="Items and totals (computed by the database)">
          <ul className="space-y-1 text-xs">{(items.value ?? []).map((it) => <li key={it.id}>{it.description} · {it.quantity} × {fmtMoney(it.unit_price, p.currency)}{Number(it.discount_pct) ? ` −${it.discount_pct}%` : ""}{Number(it.tax_pct) ? ` +${it.tax_pct}% tax` : ""}</li>)}</ul>
          {totals.value && <p className="text-sm">Subtotal {fmtMoney(totals.value.subtotal, p.currency)} · discount −{fmtMoney(totals.value.discount, p.currency)} · tax {fmtMoney(totals.value.tax, p.currency)} · <span className="font-semibold">total {fmtMoney(totals.value.total, p.currency)}</span></p>}
          <p className="text-xs text-muted-foreground">Valid until {fmtDay(p.valid_until)} · payment: {p.payment_terms ?? "—"} · delivery: {p.delivery_estimate ?? "—"}</p>
        </Section>
        <div className="flex flex-wrap gap-2">
          {["draft", "negotiation"].includes(p.status) && <><Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
            <Button size="sm" onClick={() => void a.run(() => clientOsApi.sendProposal(p.id), "Sent: a new frozen version; the client was notified in the portal (no email is sent).").then(onChanged)}>Send to the client</Button></>}
          {["sent", "viewed", "expired", "rejected"].includes(p.status) && <Button size="sm" variant="outline" onClick={() => void a.run(() => clientOsApi.proposalAction(p.id, "reopen"), "Reopened for negotiation: edit, then send a new version.").then(onChanged)}>Reopen for changes</Button>}
          {["draft", "sent", "viewed", "negotiation"].includes(p.status) && <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Withdraw this proposal?")) void a.run(() => clientOsApi.proposalAction(p.id, "withdraw"), "Withdrawn.").then(onChanged); }}>Withdraw</Button>}
          {p.status === "accepted" && !p.project_id && <Button size="sm" onClick={() => void a.run(() => clientOsApi.projectFromProposal(p.id, null, null, true), "Project created and shared with the client's portal users.").then(onChanged)}>Create the project</Button>}
          {p.project_id && <Button size="sm" variant="outline" asChild><Link to={link("projects", { id: p.project_id })}>Open the project</Link></Button>}
          {p.version > 0 && <Button size="sm" variant="outline" className="gap-1" onClick={() => void pdf()}><FileDown className="h-3.5 w-3.5" aria-hidden="true" /> PDF of version {p.version}</Button>}
        </div>
        {a.view}
        <Section title="History">
          <ol className="space-y-1 text-xs">{(events.value ?? []).map((e) => <li key={e.id}><span className="text-muted-foreground">{fmtWhen(e.created_at)}</span> · {e.actor_kind} · {e.kind.replace(/_/g, " ")}{e.version ? ` (v${e.version})` : ""}{e.body ? `: ${e.body}` : ""}</li>)}</ol>
          {p.status !== "draft" && <div className="flex gap-2"><input aria-label="Comment to the client" className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment visible to the client" /><Button size="sm" variant="outline" disabled={!comment.trim()} onClick={() => void a.run(() => clientOsApi.proposalComment(p.id, comment), "Comment added.").then(() => { setComment(""); events.reload(); })}>Comment</Button></div>}
        </Section>
      </div>
    </Panel>
  );
};

const Proposals = () => {
  const { brandIds, brandName } = useClientOs();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Partial<Proposal> | null>(null);
  const proposals = useAsync(() => clientOsApi.proposals(brandIds), [JSON.stringify(brandIds)]);
  if (proposals.error) return <ErrorBox message={proposals.error} onRetry={proposals.reload} />;
  if (!proposals.value) return <LoadingGrid tiles={4} />;
  const selected = proposals.value.find((p) => p.id === params.get("id"));
  const select = (id: string) => { const q = new URLSearchParams(params); q.set("id", id); setParams(q, { replace: true }); };
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Panel title="Proposals" actions={<Button size="sm" className="gap-1" onClick={() => setEditing({})}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New proposal</Button>}>
        {proposals.value.length === 0 ? <Empty title="No proposal yet" /> : (
          <ul className="divide-y divide-border/60">{proposals.value.map((p) => (
            <li key={p.id}><button type="button" onClick={() => { setEditing(null); select(p.id); }} aria-current={selected?.id === p.id ? "true" : undefined} className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${selected?.id === p.id ? "bg-muted/60" : ""}`}>
              <span className="min-w-0"><span className="font-medium">{p.reference} · {p.title}</span><span className="block text-xs text-muted-foreground">{brandName(p.brand_id)} · {p.currency} · {p.sent_at ? `sent ${fmtDay(p.sent_at)}` : "not sent"}</span></span>
              <StatusPill status={p.status} /></button></li>))}</ul>
        )}
      </Panel>
      {editing ? <Editor key={editing.id ?? "new"} initial={editing} onDone={(id) => { setEditing(null); proposals.reload(); if (id) select(id); }} />
        : selected ? <Detail key={selected.id} p={selected} onChanged={proposals.reload} onEdit={() => setEditing(selected)} />
        : <Panel title="Proposal"><Empty title="Choose or create a proposal" /></Panel>}
    </div>
  );
};

export default Proposals;
