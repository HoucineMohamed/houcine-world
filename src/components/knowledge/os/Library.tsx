import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Copy, Archive, RotateCcw, Trash2, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { knowledgeOsApi, RELATIONS, STATUS, VISIBILITY, type KosDocument, type KosInsights, type Visibility } from "@/services/knowledgeOs";
import { Pill, Section } from "../ui";
import { fmtDay, inputCls, useKosBrands, type KosBrand } from "./shared";

// The Knowledge Library (docs/knowledge-os.md section 4): client, internal and management documents in Supabase. Lists,
// search and every detail come from the database under the person's own access; actions are kos_* functions.

const STATUS_TONE: Record<string, "published" | "draft" | "review" | "pending" | "archived"> = { published: "published", draft: "draft", in_review: "review", approved: "pending", archived: "archived" };
const VIS_TONE: Record<string, "out" | "neutral" | "pending"> = { management: "out", internal: "neutral", client: "pending" };
const RANK: Record<Visibility, number> = { client: 1, internal: 2, management: 3 };

const useAct = () => {
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); setMsg({ text: ok, error: false }); return true; } catch (e) { setMsg({ text: e instanceof Error ? e.message : "That did not work.", error: true }); return false; } finally { setBusy(false); }
  };
  return { busy, run, view: msg && <p role={msg.error ? "alert" : "status"} className={cn("text-xs", msg.error ? "text-destructive" : "text-muted-foreground")}>{msg.text}</p> };
};

const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <label className={cn("block text-xs", className)}><span className="mb-1 block text-muted-foreground">{label}</span>{children}</label>
);

const Editor = ({ doc, brands, isSuperAdmin, onSaved, onClose }: { doc: KosDocument | null; brands: KosBrand[]; isSuperAdmin: boolean; onSaved: (id: string) => void; onClose: () => void }) => {
  const [f, setF] = useState({ title: doc?.title ?? "", description: doc?.description ?? "", category: doc?.category ?? "", tags: (doc?.tags ?? []).join(", "), content: doc?.content ?? "",
    sources: (doc?.sources ?? []).join("\n"), visibility: (doc?.visibility ?? "internal") as Visibility, brand_id: doc?.brand_id ?? (isSuperAdmin ? "" : brands[0]?.id ?? ""), client_contact_id: doc?.client_contact_id ?? "", summary: "" });
  const [preview, setPreview] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const a = useAct();
  useEffect(() => { if (!doc && f.visibility === "client" && f.brand_id) knowledgeOsApi.clients(f.brand_id).then(setClients).catch(() => setClients([])); }, [doc, f.visibility, f.brand_id]);
  const save = async () => {
    let id = doc?.id ?? "";
    const body: Record<string, unknown> = { title: f.title, description: f.description || null, category: f.category || null, content: f.content,
      tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), sources: f.sources.split("\n").map((t) => t.trim()).filter(Boolean) };
    if (!doc) Object.assign(body, { visibility: f.visibility, brand_id: f.brand_id || null, client_contact_id: f.client_contact_id || null });
    const ok = await a.run(async () => { id = await knowledgeOsApi.save(doc?.id ?? null, body, f.summary || null); }, doc ? "Saved as a new version (not published until reviewed)." : "Created as a draft.");
    if (ok) onSaved(id);
  };
  return (
    <Section title={doc ? `Edit: ${doc.title}` : "New document"} actions={<Button size="icon" variant="ghost" aria-label="Close the editor" onClick={onClose}><X className="h-4 w-4" /></Button>}>
      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Title"><input className={inputCls} value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Category"><input className={inputCls} value={f.category} maxLength={80} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="e.g. Procedure, Pricing, Onboarding" /></Field>
        </div>
        <Field label="Description"><input className={inputCls} value={f.description} maxLength={1000} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {!doc && (
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="Visibility">
              <select aria-label="Visibility" className={inputCls} value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value as Visibility })}>
                <option value="client">Client</option><option value="internal">Internal</option>{isSuperAdmin && <option value="management">Management</option>}
              </select>
            </Field>
            <Field label="Brand"><select aria-label="Brand" className={inputCls} value={f.brand_id} onChange={(e) => setF({ ...f, brand_id: e.target.value, client_contact_id: "" })}>{isSuperAdmin && <option value="">All brands (global)</option>}{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
            {f.visibility === "client" && f.brand_id && <Field label="Only for one client (optional)"><select aria-label="Client restriction" className={inputCls} value={f.client_contact_id} onChange={(e) => setF({ ...f, client_contact_id: e.target.value })}><option value="">Every client of the brand</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
            <p className="text-[0.7rem] text-muted-foreground md:col-span-3">{VISIBILITY[f.visibility].help} Public knowledge is written as a note in Notes and published to the website.</p>
          </div>
        )}
        <Field label="Tags (comma separated)"><input className={inputCls} value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        <div>
          <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted-foreground">Content (Markdown)</span><button type="button" className="underline" onClick={() => setPreview((p) => !p)}>{preview ? "Edit" : "Preview"}</button></div>
          {preview ? <div className="min-h-[16rem] whitespace-pre-wrap rounded-md border border-border p-3 text-sm">{f.content || "Nothing yet."}</div>
            : <textarea aria-label="Content" className={`${inputCls} h-64 py-2 font-mono text-xs`} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />}
        </div>
        <Field label="Sources (one per line)"><textarea className={`${inputCls} h-16 py-1.5`} value={f.sources} onChange={(e) => setF({ ...f, sources: e.target.value })} /></Field>
        {doc && <Field label="What changed (version note)"><input className={inputCls} value={f.summary} maxLength={500} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>}
        <div className="flex flex-wrap items-center gap-2"><Button size="sm" disabled={a.busy || !f.title.trim() || (!doc && !isSuperAdmin && !f.brand_id)} onClick={() => void save()}>{doc ? "Save new version" : "Create draft"}</Button><Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>{a.view}</div>
      </div>
    </Section>
  );
};

