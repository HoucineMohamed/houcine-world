import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clientOsApi, type ProjectRow } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { FileLink, Section, StatusPill, UploadButton, fmtDay, fmtWhen, useAction } from "../shared";

// Project workspace (internal): lifecycle stage (with its rules), the client-facing summary, who outside the team takes
// part (clients see the client view; partners a project or only their tasks), task visibility, files and history.
// Projects themselves are the Command Center's: created there or from an accepted proposal.

const ProjectDetail = ({ p, onChanged }: { p: ProjectRow; onChanged: () => void }) => {
  const { brandName } = useClientOs();
  const ids = [p.brand_id];
  const lifecycles = useAsync(() => clientOsApi.lifecycles(), []);
  const stages = useAsync(() => clientOsApi.stages(), []);
  const history = useAsync(() => clientOsApi.stageHistory(p.id), [p.id, p.stage_key]);
  const participants = useAsync(() => clientOsApi.participants(ids), [p.id]);
  const memberships = useAsync(() => clientOsApi.memberships(ids), [p.id]);
  const rels = useAsync(() => clientOsApi.relationships(ids, ["client", "prospect", "partner"]), [p.id]);
  const tasks = useAsync(() => clientOsApi.tasks(p.id), [p.id]);
  const assignments = useAsync(() => clientOsApi.taskAssignments(ids), [p.id]);
  const files = useAsync(() => clientOsApi.files(ids), [p.id]);
  const a = useAction();
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState(p.client_summary ?? "");
  const [add, setAdd] = useState({ membership: "", scope: "project", expires: "" });
  const lifecycleId = p.lifecycle_id ?? lifecycles.value?.find((l) => l.brand_id === p.brand_id && l.is_default)?.id ?? lifecycles.value?.find((l) => !l.brand_id && l.is_default)?.id;
  const myStages = (stages.value ?? []).filter((s) => s.lifecycle_id === lifecycleId);
  const current = myStages.find((s) => s.key === p.stage_key);
  const contactName = (cid: string) => rels.value?.find((r) => r.contact_id === cid)?.contact?.name ?? "Contact";
  const pp = (participants.value ?? []).filter((x) => x.project_id === p.id);
  const eligible = (memberships.value ?? []).filter((m) => m.status === "active" && (m.kind === "partner" || m.contact_id === p.client_contact_id) && !pp.some((x) => x.membership_id === m.id && x.status === "active"));
  const partners = (memberships.value ?? []).filter((m) => m.kind === "partner" && m.status === "active");
  const reload = () => { participants.reload(); assignments.reload(); tasks.reload(); history.reload(); files.reload(); onChanged(); };

  return (
    <Panel title={p.name} description={`${brandName(p.brand_id)} · ${p.status} · deadline ${fmtDay(p.deadline)}`} actions={<Link className="text-xs text-muted-foreground hover:underline" to={`/workspace/command/projects?id=${p.id}`}>Command Center</Link>}>
      <div className="space-y-5">
        <Section title="Stage">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={`Lifecycle: ${lifecycles.value?.find((l) => l.id === lifecycleId)?.name ?? "default"}`} className="w-56">
              <select aria-label="Lifecycle" className={inputCls} value={p.lifecycle_id ?? ""} onChange={(e) => void a.run(() => clientOsApi.updateProject(p.id, { lifecycle_id: e.target.value || null }), "Lifecycle changed.").then(reload)}>
                <option value="">Brand or global default</option>
                {(lifecycles.value ?? []).filter((l) => !l.brand_id || l.brand_id === p.brand_id).map((l) => <option key={l.id} value={l.id}>{l.name}{l.project_type ? ` (${l.project_type})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Move to" className="w-52">
              <select aria-label="Stage" className={inputCls} value="" onChange={(e) => { const v = e.target.value; if (v) void a.run(() => clientOsApi.setStage(p.id, v, note || null), "Stage changed.").then((ok) => { if (ok) { setNote(""); reload(); } }); }}>
                <option value="">{current ? `${current.label} (now)` : "Not started"}</option>
                {myStages.filter((s) => s.key !== p.stage_key && (!current || current.allowed_next.length === 0 || current.allowed_next.includes(s.key))).map((s) => <option key={s.id} value={s.key}>{s.label}{s.requires.length ? " *" : ""}</option>)}
              </select>
            </Field>
            <Field label="Note (optional)" className="min-w-[12rem] flex-1"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
          <p className="text-xs text-muted-foreground">The client sees: <span className="font-medium text-foreground">{current ? current.client_label ?? current.label : "Getting started"}</span>. * has conditions, checked when moving.</p>
          {!!history.value?.length && <ol className="mt-1 space-y-0.5 text-xs text-muted-foreground">{history.value.map((h) => <li key={h.id}>{fmtWhen(h.created_at)}: {h.from_stage ?? "start"} → {h.to_stage}{h.note ? ` · ${h.note}` : ""}</li>)}</ol>}
        </Section>
        <Section title="Summary shown to the client">
          <textarea aria-label="Client summary" className={`${inputCls} h-20 py-1.5`} maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What the client reads on their project page (the internal description stays internal)." />
          <Button size="sm" variant="outline" onClick={() => void a.run(() => clientOsApi.updateProject(p.id, { client_summary: summary || null }), "Summary saved.")}>Save summary</Button>
        </Section>
        <Section title="People outside the team">
          {pp.length === 0 ? <p className="text-xs text-muted-foreground">Nobody outside the team sees this project.</p> : (
            <ul className="space-y-1">{pp.map((x) => {
              const m = memberships.value?.find((y) => y.id === x.membership_id);
              return (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span><Pill>{m?.kind ?? "member"}</Pill> {m ? contactName(m.contact_id) : "Member"} · {x.scope === "tasks" ? "assigned tasks only" : "project view"}{x.expires_at ? ` · until ${fmtDay(x.expires_at)}` : ""}</span>
                  <span className="flex items-center gap-2"><StatusPill status={x.status} />{x.status === "active" && <Button size="sm" variant="ghost" onClick={() => void a.run(() => clientOsApi.revokeParticipant(x.id), "Access to the project removed.").then(reload)}>Remove</Button>}</span>
                </li>
              );
            })}</ul>
          )}
          {eligible.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Add" className="w-56"><select aria-label="Add a person" className={inputCls} value={add.membership} onChange={(e) => setAdd({ ...add, membership: e.target.value })}><option value="">Choose…</option>{eligible.map((m) => <option key={m.id} value={m.id}>{contactName(m.contact_id)} ({m.kind})</option>)}</select></Field>
              {memberships.value?.find((m) => m.id === add.membership)?.kind === "partner" && <Field label="Sees" className="w-44"><select aria-label="Scope" className={inputCls} value={add.scope} onChange={(e) => setAdd({ ...add, scope: e.target.value })}><option value="project">The project</option><option value="tasks">Only assigned tasks</option></select></Field>}
              <Field label="Until (optional)" className="w-40"><input type="date" className={inputCls} value={add.expires} onChange={(e) => setAdd({ ...add, expires: e.target.value })} /></Field>
              <Button size="sm" disabled={!add.membership} onClick={() => void a.run(() => clientOsApi.addParticipant(p.id, p.brand_id, add.membership, add.scope, add.expires ? new Date(`${add.expires}T23:59:59`).toISOString() : null), "Added to the project.").then((ok) => { if (ok) { setAdd({ membership: "", scope: "project", expires: "" }); reload(); } })}>Add</Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Only people who accepted an invitation can be added (Clients / Partners).</p>
        </Section>
        <Section title="Tasks">
          {!tasks.value?.length ? <p className="text-xs text-muted-foreground">No task. Tasks are managed in the Command Center.</p> : (
            <ul className="divide-y divide-border/60">{tasks.value.map((t) => {
              const asg = (assignments.value ?? []).filter((x) => x.task_id === t.id && x.status === "active");
              return (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-xs">
                  <span className="min-w-0"><span className="text-sm">{t.title}</span> · {t.status} · {fmtDay(t.due_date)}{asg.length ? ` · partner: ${asg.map((x) => contactName(memberships.value?.find((m) => m.id === x.membership_id)?.contact_id ?? "")).join(", ")}` : ""}</span>
                  <span className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={t.client_visible} onChange={(e) => void a.run(() => clientOsApi.setTaskVisible(t.id, e.target.checked), e.target.checked ? "The client now sees this task." : "Task hidden from the client.").then(reload)} /> client sees it</label>
                    {partners.length > 0 && <select aria-label={`Assign ${t.title} to a partner`} className="h-7 rounded-md border border-input bg-background px-1 text-xs" value="" onChange={(e) => { const m = e.target.value; if (m) void a.run(() => clientOsApi.assignTask(t.id, p.id, p.brand_id, m, true, null), "Task assigned to the partner.").then(reload); }}>
                      <option value="">Assign to partner…</option>{partners.filter((m) => !asg.some((x) => x.membership_id === m.id)).map((m) => <option key={m.id} value={m.id}>{contactName(m.contact_id)}</option>)}
                    </select>}
                    {asg.map((x) => <Button key={x.id} size="sm" variant="ghost" className="h-7" onClick={() => void a.run(() => clientOsApi.unassignTask(x.id), "Partner unassigned.").then(reload)}>Unassign</Button>)}
                  </span>
                </li>
              );
            })}</ul>
          )}
        </Section>
        <Section title="Project files" actions={<UploadButton brandId={p.brand_id} projectId={p.id} purpose="project" audience="client" label="Add a file for the client" onUploaded={() => files.reload()} />}>
          {(files.value ?? []).filter((f) => f.project_id === p.id).length === 0 ? <p className="text-xs text-muted-foreground">No file. Files are private; the client sees files added as client files, partners only files shared with them.</p> : (
            <ul className="space-y-1">{(files.value ?? []).filter((f) => f.project_id === p.id).map((f) => <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><FileLink fileId={f.id} name={f.file_name} /><span className="flex items-center gap-2">{f.purpose} · {f.audience} {f.status === "ready" && <Button size="sm" variant="ghost" className="h-7" onClick={() => void a.run(() => clientOsApi.revokeFile(f.id), "File access revoked.").then(reload)}>Revoke</Button>}</span></li>)}</ul>
          )}
        </Section>
        {a.view}
      </div>
    </Panel>
  );
};

const Projects = () => {
  const { brandIds, brandName } = useClientOs();
  const [params, setParams] = useSearchParams();
  const projects = useAsync(() => clientOsApi.projects(brandIds), [JSON.stringify(brandIds)]);
  const participants = useAsync(() => clientOsApi.participants(brandIds), [JSON.stringify(brandIds)]);
  const [status, setStatus] = useState("");
  if (projects.error) return <ErrorBox message={projects.error} onRetry={projects.reload} />;
  if (!projects.value) return <LoadingGrid tiles={4} />;
  const today = new Date().toISOString().slice(0, 10);
  const list = projects.value.filter((p) => !status || (status === "delayed" ? p.deadline && p.deadline < today && !["completed", "cancelled"].includes(p.status) : p.status === status));
  const selected = projects.value.find((p) => p.id === params.get("id"));
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <Panel title="Projects" description="The Command Center's projects, with their client-side participation">
        <select aria-label="Project status" className={`${inputCls} mb-3 w-48`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="active">Active</option><option value="planned">Planned</option><option value="on_hold">On hold</option><option value="delayed">Delayed</option><option value="completed">Completed</option>
        </select>
        {list.length === 0 ? <Empty title="No project" /> : (
          <ul className="divide-y divide-border/60">{list.map((p) => {
            const n = (participants.value ?? []).filter((x) => x.project_id === p.id && x.status === "active").length;
            return (
              <li key={p.id}><button type="button" onClick={() => { const q = new URLSearchParams(params); q.set("id", p.id); setParams(q, { replace: true }); }} aria-current={selected?.id === p.id ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${selected?.id === p.id ? "bg-muted/60" : ""}`}>
                <span className="min-w-0"><span className="font-medium">{p.name}</span><span className="block text-xs text-muted-foreground">{brandName(p.brand_id)} · {p.stage_key?.replace(/_/g, " ") ?? "no stage"} · deadline {fmtDay(p.deadline)}{n ? ` · ${n} external` : ""}</span></span>
                <StatusPill status={p.status} /></button></li>
            );
          })}</ul>
        )}
      </Panel>
      {selected ? <ProjectDetail key={selected.id} p={selected} onChanged={() => { projects.reload(); participants.reload(); }} /> : <Panel title="Project workspace"><Empty title="Choose a project">Stage, client view, participants, tasks and files appear here.</Empty></Panel>}
    </div>
  );
};

export default Projects;
