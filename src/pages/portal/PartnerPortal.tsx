import React, { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Home, Handshake, ListChecks, FolderOpen, ScrollText, MessagesSquare, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientOsApi, type PartnerHome } from "@/services/clientOs";
import { autopilotApi } from "@/services/autopilot";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useSession } from "@/hooks/useSession";
import { PortalHeading, PortalShell } from "@/components/clientos/PortalShell";
import { ConversationsView } from "@/components/clientos/Conversations";
import { FileLink, StatusPill, UploadButton, fmtDay, fmtWhen, useAction } from "@/components/clientos/shared";

// The Partner Portal (docs/client-os.md section 8): only what was explicitly assigned or shared — collaborations,
// tasks, files, agreements, project messages. Never client finances or internal records.

const Submit = ({ deliverableId, brandId, projectId, onDone }: { deliverableId: string; brandId: string; projectId: string; onDone: () => void }) => {
  const a = useAction();
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  return (
    <div className="mt-2 space-y-2 rounded-md border border-border p-2">
      <textarea aria-label="What you are submitting" className={`${inputCls} h-14 py-1.5`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you are submitting" />
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Link (https, optional)" className="min-w-[12rem] flex-1"><input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} /></Field>
        <UploadButton brandId={brandId} projectId={projectId} purpose="deliverable" onUploaded={(id, name) => setFile({ id, name })} />
        {file && <Pill>{file.name}</Pill>}
        <Button size="sm" disabled={a.busy || (!note.trim() && !link.trim() && !file)} onClick={() => void a.run(() => clientOsApi.submitVersion(deliverableId, note, file?.id ?? null, link.trim() || null), "Submitted to the team for review.").then((ok) => { if (ok) { setNote(""); setLink(""); setFile(null); onDone(); } })}>Submit</Button>
      </div>
      {a.view}
      <p className="text-xs text-muted-foreground">The team reviews your work before anything reaches the client.</p>
    </div>
  );
};

const Tasks = ({ home, reload }: { home: PartnerHome; reload: () => void }) => {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="space-y-6"><PortalHeading title="Assigned tasks" />
      {done && <p role="status" className="rounded-md border border-border bg-muted/40 p-2">{done}</p>}
      {!(home.tasks ?? []).length ? <Panel title="Tasks"><Empty title="No task assigned to you" /></Panel> : home.tasks!.map((t) => (
        <Panel key={t.id} title={t.title} description={`${t.project} · due ${fmtDay(t.due_date)}${t.expires_at ? ` · access until ${fmtDay(t.expires_at)}` : ""}`} actions={<StatusPill status={t.status} />}>
          {t.deliverables.length === 0 ? <p className="text-muted-foreground">No deliverable expected from you on this task.</p> : (
            <ul className="space-y-2">{t.deliverables.map((d) => (
              <li key={d.id}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span><span className="font-medium">{d.title}</span> <span className="text-xs text-muted-foreground">· {d.current_version} version{d.current_version === 1 ? "" : "s"}</span></span><StatusPill status={d.status} /></div>
                {t.can_submit && d.status !== "approved" && (open === d.id ? <Submit deliverableId={d.id} brandId={t.brand_id} projectId={t.project_id} onDone={() => { setOpen(null); setDone("Submitted to the team for review."); reload(); }} /> : <Button size="sm" variant="outline" className="mt-1" onClick={() => setOpen(d.id)}>Submit work</Button>)}
              </li>))}</ul>
          )}
        </Panel>
      ))}
    </div>
  );
};

