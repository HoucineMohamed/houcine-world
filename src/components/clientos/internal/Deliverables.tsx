import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientOsApi, type Deliverable } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { FileLink, Section, StatusPill, UploadButton, fmtDay, fmtWhen, useAction } from "../shared";

// Deliverables: each submission is a new version (never overwritten). A version the team submits goes to the client;
// a partner's goes to the team first ("team review"). Every decision belongs to one version.

const Detail = ({ d, onChanged }: { d: Deliverable; onChanged: () => void }) => {
  const { brandName } = useClientOs();
  const versions = useAsync(() => clientOsApi.versions(d.id), [d.id, d.current_version, d.status]);
  const reviews = useAsync(() => clientOsApi.reviews(d.id), [d.id, d.current_version, d.status]);
  const files = useAsync(() => clientOsApi.files([d.brand_id]), [d.id, d.current_version]);
  const a = useAction();
  const [note, setNote] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  const [comment, setComment] = useState("");
  const latestInternal = versions.value?.find((v) => v.audience === "internal");
  const pendingInternal = latestInternal && !reviews.value?.some((r) => r.version_id === latestInternal.id) && d.status === "internal_review" ? latestInternal : null;
  const fileName = (id: string | null) => files.value?.find((f) => f.id === id)?.file_name ?? "file";
  return (
    <Panel title={d.title} description={`${brandName(d.brand_id)}${d.due_date ? ` · due ${fmtDay(d.due_date)}` : ""}`} actions={<StatusPill status={d.status} />}>
      <div className="space-y-4">
        {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
        {d.status !== "approved" && (
          <Section title="Submit a new version to the client">
            <Field label="What changed"><textarea className={`${inputCls} h-16 py-1.5`} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Link (https, optional)" className="min-w-[14rem] flex-1"><input className={inputCls} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://" /></Field>
              <UploadButton brandId={d.brand_id} projectId={d.project_id} purpose="deliverable" audience="client" onUploaded={(id, name) => setFile({ id, name })} />
              {file && <Pill>{file.name}</Pill>}
              <Button size="sm" disabled={a.busy || (!note.trim() && !linkUrl.trim() && !file)} onClick={() => void a.run(() => clientOsApi.submitVersion(d.id, note, file?.id ?? null, linkUrl.trim() || null), "Version submitted; the client was notified in the portal.").then((ok) => { if (ok) { setNote(""); setLinkUrl(""); setFile(null); onChanged(); } })}>Submit version {d.current_version + 1}</Button>
            </div>
          </Section>
        )}
        {pendingInternal && (
          <Section title={`Partner version ${pendingInternal.version}: team review`}>
            <input aria-label="Review comment" className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment (needed to ask for changes)" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void a.run(() => clientOsApi.review(pendingInternal.id, "approved", comment || null), "Approved for the team. Submit a client version when ready (it can reuse the file).").then(onChanged)}>Approve internally</Button>
              <Button size="sm" variant="outline" disabled={!comment.trim()} onClick={() => void a.run(() => clientOsApi.review(pendingInternal.id, "revision_requested", comment), "Changes requested from the partner.").then(onChanged)}>Ask for changes</Button>
            </div>
          </Section>
        )}
        {a.view}
        <Section title="Versions">
          {!versions.value?.length ? <p className="text-xs text-muted-foreground">No version yet.</p> : (
            <ol className="space-y-2">{versions.value.map((v) => {
              const rs = (reviews.value ?? []).filter((r) => r.version_id === v.id);
              return (
                <li key={v.id} className="rounded-md border border-border p-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Version {v.version}</span><Pill>{v.audience === "client" ? "to client" : "partner, team review"}</Pill><span className="text-muted-foreground">{fmtWhen(v.submitted_at)}</span></div>
                  {v.note && <p className="mt-1 whitespace-pre-wrap">{v.note}</p>}
                  <div className="mt-1 flex flex-wrap gap-3">{v.file_id && <FileLink fileId={v.file_id} name={fileName(v.file_id)} />}{v.link_url && <a className="underline" href={v.link_url} target="_blank" rel="noopener noreferrer">{v.link_url}</a>}</div>
                  {rs.map((r) => <p key={r.id} className="mt-1"><StatusPill status={r.decision} /> by {r.reviewer_kind === "client" ? "the client" : "the team"} · {fmtWhen(r.created_at)}{r.comment ? `: ${r.comment}` : ""}</p>)}
                </li>
              );
            })}</ol>
          )}
        </Section>
      </div>
    </Panel>
  );
};

const NewDeliverable = ({ onDone }: { onDone: () => void }) => {
  const { brandIds } = useClientOs();
  const projects = useAsync(() => clientOsApi.projects(brandIds), [JSON.stringify(brandIds)]);
  const [f, setF] = useState({ project: "", title: "", description: "", task: "", partner: "", due: "" });
  const project = projects.value?.find((p) => p.id === f.project);
  const tasks = useAsync(() => (f.project ? clientOsApi.tasks(f.project) : Promise.resolve([])), [f.project]);
  const partners = useAsync(() => (project ? clientOsApi.memberships([project.brand_id]) : Promise.resolve([])), [project?.brand_id]);
  const partnerRels = useAsync(() => (project ? clientOsApi.relationships([project.brand_id], ["partner"]) : Promise.resolve([])), [project?.brand_id]);
  const a = useAction();
  return (
    <Panel title="New deliverable">
      <div className="grid gap-2 md:grid-cols-2">
        <Field label="Project"><select aria-label="Deliverable project" className={inputCls} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value, task: "", partner: "" })}><option value="">Choose…</option>{(projects.value ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Task (optional)"><select aria-label="Deliverable task" className={inputCls} value={f.task} onChange={(e) => setF({ ...f, task: e.target.value })}><option value="">None</option>{(tasks.value ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></Field>
        <Field label="Partner who submits (optional)"><select aria-label="Deliverable partner" className={inputCls} value={f.partner} onChange={(e) => setF({ ...f, partner: e.target.value })}><option value="">The team</option>{(partners.value ?? []).filter((m) => m.kind === "partner" && m.status === "active").map((m) => <option key={m.id} value={m.id}>{partnerRels.value?.find((r) => r.contact_id === m.contact_id)?.contact?.name ?? "Partner"}</option>)}</select></Field>
        <Field label="Due date"><input type="date" className={inputCls} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
        <Field label="Description" className="md:col-span-2"><textarea className={`${inputCls} h-16 py-1.5`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={!project || !f.title.trim() || a.busy} onClick={() => void a.run(() => clientOsApi.createDeliverable({ project_id: project!.id, brand_id: project!.brand_id, title: f.title, description: f.description || null, task_id: f.task || null, partner_membership_id: f.partner || null, due_date: f.due || null }), "Created.").then((ok) => ok && onDone())}>Create</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>{a.view}
      </div>
    </Panel>
  );
};

const Deliverables = () => {
  const { brandIds, brandName } = useClientOs();
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const list = useAsync(() => clientOsApi.deliverables(brandIds), [JSON.stringify(brandIds)]);
  const projects = useAsync(() => clientOsApi.projects(brandIds), [JSON.stringify(brandIds)]);
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />;
  if (!list.value) return <LoadingGrid tiles={4} />;
  const selected = list.value.find((d) => d.id === params.get("id"));
  const rows = list.value.filter((d) => !status || d.status === status);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Panel title="Deliverables" actions={<Button size="sm" className="gap-1" onClick={() => setCreating(true)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New</Button>}>
        <select aria-label="Deliverable status" className={`${inputCls} mb-3 w-52`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="internal_review">Team review</option><option value="submitted">Awaiting the client</option><option value="revision_requested">Revision requested</option><option value="approved">Approved</option><option value="draft">Draft</option>
        </select>
        {rows.length === 0 ? <Empty title="No deliverable" /> : (
          <ul className="divide-y divide-border/60">{rows.map((d) => (
            <li key={d.id}><button type="button" onClick={() => { setCreating(false); const q = new URLSearchParams(params); q.set("id", d.id); setParams(q, { replace: true }); }} className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${selected?.id === d.id ? "bg-muted/60" : ""}`}>
              <span className="min-w-0"><span className="font-medium">{d.title}</span><span className="block text-xs text-muted-foreground">{projects.value?.find((p) => p.id === d.project_id)?.name ?? "Project"} · {brandName(d.brand_id)} · v{d.current_version}</span></span><StatusPill status={d.status} /></button></li>))}</ul>
        )}
      </Panel>
      {creating ? <NewDeliverable onDone={() => { setCreating(false); list.reload(); }} /> : selected ? <Detail key={selected.id} d={selected} onChanged={list.reload} /> : <Panel title="Deliverable"><Empty title="Choose a deliverable">Versions, files and decisions appear here.</Empty></Panel>}
    </div>
  );
};

export default Deliverables;