const Detail = ({ id, brands, isSuperAdmin, onChanged, onEdit }: { id: string; brands: KosBrand[]; isSuperAdmin: boolean; onChanged: () => void; onEdit: (d: KosDocument) => void }) => {
  const [d, setD] = useState<KosDocument | null | undefined>(undefined);
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof knowledgeOsApi.versions>>>([]);
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof knowledgeOsApi.reviews>>>([]);
  const [links, setLinks] = useState<Awaited<ReturnType<typeof knowledgeOsApi.links>>>([]);
  const [titles, setTitles] = useState<Awaited<ReturnType<typeof knowledgeOsApi.titles>>>([]);
  const [editors, setEditors] = useState<{ user_id: string; name: string }[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [scope, setScope] = useState<{ visibility: Visibility; brand: string; confirm: boolean } | null>(null);
  const [sched, setSched] = useState({ owner: "", due: "", interval: "", expires: "" });
  const [rel, setRel] = useState({ to: "", note: "", relation: "related" });
  const a = useAct();
  const load = useCallback(async () => {
    const doc = await knowledgeOsApi.get(id).catch(() => null);
    setD(doc);
    if (!doc) return;
    setSched({ owner: doc.owner_id ?? "", due: doc.review_due ?? "", interval: doc.review_interval_days ? String(doc.review_interval_days) : "", expires: doc.expires_on ?? "" });
    setScope({ visibility: doc.visibility, brand: doc.brand_id ?? "", confirm: false });
    const [v, r, l, t, e] = await Promise.all([knowledgeOsApi.versions(id).catch(() => []), knowledgeOsApi.reviews(id).catch(() => []), knowledgeOsApi.links(id).catch(() => []), knowledgeOsApi.titles().catch(() => []), knowledgeOsApi.editors(doc.brand_id).catch(() => [])]);
    setVersions(v); setReviews(r); setLinks(l); setTitles(t); setEditors(e);
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  if (d === undefined) return <Section title="Document"><p className="text-muted-foreground" role="status">Loading…</p></Section>;
  if (d === null) return <Section title="Document"><p className="text-muted-foreground">This document does not exist or is not available to you.</p></Section>;
  const canEdit = versions.length > 0; // the version history is readable only by editors
  const brandName = (b: string | null) => (b ? brands.find((x) => x.id === b)?.name ?? "Another brand" : "All brands");
  const titleOf = (x: string | null) => titles.find((t) => t.id === x)?.title ?? "A document";
  const after = async (p: Promise<boolean>) => { if (await p) { await load(); onChanged(); } };
  const tr = (action: string, ok: string, needsComment = false) => () => {
    if (needsComment && !comment.trim()) return;
    void after(a.run(() => knowledgeOsApi.transition(d.id, action, comment || null, action === "submit" ? reviewer || null : null), ok).then((x) => { if (x) setComment(""); return x; }));
  };
  const loosening = scope && (RANK[scope.visibility] < RANK[d.visibility] || (d.brand_id !== null && scope.brand === ""));
  const shown = viewing !== null ? versions.find((v) => v.version === viewing) : null;
  return (
    <Section title={d.title} actions={<span className="flex gap-1"><Pill tone={VIS_TONE[d.visibility]}>{VISIBILITY[d.visibility].label}</Pill><Pill tone={STATUS_TONE[d.status] ?? "draft"}>{STATUS[d.status]}</Pill></span>}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">{brandName(d.brand_id)}{d.client_contact_id ? " · one client only" : ""} · {d.category ?? "uncategorized"} · version {d.version}{d.published_version ? ` · live: version ${d.published_version}` : " · not live"} · updated {fmtDay(d.updated_at)}</p>
        {d.description && <p>{d.description}</p>}
        {d.tags.length > 0 && <p className="flex flex-wrap gap-1">{d.tags.map((t) => <Pill key={t} tone="neutral">{t}</Pill>)}</p>}
        <div className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/40 p-3 text-sm">{shown ? shown.content : d.content || "No content yet."}</div>
        {shown && <p className="text-xs">Showing version {shown.version} · <button type="button" className="underline" onClick={() => setViewing(null)}>back to the current text</button>{canEdit && <> · <button type="button" className="underline" onClick={() => void after(a.run(() => knowledgeOsApi.restoreVersion(d.id, shown.version), `Version ${shown.version} restored as a new version.`))}>restore it as a new version</button></>}</p>}
        {canEdit && (
          <>
            <div className="flex flex-wrap gap-2">
              {d.status !== "archived" && <Button size="sm" variant="outline" onClick={() => onEdit(d)}>Edit</Button>}
              {d.status === "draft" && <>
                <select aria-label="Reviewer" className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={reviewer} onChange={(e) => setReviewer(e.target.value)}><option value="">Any {d.visibility === "management" || !d.brand_id ? "super admin" : "brand admin"}</option>{editors.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}</select>
                <Button size="sm" onClick={tr("submit", "Submitted for review.")}>Request review</Button></>}
              {d.status === "in_review" && <><Button size="sm" onClick={tr("approve", "Approved. Publish it when ready.")}>Approve</Button><Button size="sm" variant="outline" disabled={!comment.trim()} onClick={tr("reject", "Sent back to draft with your reason.", true)}>Reject</Button></>}
              {d.status === "approved" && <Button size="sm" onClick={tr("publish", "Published: readers and assistants with access now get this version.")}>Publish</Button>}
              {d.published_version !== null && d.status !== "archived" && <Button size="sm" variant="outline" onClick={tr("unpublish", "Unpublished: no reader or assistant gets it now.")}>Unpublish</Button>}
              {d.status !== "archived" ? <Button size="sm" variant="ghost" className="gap-1" onClick={tr("archive", "Archived.")}><Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive</Button>
                : <Button size="sm" variant="outline" className="gap-1" onClick={tr("restore", "Restored as a draft (publish it again explicitly).")}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Restore</Button>}
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => void after(a.run(() => knowledgeOsApi.duplicate(d.id), "Duplicated as a new draft."))}><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Duplicate</Button>
              {!d.published_at && <Button size="sm" variant="ghost" className="gap-1" onClick={() => { if (window.confirm("Delete this never-published document?")) void a.run(() => knowledgeOsApi.remove(d.id), "Deleted.").then((x) => x && onChanged()); }}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete</Button>}
            </div>
            {(d.status === "in_review" || d.status === "draft") && <input aria-label="Review comment" className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={d.status === "in_review" ? "Review comment (required to reject)" : "Note for the reviewer (optional)"} />}
            {a.view}
            {scope && (
              <div className="rounded-md border border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Visibility and scope</p>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Visibility" className="w-40"><select aria-label="Change visibility" className={inputCls} value={scope.visibility} onChange={(e) => setScope({ ...scope, visibility: e.target.value as Visibility, confirm: false })}><option value="client">Client</option><option value="internal">Internal</option>{isSuperAdmin && <option value="management">Management</option>}</select></Field>
                  <Field label="Brand" className="w-48"><select aria-label="Change brand" className={inputCls} value={scope.brand} onChange={(e) => setScope({ ...scope, brand: e.target.value, confirm: false })}>{isSuperAdmin && <option value="">All brands (global)</option>}{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
                  {loosening && <label className="flex items-center gap-1.5 text-xs text-amber-300"><input type="checkbox" checked={scope.confirm} onChange={(e) => setScope({ ...scope, confirm: e.target.checked })} /> I confirm more people will see it</label>}
                  <Button size="sm" variant="outline" disabled={!!loosening && !scope.confirm} onClick={() => void after(a.run(() => knowledgeOsApi.setScope(d.id, scope.visibility, scope.brand || null, scope.visibility === "client" && scope.brand === (d.brand_id ?? "") ? d.client_contact_id : null, scope.confirm), "Visibility and scope changed (applies at once)."))}>Apply</Button>
                </div>
              </div>
            )}
            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ownership and review schedule</p>
              <div className="grid gap-2 md:grid-cols-4">
                <Field label="Owner"><select aria-label="Owner" className={inputCls} value={sched.owner} onChange={(e) => setSched({ ...sched, owner: e.target.value })}><option value="">No owner</option>{editors.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}{sched.owner && !editors.some((m) => m.user_id === sched.owner) && <option value={sched.owner}>Current owner</option>}</select></Field>
                <Field label="Review by"><input type="date" className={inputCls} value={sched.due} onChange={(e) => setSched({ ...sched, due: e.target.value })} /></Field>
                <Field label="Review every (days)"><input type="number" min={7} max={1095} className={inputCls} value={sched.interval} onChange={(e) => setSched({ ...sched, interval: e.target.value })} /></Field>
                <Field label="Expires on"><input type="date" className={inputCls} value={sched.expires} onChange={(e) => setSched({ ...sched, expires: e.target.value })} /></Field>
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => void after(a.run(() => knowledgeOsApi.setSchedule(d.id, sched.owner || null, sched.due || null, sched.interval ? Number(sched.interval) : null, sched.expires || null), "Schedule saved."))}>Save schedule</Button>
            </div>
          </>
        )}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Relations</p>
          {links.length === 0 ? <p className="text-xs text-muted-foreground">No relation you may see.</p> : (
            <ul className="space-y-1 text-xs">{links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2"><span><Pill tone="neutral">{l.relation.replace("_", " ")}</Pill> {l.from_document === d.id ? "→" : "←"} {l.to_note ? `public note ${l.to_note}` : titleOf(l.from_document === d.id ? l.to_document : l.from_document)}</span>
                {canEdit && l.from_document === d.id && <Button size="sm" variant="ghost" className="h-6" onClick={() => void after(a.run(() => knowledgeOsApi.unlink(l.id), "Relation removed."))}>Remove</Button>}</li>))}</ul>
          )}
          {canEdit && (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <select aria-label="Relation" className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={rel.relation} onChange={(e) => setRel({ ...rel, relation: e.target.value })}>{RELATIONS.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</select>
              <select aria-label="Related document" className="h-8 max-w-[14rem] rounded-md border border-input bg-background px-2 text-xs" value={rel.to} onChange={(e) => setRel({ ...rel, to: e.target.value, note: "" })}><option value="">A document…</option>{titles.filter((t) => t.id !== d.id).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
              <input aria-label="Public note id" className="h-8 w-44 rounded-md border border-input bg-background px-2 text-xs" placeholder="or a public note id" value={rel.note} onChange={(e) => setRel({ ...rel, note: e.target.value, to: "" })} />
              <Button size="sm" variant="outline" className="h-8 gap-1" disabled={!rel.to && !rel.note.trim()} onClick={() => void after(a.run(() => knowledgeOsApi.link(d.id, rel.to || null, rel.note.trim() || null, rel.relation), "Relation added.").then((x) => { if (x) setRel({ to: "", note: "", relation: "related" }); return x; }))}><Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Add</Button>
            </div>
          )}
        </div>
        {canEdit && (
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Versions</p>
              <ol className="space-y-1 text-xs">{versions.map((v) => <li key={v.id}><button type="button" className="underline-offset-2 hover:underline" onClick={() => setViewing(v.version)}>Version {v.version}</button> · {fmtDay(v.created_at)}{v.version === d.published_version ? " · live" : ""}{v.summary ? ` · ${v.summary}` : ""}</li>)}</ol></div>
            <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reviews</p>
              {reviews.length === 0 ? <p className="text-xs text-muted-foreground">None yet.</p> : <ol className="space-y-1 text-xs">{reviews.map((r) => <li key={r.id}>{fmtDay(r.created_at)} · version {r.version} · {r.decision}{r.comment ? `: ${r.comment}` : ""}</li>)}</ol>}</div>
          </div>
        )}
      </div>
    </Section>
  );
};

const Library = () => {
  const { brands, isSuperAdmin, userId } = useKosBrands();
  const [params, setParams] = useSearchParams();
  const f = { q: params.get("q") ?? "", visibility: params.get("visibility") ?? "", brand: params.get("brand") ?? "", status: params.get("status") ?? "", category: params.get("category") ?? "", tag: params.get("tag") ?? "", owner: params.get("mine") ? userId ?? "" : "" };
  const page = Number(params.get("page") ?? 0);
  const [data, setData] = useState<{ rows: KosDocument[]; count: number } | null>(null);
  const [stats, setStats] = useState<KosInsights | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<KosDocument | null | "new">(null);
  const [tick, setTick] = useState(0);
  const key = JSON.stringify({ ...f, page, tick });
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => knowledgeOsApi.list({ ...f, page }).then((r) => alive && (setData(r), setError(null))).catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load.")), 200);
    return () => { alive = false; clearTimeout(t); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { knowledgeOsApi.insights(f.brand && f.brand !== "global" ? f.brand : null).then(setStats).catch(() => setStats(null)); }, [f.brand, tick]);
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); if (k !== "page") p.delete("page"); if (k !== "id") p.delete("id"); setParams(p, { replace: true }); };
  const open = (id: string) => { const p = new URLSearchParams(params); p.set("id", id); setParams(p, { replace: true }); setEditing(null); };
  if (!brands) return <p className="text-muted-foreground" role="status">Loading…</p>;
  const selected = params.get("id");
  const brandName = (b: string | null) => (b ? brands.find((x) => x.id === b)?.name ?? "Another brand" : "All brands");
  const space = f.brand && f.brand !== "global" ? brands.find((b) => b.id === f.brand) : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{space ? `${space.name} knowledge space` : "Knowledge Library"}</h2>
          <p className="text-xs text-muted-foreground">Client, internal and management knowledge, private to the people allowed to read it. Public knowledge is in Notes.</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing("new")}><Plus className="h-4 w-4" aria-hidden="true" /> New document</Button>
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[["Documents", stats.total], ["Live", stats.live], ["Drafts", stats.by_status.draft ?? 0], ["In review", stats.by_status.in_review ?? 0], ["Review overdue", stats.review_overdue.length], ["Archived", stats.by_status.archived ?? 0]].map(([l, v]) => (
            <div key={String(l)} className="rounded-lg border border-border bg-card/40 p-3"><div className="text-[0.7rem] text-muted-foreground">{l}</div><div className="text-xl font-semibold tabular-nums">{v}</div></div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Search" className="min-w-[12rem] flex-1"><input className={inputCls} value={f.q} onChange={(e) => set("q", e.target.value)} placeholder="Title, content, category" /></Field>
        <Field label="Brand space" className="w-44"><select aria-label="Brand space" className={inputCls} value={f.brand} onChange={(e) => set("brand", e.target.value)}><option value="">All I may see</option><option value="global">Global</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>
        <Field label="Visibility" className="w-36"><select aria-label="Visibility filter" className={inputCls} value={f.visibility} onChange={(e) => set("visibility", e.target.value)}><option value="">All</option>{Object.entries(VISIBILITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="Status" className="w-36"><select aria-label="Status filter" className={inputCls} value={f.status} onChange={(e) => set("status", e.target.value)}><option value="">Not archived</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Category" className="w-36"><input className={inputCls} value={f.category} onChange={(e) => set("category", e.target.value)} /></Field>
        <Field label="Tag" className="w-28"><input className={inputCls} value={f.tag} onChange={(e) => set("tag", e.target.value)} /></Field>
        <label className="flex h-9 items-center gap-1.5 text-xs"><input type="checkbox" checked={!!params.get("mine")} onChange={(e) => set("mine", e.target.checked ? "1" : "")} /> I own</label>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title={data ? `${data.count} document${data.count === 1 ? "" : "s"}` : "Documents"}>
          {!data ? <p className="text-muted-foreground" role="status">Loading…</p> : data.rows.length === 0 ? <p className="text-muted-foreground">Nothing here yet.</p> : (
            <ul className="divide-y divide-border/60">{data.rows.map((d) => (
              <li key={d.id}><button type="button" onClick={() => open(d.id)} aria-current={selected === d.id ? "true" : undefined} className={cn("flex w-full items-start justify-between gap-2 py-2 text-left hover:bg-muted/40", selected === d.id && "bg-muted/60")}>
                <span className="min-w-0"><span className="font-medium">{d.title}</span><span className="block text-[0.7rem] text-muted-foreground">{brandName(d.brand_id)} · {d.category ?? "uncategorized"} · v{d.version} · {fmtDay(d.updated_at)}{d.review_due && d.review_due < new Date().toISOString().slice(0, 10) ? " · review overdue" : ""}</span></span>
                <span className="flex shrink-0 gap-1"><Pill tone={VIS_TONE[d.visibility]}>{VISIBILITY[d.visibility].label}</Pill><Pill tone={STATUS_TONE[d.status] ?? "draft"}>{STATUS[d.status]}</Pill></span>
              </button></li>))}</ul>
          )}
          {data && data.count > 50 && <div className="mt-2 flex justify-between text-xs"><button type="button" className="underline disabled:opacity-40" disabled={page === 0} onClick={() => set("page", String(page - 1))}>Previous</button><span>Page {page + 1} of {Math.ceil(data.count / 50)}</span><button type="button" className="underline disabled:opacity-40" disabled={(page + 1) * 50 >= data.count} onClick={() => set("page", String(page + 1))}>Next</button></div>}
        </Section>
        {editing ? <Editor doc={editing === "new" ? null : editing} brands={brands} isSuperAdmin={isSuperAdmin} onClose={() => setEditing(null)} onSaved={(id) => { setTick((t) => t + 1); open(id); }} />
          : selected ? <Detail key={selected} id={selected} brands={brands} isSuperAdmin={isSuperAdmin} onChanged={() => setTick((t) => t + 1)} onEdit={(d) => setEditing(d)} />
          : <Section title="Document"><p className="text-muted-foreground">Choose a document, or create one.</p></Section>}
      </div>
    </div>
  );
};

export default Library;