const Agreements = ({ home }: { home: PartnerHome }) => {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const doc = useAsync(() => (id ? clientOsApi.partnerAgreement(id) : Promise.resolve(null)), [id]);
  return (
    <div className="space-y-6"><PortalHeading title="Agreements" />
      <Panel title="Your agreements">{!(home.agreements ?? []).length ? <Empty title="No agreement shared" /> : <ul className="divide-y divide-border/60">{home.agreements!.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 py-2"><button type="button" className="hover:underline" onClick={() => setParams({ id: a.id })}>{a.title} · version {a.version}</button><StatusPill status={a.status} /></li>)}</ul>}</Panel>
      {doc.value && <Panel title={doc.value.title}><pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans">{doc.value.body}</pre><p className="mt-2 break-all text-[0.7rem] text-muted-foreground">Text fingerprint: {doc.value.body_sha256}</p></Panel>}
    </div>
  );
};

const PartnerPortal = () => {
  const { section = "" } = useParams();
  const { user } = useSession();
  const home = useAsync(() => (user ? clientOsApi.partnerHome() : Promise.resolve(null)), [user?.id]);
  const notes = useAsync(() => (user ? autopilotApi.notifications() : Promise.resolve([])), [user?.id]);
  const nav = [
    { to: "/partners", label: "Overview", icon: Home }, { to: "/partners/collaborations", label: "Collaborations", icon: Handshake },
    { to: "/partners/tasks", label: "Assigned tasks", icon: ListChecks, badge: home.value?.tasks?.filter((t) => t.status !== "done").length }, { to: "/partners/files", label: "Shared files", icon: FolderOpen },
    { to: "/partners/agreements", label: "Agreements", icon: ScrollText }, { to: "/partners/messages", label: "Messages", icon: MessagesSquare }, { to: "/partners/profile", label: "Profile", icon: UserRound },
  ];
  if (!["", "collaborations", "tasks", "files", "agreements", "messages", "profile"].includes(section)) return <Navigate to="/partners" replace />;
  const h = home.value;
  const projects = [...(h?.collaborations ?? []).map((c) => ({ id: c.project_id, name: c.name, brand_id: c.brand_id })), ...(h?.tasks ?? []).map((t) => ({ id: t.project_id, name: t.project, brand_id: t.brand_id }))].filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i);
  const body = home.error ? <ErrorBox message={home.error} onRetry={home.reload} />
    : !user || !h ? <LoadingGrid />
    : h.memberships.length === 0 ? <Panel title="No access yet"><p>This account has no active partner access. Open the invitation link you received while signed in with the invited email address.</p></Panel>
    : section === "" ? (
      <div className="space-y-6">
        <PortalHeading eyebrow="Partner" title={h.memberships.map((m) => m.contact).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}>Working with {h.memberships.map((m) => m.brand).join(", ")}</PortalHeading>
        <div className="grid gap-5 md:grid-cols-2">
          <Panel title="Next deadlines">{!(h.tasks ?? []).length ? <p className="text-muted-foreground">No task assigned.</p> : <ul className="space-y-1">{[...h.tasks!].filter((t) => t.status !== "done").slice(0, 6).map((t) => <li key={t.id} className="flex justify-between gap-2"><Link className="hover:underline" to="/partners/tasks">{t.title} <span className="text-xs text-muted-foreground">· {t.project}</span></Link><span className="text-xs">{fmtDay(t.due_date)}</span></li>)}</ul>}</Panel>
          <Panel title="Recently shared files">{!(h.files ?? []).length ? <p className="text-muted-foreground">No file shared.</p> : <ul className="space-y-1">{h.files!.slice(0, 6).map((f) => <li key={f.id}><FileLink fileId={f.id} name={f.name} /></li>)}</ul>}</Panel>
        </div>
        <Panel title="Updates">{!notes.value?.length ? <p className="text-muted-foreground">No update yet.</p> : <ul className="divide-y divide-border/60">{notes.value.slice(0, 10).map((n) => <li key={n.id} className="flex justify-between gap-2 py-2">{n.link ? <Link className="hover:underline" to={n.link}>{n.title}</Link> : <span>{n.title}</span>}<span className="text-xs text-muted-foreground">{fmtWhen(n.created_at)}</span></li>)}</ul>}<p className="mt-2 text-xs text-muted-foreground">Updates appear here only; no email is sent.</p></Panel>
      </div>
    )
    : section === "collaborations" ? (
      <div className="space-y-6"><PortalHeading title="Collaborations" /><Panel title="Projects you work on">{!(h.collaborations ?? []).length && !(h.tasks ?? []).length ? <Empty title="No collaboration yet" /> : (
        <ul className="divide-y divide-border/60">{(h.collaborations ?? []).map((c) => <li key={c.project_id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="font-medium">{c.name}</span><span className="block text-xs text-muted-foreground">{c.brand} · {c.scope === "tasks" ? "your tasks only" : "project view"}{c.deadline ? ` · deadline ${fmtDay(c.deadline)}` : ""}{c.expires_at ? ` · access until ${fmtDay(c.expires_at)}` : ""}</span></span></li>)}
          {projects.filter((p) => !(h.collaborations ?? []).some((c) => c.project_id === p.id)).map((p) => <li key={p.id} className="py-2"><span className="font-medium">{p.name}</span> <span className="text-xs text-muted-foreground">· assigned tasks only</span></li>)}</ul>)}</Panel></div>
    )
    : section === "tasks" ? <Tasks home={h} reload={home.reload} />
    : section === "files" ? (
      <div className="space-y-6"><PortalHeading title="Shared files">Links are valid for 60 seconds and are created only for files shared with you.</PortalHeading><Panel title="Files">{!(h.files ?? []).length ? <Empty title="No file shared with you" /> : <ul className="divide-y divide-border/60">{h.files!.map((f) => <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><FileLink fileId={f.id} name={f.name} /><span className="text-xs text-muted-foreground">shared {fmtDay(f.shared_at)}{f.expires_at ? ` · until ${fmtDay(f.expires_at)}` : ""}</span></li>)}</ul>}</Panel></div>
    )
    : section === "agreements" ? <Agreements home={h} />
    : section === "messages" ? (
      <div className="space-y-6"><PortalHeading title="Messages" />{projects.length === 0 ? <Panel title="Messages"><Empty title="No project to talk about yet" /></Panel> : <ConversationsView brandIds={h.memberships.map((m) => m.brand_id)} side="external" me={user.id} starters={{ brands: h.memberships.map((m) => ({ id: m.brand_id, name: m.brand })), projects, audiences: ["partner"] }} />}</div>
    )
    : <div className="space-y-6"><PortalHeading title="Profile" /><Panel title="Your account"><p>{user.email}</p></Panel><Panel title="Your partnerships"><ul>{h.memberships.map((m) => <li key={m.id}>{m.contact} with <span className="font-medium">{m.brand}</span></li>)}</ul></Panel></div>;
  return <PortalShell kind="partner" nav={nav}>{body}</PortalShell>;
};

export default PartnerPortal;
