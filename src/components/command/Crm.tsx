import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { commandApi, type Contact, type ContactBrand, type Lead } from "@/services/command";
import { useCommand } from "./context";
import { attempt, useAsync } from "./useAsync";
import { Empty, ErrorBox, Field, fmtAmount, fmtDate, fmtDateTime, inputCls, label, Panel, StatusPill } from "./ui";
import { PIPELINE_STAGES } from "../../../supabase/functions/_shared/command/metrics.ts";

// CRM: one identity per contact (shared across brands, deduplicated by email in the database) and one relationship
// per brand; the lead pipeline with its stage history; conversion of a won lead into a project (a database
// operation, the only way a lead counts as converted).

const ENTITY_TYPES = ["client", "prospect", "partner", "artist", "dj", "supplier", "venue", "organization", "business", "other"];
const REL_STATUSES = ["prospect", "client", "partner", "supplier", "inactive"];
const INTERACTIONS = ["call", "email", "meeting", "message", "note", "follow_up"];

const useCrmData = () => {
  const { scope } = useCommand();
  const key = [JSON.stringify(scope.brandIds)];
  const contacts = useAsync(() => commandApi.contacts(), key);
  const links = useAsync(() => commandApi.contactBrands(scope), key);
  const leads = useAsync(() => commandApi.leads(scope), key);
  const projects = useAsync(() => commandApi.projects(scope), key);
  const reload = () => { contacts.reload(); links.reload(); leads.reload(); projects.reload(); };
  return { contacts, links, leads, projects, reload, error: contacts.error ?? links.error ?? leads.error ?? projects.error };
};

const BrandSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { scopeBrands, brands } = useCommand();
  const options = scopeBrands.length ? scopeBrands : brands;
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} required>
      <option value="">Choose a brand</option>
      {options.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
    </select>
  );
};

const NewContact = ({ onDone }: { onDone: () => void }) => {
  const { scopeBrands, reload } = useCommand();
  const [f, setF] = useState({ brandId: scopeBrands.length === 1 ? scopeBrands[0]!.id : "", name: "", kind: "person", entityType: "client", email: "", phone: "", status: "prospect", source: "", tags: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await attempt(() => commandApi.createContact({ ...f, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean) }));
    setBusy(false);
    if (error) return setErr(error);
    reload();
    onDone();
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-4">
      <Field label="Brand"><BrandSelect value={f.brandId} onChange={(v) => setF({ ...f, brandId: v })} /></Field>
      <Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} required maxLength={200} /></Field>
      <Field label="Person or organization"><select className={inputCls} value={f.kind} onChange={set("kind")}><option value="person">Person</option><option value="organization">Organization</option></select></Field>
      <Field label="Type"><select className={inputCls} value={f.entityType} onChange={set("entityType")}>{ENTITY_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
      <Field label="Email (one identity per email)"><input type="email" className={inputCls} value={f.email} onChange={set("email")} maxLength={254} /></Field>
      <Field label="Phone"><input className={inputCls} value={f.phone} onChange={set("phone")} maxLength={40} /></Field>
      <Field label="Relationship with the brand"><select className={inputCls} value={f.status} onChange={set("status")}>{REL_STATUSES.map((t) => <option key={t} value={t}>{label(t)}</option>)}</select></Field>
      <Field label="Acquisition source"><input className={inputCls} value={f.source} onChange={set("source")} placeholder="website, referral, event…" maxLength={120} /></Field>
      <Field label="Tags (comma separated)" className="md:col-span-2"><input className={inputCls} value={f.tags} onChange={set("tags")} /></Field>
      <div className="flex items-end gap-2 md:col-span-2">
        <Button type="submit" size="sm" disabled={busy || !f.brandId || !f.name.trim()}>Save contact</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
      {err && <p role="alert" className="text-sm text-rose-300 md:col-span-4">{err}</p>}
    </form>
  );
};

const ContactProfile = ({ contact, links, leads, onClose, onChanged }: { contact: Contact; links: ContactBrand[]; leads: Lead[]; onClose: () => void; onChanged: () => void }) => {
  const { scope, brandName, canEdit, link } = useCommand();
  const interactions = useAsync(() => commandApi.interactions(scope, { contact_id: contact.id }), [contact.id]);
  const projects = useAsync(() => commandApi.projects(scope), [contact.id]);
  const [note, setNote] = useState({ kind: "note", summary: "", brandId: links[0]?.brand_id ?? "" });
  const [err, setErr] = useState<string | null>(null);
  const addInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = await attempt(() => commandApi.addInteraction({ brand_id: note.brandId, contact_id: contact.id, kind: note.kind, summary: note.summary }));
    if (error) return setErr(error);
    setNote({ ...note, summary: "" });
    interactions.reload();
  };
  return (
    <Panel title={contact.name} actions={<Button size="sm" variant="ghost" onClick={onClose} aria-label="Close the profile"><X className="h-4 w-4" /></Button>}
      description={`${label(contact.kind)} · ${label(contact.entity_type)}${contact.email ? ` · ${contact.email}` : ""}${contact.phone ? ` · ${contact.phone}` : ""}`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relationships with the brands you manage</h3>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                  <span>{brandName(l.brand_id)}{l.source && <span className="text-xs text-muted-foreground"> · source: {l.source}</span>}{l.became_client_at && <span className="text-xs text-muted-foreground"> · client since {fmtDate(l.became_client_at)}</span>}</span>
                  {canEdit ? (
                    <select aria-label={`Relationship with ${brandName(l.brand_id)}`} className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={l.status}
                      onChange={async (e) => { const error = await attempt(() => commandApi.updateContactBrand(l.id, { status: e.target.value })); if (error) setErr(error); else onChanged(); }}>
                      {REL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  ) : <StatusPill status={l.status} />}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Leads</h3>
            {leads.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
              <ul className="space-y-1 text-sm">{leads.map((l) => <li key={l.id}><Link className="hover:underline" to={link("crm", { tab: "pipeline", lead: l.id })}>{l.title}</Link> <StatusPill status={l.stage} /> <span className="text-xs text-muted-foreground">{fmtAmount(l.expected_value, l.currency)}</span></li>)}</ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects</h3>
            {(projects.value ?? []).filter((p) => p.client_contact_id === contact.id).length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
              <ul className="space-y-1 text-sm">{(projects.value ?? []).filter((p) => p.client_contact_id === contact.id).map((p) => <li key={p.id}><Link className="hover:underline" to={link("projects", { id: p.id })}>{p.name}</Link> <StatusPill status={p.status} /></li>)}</ul>
            )}
          </div>
          {contact.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{contact.notes}</p>}
          {contact.tags.length > 0 && <p className="text-xs text-muted-foreground">Tags: {contact.tags.join(", ")}</p>}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interaction history</h3>
          {canEdit && (
            <form onSubmit={addInteraction} className="mb-3 grid gap-2 sm:grid-cols-[120px_1fr]">
              <select aria-label="Kind" className={inputCls} value={note.kind} onChange={(e) => setNote({ ...note, kind: e.target.value })}>{INTERACTIONS.map((k) => <option key={k} value={k}>{label(k)}</option>)}</select>
              {links.length > 1 && <select aria-label="Brand" className={inputCls} value={note.brandId} onChange={(e) => setNote({ ...note, brandId: e.target.value })}>{links.map((l) => <option key={l.brand_id} value={l.brand_id}>{brandName(l.brand_id)}</option>)}</select>}
              <textarea aria-label="What happened" className="min-h-16 rounded-md border border-input bg-background p-2 text-sm sm:col-span-2" value={note.summary} onChange={(e) => setNote({ ...note, summary: e.target.value })} maxLength={5000} placeholder="Call, meeting, follow-up…" />
              <Button type="submit" size="sm" className="sm:col-span-2 sm:justify-self-start" disabled={!note.summary.trim() || !note.brandId}>Add to history</Button>
            </form>
          )}
          {err && <p role="alert" className="mb-2 text-sm text-rose-300">{err}</p>}
          {(interactions.value ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No interaction recorded.</p> : (
            <ol className="space-y-2 border-l border-border pl-3">
              {interactions.value!.map((i) => <li key={i.id} className="text-sm"><span className="text-xs text-muted-foreground">{fmtDateTime(i.occurred_at)} · {label(i.kind)} · {brandName(i.brand_id)}</span><p className="whitespace-pre-wrap">{i.summary}</p></li>)}
            </ol>
          )}
        </div>
      </div>
    </Panel>
  );
};

const Contacts = ({ data }: { data: ReturnType<typeof useCrmData> }) => {
  const { canEdit, brandName } = useCommand();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const status = params.get("status") ?? "";
  const type = params.get("type") ?? "";
  const linksBy = useMemo(() => {
    const m = new Map<string, ContactBrand[]>();
    for (const l of data.links.value ?? []) m.set(l.contact_id, [...(m.get(l.contact_id) ?? []), l]);
    return m;
  }, [data.links.value]);
  const rows = (data.contacts.value ?? []).filter((c) => linksBy.has(c.id))
    .filter((c) => !q || `${c.name} ${c.email ?? ""} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
    .filter((c) => !type || c.entity_type === type)
    .filter((c) => !status || (linksBy.get(c.id) ?? []).some((l) => l.status === status));
  const open = rows.find((c) => c.id === params.get("id")) ?? (data.contacts.value ?? []).find((c) => c.id === params.get("id"));
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  return (
    <div className="space-y-4">
      {open && <ContactProfile contact={open} links={linksBy.get(open.id) ?? []} leads={(data.leads.value ?? []).filter((l) => l.contact_id === open.id)} onClose={() => set("id", "")} onChanged={data.reload} />}
      <Panel title={`Contacts (${rows.length})`} actions={canEdit && !adding && <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New contact</Button>}>
        {adding && <div className="mb-4"><NewContact onDone={() => { setAdding(false); data.reload(); }} /></div>}
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Field label="Search"><input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, tag" /></Field>
          <Field label="Relationship"><select className={inputCls} value={status} onChange={(e) => set("status", e.target.value)}><option value="">Any</option>{REL_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
          <Field label="Type"><select className={inputCls} value={type} onChange={(e) => set("type", e.target.value)}><option value="">Any</option>{ENTITY_TYPES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></Field>
        </div>
        {rows.length === 0 ? <Empty title={data.contacts.value?.length ? "No contact matches these filters" : "No contact yet"}>{canEdit ? "Add the first contact with New contact." : "Contacts appear here once an editor adds them."}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Name", "Type", "Email", "Brands", "Added"].map((h) => <th key={h} scope="col" className="px-2 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-t border-border/60 hover:bg-muted/20">
                    <th scope="row" className="px-2 py-2 font-medium"><button type="button" className="text-left hover:underline" onClick={() => set("id", c.id)}>{c.name}</button></th>
                    <td className="px-2 py-2">{label(c.entity_type)}</td>
                    <td className="px-2 py-2 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-2 py-2"><span className="flex flex-wrap gap-1">{(linksBy.get(c.id) ?? []).map((l) => <span key={l.id} className="text-xs">{brandName(l.brand_id)} <StatusPill status={l.status} /></span>)}</span></td>
                    <td className="px-2 py-2 text-muted-foreground">{fmtDate(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

const NewLead = ({ contacts, links, onDone }: { contacts: Contact[]; links: ContactBrand[]; onDone: () => void }) => {
  const { scopeBrands, reload } = useCommand();
  const [f, setF] = useState({ brand_id: scopeBrands.length === 1 ? scopeBrands[0]!.id : "", title: "", contact_id: "", expected_value: "", currency: "EUR", source: "", next_follow_up: "", notes: "" });
  const [err, setErr] = useState<string | null>(null);
  const brandContacts = contacts.filter((c) => links.some((l) => l.contact_id === c.id && l.brand_id === f.brand_id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = await attempt(() => commandApi.createLead({
      brand_id: f.brand_id, title: f.title, contact_id: f.contact_id || null, source: f.source || null, notes: f.notes || null,
      next_follow_up: f.next_follow_up || null,
      ...(f.expected_value ? { expected_value: f.expected_value, currency: f.currency as "EUR" | "USD" } : {}),
    }));
    if (error) return setErr(error);
    reload();
    onDone();
  };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-4">
      <Field label="Brand"><BrandSelect value={f.brand_id} onChange={(v) => setF({ ...f, brand_id: v, contact_id: "" })} /></Field>
      <Field label="Title"><input className={inputCls} value={f.title} onChange={set("title")} required maxLength={200} /></Field>
      <Field label="Contact (of this brand)"><select className={inputCls} value={f.contact_id} onChange={set("contact_id")}><option value="">None yet</option>{brandContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Source"><input className={inputCls} value={f.source} onChange={set("source")} maxLength={120} /></Field>
      <Field label="Expected value (pipeline, not revenue)"><input inputMode="decimal" pattern="\d+(\.\d{1,2})?" className={inputCls} value={f.expected_value} onChange={set("expected_value")} /></Field>
      <Field label="Currency"><select className={inputCls} value={f.currency} onChange={set("currency")}><option>EUR</option><option>USD</option></select></Field>
      <Field label="Next follow-up"><input type="date" className={inputCls} value={f.next_follow_up} onChange={set("next_follow_up")} /></Field>
      <div className="flex items-end gap-2"><Button type="submit" size="sm" disabled={!f.brand_id || !f.title.trim()}>Save lead</Button><Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button></div>
      {err && <p role="alert" className="text-sm text-rose-300 md:col-span-4">{err}</p>}
    </form>
  );
};

const LeadDetail = ({ lead, contact, onClose, onChanged }: { lead: Lead; contact: Contact | undefined; onClose: () => void; onChanged: () => void }) => {
  const { scope, canEdit, brandName, link } = useCommand();
  const history = useAsync(() => commandApi.leadEvents(scope, lead.id), [lead.id, lead.stage]);
  const [err, setErr] = useState<string | null>(null);
  const [conv, setConv] = useState({ name: lead.title, deadline: "" });
  const save = async (patch: Partial<Lead>) => {
    const error = await attempt(() => commandApi.updateLead(lead.id, patch));
    if (error) setErr(error); else { setErr(null); onChanged(); }
  };
  return (
    <Panel title={lead.title} actions={<Button size="sm" variant="ghost" onClick={onClose} aria-label="Close the lead"><X className="h-4 w-4" /></Button>}
      description={`${brandName(lead.brand_id)} · ${contact ? contact.name : "no contact"} · expected ${fmtAmount(lead.expected_value, lead.currency)} (pipeline)`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Stage">
              <select className={inputCls} value={lead.stage} disabled={!canEdit || !!lead.converted_project_id} onChange={(e) => void save({ stage: e.target.value })}>
                {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
              </select>
            </Field>
            <Field label="Next follow-up"><input type="date" className={inputCls} disabled={!canEdit} defaultValue={lead.next_follow_up ?? ""} onBlur={(e) => e.target.value !== (lead.next_follow_up ?? "") && void save({ next_follow_up: e.target.value || null })} /></Field>
          </div>
          {lead.stage === "lost" && canEdit && <Field label="Why it was lost"><input className={inputCls} defaultValue={lead.lost_reason ?? ""} maxLength={500} onBlur={(e) => void save({ lost_reason: e.target.value || null })} /></Field>}
          {lead.converted_project_id ? (
            <p className="text-sm">Converted into <Link className="underline" to={link("projects", { id: lead.converted_project_id })}>a project</Link>.</p>
          ) : lead.stage === "won" && canEdit ? (
            <form className="grid gap-2 rounded-md border border-emerald-500/30 p-3 sm:grid-cols-[1fr_160px_auto]" onSubmit={async (e) => { e.preventDefault(); const error = await attempt(() => commandApi.convertLead(lead.id, conv.name, conv.deadline || null)); if (error) setErr(error); else onChanged(); }}>
              <Field label="Project name"><input className={inputCls} value={conv.name} onChange={(e) => setConv({ ...conv, name: e.target.value })} required /></Field>
              <Field label="Deadline"><input type="date" className={inputCls} value={conv.deadline} onChange={(e) => setConv({ ...conv, deadline: e.target.value })} /></Field>
              <Button type="submit" size="sm" className="self-end">Convert into a project</Button>
              <p className="text-xs text-muted-foreground sm:col-span-3">Creates the project with this lead's client and value as budget, and makes the contact a client of the brand.</p>
            </form>
          ) : null}
          <Field label="Notes"><textarea className="min-h-20 w-full rounded-md border border-input bg-background p-2 text-sm" disabled={!canEdit} defaultValue={lead.notes ?? ""} maxLength={5000} onBlur={(e) => e.target.value !== (lead.notes ?? "") && void save({ notes: e.target.value || null })} /></Field>
          {err && <p role="alert" className="text-sm text-rose-300">{err}</p>}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage history (recorded by the database)</h3>
          <ol className="space-y-1.5 border-l border-border pl-3 text-sm">
            {(history.value ?? []).map((h) => <li key={h.id}><span className="text-xs text-muted-foreground">{fmtDateTime(h.created_at)}</span> · {h.from_stage ? `${label(h.from_stage)} → ` : "Created as "}{label(h.to_stage)}</li>)}
          </ol>
        </div>
      </div>
    </Panel>
  );
};

const Pipeline = ({ data }: { data: ReturnType<typeof useCrmData> }) => {
  const { canEdit, brandName, mode } = useCommand();
  const [params, setParams] = useSearchParams();
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const leads = data.leads.value ?? [];
  const contacts = data.contacts.value ?? [];
  const stageFilter = params.get("stage");
  const open = leads.find((l) => l.id === params.get("lead"));
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v) n.set(k, v); else n.delete(k); setParams(n, { replace: true }); };
  const move = async (l: Lead, stage: string) => {
    const error = await attempt(() => commandApi.updateLead(l.id, { stage }));
    if (error) setErr(error); else data.reload();
  };
  const stages = stageFilter ? PIPELINE_STAGES.filter((s) => s === stageFilter) : PIPELINE_STAGES;
  return (
    <div className="space-y-4">
      {open && <LeadDetail lead={open} contact={contacts.find((c) => c.id === open.contact_id)} onClose={() => set("lead", "")} onChanged={data.reload} />}
      <Panel title={`Pipeline (${leads.length} leads)`} description="Moving a lead records the stage change; conversion rates count those records only."
        actions={<>{stageFilter && <Button size="sm" variant="ghost" onClick={() => set("stage", "")}>All stages</Button>}{canEdit && !adding && <Button size="sm" onClick={() => setAdding(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New lead</Button>}</>}>
        {adding && <div className="mb-4"><NewLead contacts={contacts} links={data.links.value ?? []} onDone={() => { setAdding(false); data.reload(); }} /></div>}
        {err && <p role="alert" className="mb-2 text-sm text-rose-300">{err}</p>}
        {leads.length === 0 ? <Empty title="No lead yet">{canEdit ? "Add a lead with New lead." : ""}</Empty> : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage) => {
              const col = leads.filter((l) => l.stage === stage);
              return (
                <section key={stage} aria-label={label(stage)} className="w-64 shrink-0 rounded-lg border border-border bg-background/40">
                  <h3 className="flex items-center justify-between border-b border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label(stage)}<span className="tabular-nums">{col.length}</span></h3>
                  <ul className="space-y-2 p-2">
                    {col.map((l) => (
                      <li key={l.id} className="rounded-md border border-border bg-card/60 p-2 text-sm">
                        <button type="button" className="text-left font-medium hover:underline" onClick={() => set("lead", l.id)}>{l.title}</button>
                        <p className="text-xs text-muted-foreground">{contacts.find((c) => c.id === l.contact_id)?.name ?? "No contact"}{mode === "global" && ` · ${brandName(l.brand_id)}`}</p>
                        <p className="text-xs tabular-nums">{fmtAmount(l.expected_value, l.currency)}{l.next_follow_up && <span className="text-muted-foreground"> · follow up {fmtDate(l.next_follow_up)}</span>}</p>
                        {canEdit && !l.converted_project_id && (
                          <select aria-label={`Move ${l.title}`} className="mt-1 h-7 w-full rounded border border-input bg-background px-1 text-xs" value={l.stage} onChange={(e) => void move(l, e.target.value)}>
                            {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                          </select>
                        )}
                        {l.converted_project_id && <p className="mt-1 text-[0.7rem] text-emerald-300">Converted</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};

const Crm = () => {
  const data = useCrmData();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "pipeline" ? "pipeline" : "contacts";
  return (
    <div className="space-y-4">
      <div className="flex gap-1" role="tablist" aria-label="CRM">
        {(["contacts", "pipeline"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { const n = new URLSearchParams(params); n.set("tab", t); setParams(n, { replace: true }); }}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t === "contacts" ? "Contacts" : "Lead pipeline"}</button>
        ))}
      </div>
      {data.error && <ErrorBox message={data.error} onRetry={data.reload} />}
      {!data.contacts.value || !data.leads.value ? <p className="text-sm text-muted-foreground" role="status">Loading…</p> : tab === "contacts" ? <Contacts data={data} /> : <Pipeline data={data} />}
    </div>
  );
};

export default Crm;
