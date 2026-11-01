import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Home, FolderKanban, FileSignature, ScrollText, PackageCheck, CheckCircle2, Receipt, MessagesSquare, Inbox, UserRound, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientOsApi, contractPdf, downloadBytes, fmtMoney, proposalPdf, REQUEST_CATEGORIES, type ClientHome, type PortalProject, type PortalVersion } from "@/services/clientOs";
import { autopilotApi, type UserNotification } from "@/services/autopilot";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { useSession } from "@/hooks/useSession";
import { PortalHeading, PortalShell } from "@/components/clientos/PortalShell";
import { ConversationsView } from "@/components/clientos/Conversations";
import { FileLink, Section, StatusPill, UploadButton, fmtDay, fmtWhen, useAction } from "@/components/clientos/shared";

// The Client Portal (docs/client-os.md section 7). Everything shown comes from portal_* database functions and tables
// whose access rules return only this person's authorized relationships; internal fields never reach the browser.

const CLIENT_WORDS: Record<string, string> = { submitted: "Waiting for your review", approved: "Approved", revision_requested: "Revision requested", rejected: "Rejected", sent: "Waiting for your decision", viewed: "Waiting for your decision", accepted: "Accepted", declined: "Declined" };
const pendingOf = (home: ClientHome) => (home.projects ?? []).flatMap((p) => (p.deliverables ?? []).filter((d) => d.status === "submitted").map((d) => ({ project: p, d })));

const Progress = ({ done, total }: { done: number; total: number }) => (
  <div className="flex items-center gap-2" aria-label={total ? `${done} of ${total} shared tasks done` : "No shared task"}>
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full bg-foreground/70 ${total ? "" : "w-0"}`} style={total ? { width: `${Math.round((100 * done) / total)}%` } : undefined} /></div>
    <span className="text-xs tabular-nums text-muted-foreground">{total ? `${done}/${total}` : "—"}</span>
  </div>
);

const VersionReview = ({ v, latest, onDone }: { v: PortalVersion; latest: boolean; onDone: () => void }) => {
  const a = useAction();
  const [comment, setComment] = useState("");
  const previewable = !!v.mime_type && /^(image\/|application\/pdf)/.test(v.mime_type);
  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2"><span className="font-medium">Version {v.version}</span><span className="text-xs text-muted-foreground">{fmtWhen(v.submitted_at)}</span>{v.review && <StatusPill status={v.review.decision} words={CLIENT_WORDS} />}</div>
      {v.note && <p className="mt-1 whitespace-pre-wrap">{v.note}</p>}
      <div className="mt-1 flex flex-wrap gap-3">
        {v.file_id && <FileLink fileId={v.file_id} name={`Download ${v.file_name ?? "file"}`} />}
        {v.file_id && previewable && <FileLink fileId={v.file_id} name="Preview" preview />}
        {v.link_url && <a className="underline" href={v.link_url} target="_blank" rel="noopener noreferrer">Open the link</a>}
      </div>
      {v.review?.comment && <p className="mt-1 text-xs text-muted-foreground">Your comment: {v.review.comment}</p>}
      {!v.review && latest && (
        <div className="mt-2 space-y-2">
          <textarea aria-label={`Comment on version ${v.version}`} className={`${inputCls} h-16 py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Your comments (needed to ask for a revision or to reject)" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={a.busy} onClick={() => void a.run(() => clientOsApi.review(v.id, "approved", comment || null), `Version ${v.version} approved.`).then((ok) => ok && onDone())}>Approve version {v.version}</Button>
            <Button size="sm" variant="outline" disabled={a.busy || !comment.trim()} onClick={() => void a.run(() => clientOsApi.review(v.id, "revision_requested", comment), "Revision requested; the team was told.").then((ok) => ok && onDone())}>Request a revision</Button>
            <Button size="sm" variant="ghost" disabled={a.busy || !comment.trim()} onClick={() => void a.run(() => clientOsApi.review(v.id, "rejected", comment), "Rejected; the team was told.").then((ok) => ok && onDone())}>Reject</Button>
          </div>
          <p className="text-xs text-muted-foreground">Your decision applies to version {v.version} only.</p>
        </div>
      )}
      {a.view}
    </li>
  );
};

const ProjectView = ({ id }: { id: string }) => {
  const p = useAsync(() => clientOsApi.portalProject(id), [id]);
  const [params] = useSearchParams();
  if (p.error) return <ErrorBox message="This project is not available to you." />;
  if (!p.value) return <LoadingGrid tiles={3} />;
  const pr: PortalProject = p.value;
  const focus = params.get("deliverable");
  return (
    <div className="space-y-6">
      <PortalHeading eyebrow={pr.brand} title={pr.name}><StatusPill status="active" words={{ active: pr.status }} /> {pr.deadline ? `· target ${fmtDay(pr.deadline)}` : ""}</PortalHeading>
      <div className="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Summary">
          {pr.summary ? <p className="whitespace-pre-wrap">{pr.summary}</p> : <p className="text-muted-foreground">The team has not written a summary yet.</p>}
          <div className="mt-3"><Progress done={pr.progress.done} total={pr.progress.total} /></div>
        </Panel>
        <Panel title="Your contact">
          <p>{pr.manager ?? "The project team"}</p>
          <p className="mt-1 text-xs text-muted-foreground">Started {fmtDay(pr.start_date)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" asChild><Link to="/portal/messages">Messages</Link></Button><Button size="sm" variant="outline" asChild><Link to={`/portal/requests?project=${pr.id}`}>New request</Link></Button></div>
        </Panel>
      </div>
      <Panel title="Deliverables">
        {!(pr.deliverables ?? []).length ? <Empty title="Nothing to review yet">You'll be notified here when something is ready.</Empty> : (
          <ul className="space-y-4">{pr.deliverables!.map((d) => (
            <li key={d.id} id={`d-${d.id}`} className={`space-y-2 ${focus === d.id ? "rounded-lg ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}>
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{d.title}</h3><StatusPill status={d.status} words={CLIENT_WORDS} />{d.due_date && <span className="text-xs text-muted-foreground">due {fmtDay(d.due_date)}</span>}</div>
              {d.description && <p className="text-muted-foreground">{d.description}</p>}
              <ol className="space-y-2">{d.versions.map((v, i) => <VersionReview key={v.id} v={v} latest={i === 0} onDone={p.reload} />)}</ol>
            </li>))}</ul>
        )}
      </Panel>
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Timeline">
          {pr.milestones.length === 0 ? <p className="text-muted-foreground">No milestone shared yet.</p> : <ol className="space-y-1">{pr.milestones.map((m) => <li key={m.id} className="flex items-center justify-between gap-2"><span>{m.completed ? <CheckCircle2 className="mr-1 inline h-4 w-4" aria-label="done" /> : null}{m.title}</span><span className="text-xs text-muted-foreground">{fmtDay(m.due_date)}</span></li>)}</ol>}
          {!!pr.stage_history?.length && <ol className="mt-3 space-y-0.5 border-t border-border pt-2 text-xs text-muted-foreground">{pr.stage_history.map((h, i) => <li key={i}>{fmtDay(h.at)}: {h.status}</li>)}</ol>}
        </Panel>
        <Panel title="Shared tasks">
          {pr.tasks.length === 0 ? <p className="text-muted-foreground">No task shared with you.</p> : <ul className="space-y-1">{pr.tasks.map((t) => <li key={t.id} className="flex items-center justify-between gap-2"><span>{t.title}</span><span className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDay(t.due_date)} <StatusPill status={t.status} /></span></li>)}</ul>}
        </Panel>
      </div>
      {!!pr.files?.length && <Panel title="Files"><ul className="space-y-1">{pr.files.map((f) => <li key={f.id}><FileLink fileId={f.id} name={f.name} /></li>)}</ul></Panel>}
    </div>
  );
};

const Overview = ({ home, reload }: { home: ClientHome; reload: () => void }) => {
  const notes = useAsync(() => autopilotApi.notifications(), []);
  const pending = pendingOf(home);
  const decide = (home.proposals ?? []).filter((p) => ["sent", "viewed"].includes(p.status));
  const contracts = (home.contracts ?? []).filter((c) => c.status === "sent");
  const due = (home.invoices ?? []).filter((i) => i.balance > 0);
  const milestones = (home.projects ?? []).flatMap((p) => p.milestones.filter((m) => !m.completed && m.due_date).map((m) => ({ ...m, project: p.name }))).sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? "")).slice(0, 5);
  return (
    <div className="space-y-6">
      <PortalHeading eyebrow="Welcome" title={home.memberships.map((m) => m.contact).filter((v, i, a) => a.indexOf(v) === i).join(" · ")}>Your projects with {home.memberships.map((m) => m.brand).join(", ")}</PortalHeading>
      {(pending.length > 0 || decide.length > 0 || contracts.length > 0) && (
        <Panel title="Waiting for you">
          <ul className="divide-y divide-border/60">
            {pending.map(({ project, d }) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="font-medium">{d.title}</span> · {project.name}</span><Button size="sm" asChild><Link to={`/portal/projects/${project.id}?deliverable=${d.id}`}>Review</Link></Button></li>)}
            {decide.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="font-medium">Proposal {p.reference}</span> · {p.title}</span><Button size="sm" asChild><Link to={`/portal/proposals?id=${p.id}`}>Open</Link></Button></li>)}
            {contracts.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="font-medium">Contract</span> · {c.title}</span><Button size="sm" asChild><Link to={`/portal/contracts?id=${c.id}`}>Review</Link></Button></li>)}
          </ul>
        </Panel>
      )}
      <Panel title="Your projects">
        {!(home.projects ?? []).length ? <Empty title="No project shared yet">The team adds your projects here.</Empty> : (
          <ul className="grid gap-3 md:grid-cols-2">{home.projects!.map((p) => (
            <li key={p.id}><Link to={`/portal/projects/${p.id}`} className="block rounded-lg border border-border p-3 transition-colors hover:border-foreground/30">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">{p.name}</span><Pill>{p.status}</Pill></div>
              <p className="mt-0.5 text-xs text-muted-foreground">{p.brand}{p.deadline ? ` · target ${fmtDay(p.deadline)}` : ""}</p>
              <div className="mt-2"><Progress done={p.progress.done} total={p.progress.total} /></div>
            </Link></li>))}</ul>
        )}
      </Panel>
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Upcoming milestones">{milestones.length === 0 ? <p className="text-muted-foreground">None scheduled.</p> : <ul className="space-y-1">{milestones.map((m) => <li key={m.id} className="flex justify-between gap-2"><span>{m.title} <span className="text-xs text-muted-foreground">· {m.project}</span></span><span className="text-xs">{fmtDay(m.due_date)}</span></li>)}</ul>}</Panel>
        <Panel title="Invoices to pay">{due.length === 0 ? <p className="text-muted-foreground">Nothing outstanding.</p> : <ul className="space-y-1">{due.map((i) => <li key={i.id} className="flex justify-between gap-2"><Link className="hover:underline" to="/portal/invoices">{i.number}</Link><span className="tabular-nums">{fmtMoney(i.balance, i.currency)}{i.due_date ? ` · due ${fmtDay(i.due_date)}` : ""}</span></li>)}</ul>}</Panel>
      </div>
      <Panel title="Recent updates" actions={notes.value?.some((n) => !n.read_at) ? <Button size="sm" variant="ghost" onClick={() => void autopilotApi.markRead("all").then(() => { notes.reload(); reload(); })}>Mark all as read</Button> : undefined}>
        {!notes.value ? <p className="text-muted-foreground">Loading…</p> : notes.value.length === 0 ? <p className="text-muted-foreground">No update yet.</p> : (
          <ul className="divide-y divide-border/60">{notes.value.slice(0, 12).map((n: UserNotification) => (
            <li key={n.id} className={`flex items-start justify-between gap-2 py-2 ${n.read_at ? "" : "font-medium"}`}>{n.link ? <Link className="hover:underline" to={n.link} onClick={() => { if (!n.read_at) void autopilotApi.markRead([n.id]); }}>{n.title}</Link> : <span>{n.title}</span>}<span className="shrink-0 text-xs font-normal text-muted-foreground">{fmtWhen(n.created_at)}</span></li>))}</ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Updates appear here only; no email is sent.</p>
      </Panel>
    </div>
  );
};

const Proposals = ({ home, reload }: { home: ClientHome; reload: () => void }) => {
  const [params, setParams] = useSearchParams();
  const id = params.get("id");
  const p = (home.proposals ?? []).find((x) => x.id === id);
  const snap = useAsync(() => (p ? clientOsApi.proposalVersion(p.id, p.version) : Promise.resolve(null)), [p?.id, p?.version]);
  const events = useAsync(() => (p ? clientOsApi.proposalEvents(p.id) : Promise.resolve([])), [p?.id, p?.status]);
  const a = useAction();
  const [note, setNote] = useState("");
  useEffect(() => { if (p && p.status === "sent") void clientOsApi.proposalViewed(p.id).catch(() => {}); }, [p?.id, p?.status]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!p) return (
    <div className="space-y-6"><PortalHeading title="Proposals" />
      <Panel title="Your proposals">{!(home.proposals ?? []).length ? <Empty title="No proposal yet" /> : (
        <ul className="divide-y divide-border/60">{home.proposals!.map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><button type="button" className="text-left hover:underline" onClick={() => setParams({ id: x.id })}><span className="font-medium">{x.reference} · {x.title}</span><span className="block text-xs text-muted-foreground">{x.brand} · {fmtMoney(x.total, x.currency)} · valid until {fmtDay(x.valid_until)}</span></button><StatusPill status={x.status} words={CLIENT_WORDS} /></li>)}</ul>
      )}</Panel></div>
  );
  const s = snap.value?.snapshot;
  const open = ["sent", "viewed"].includes(p.status);
  return (
    <div className="space-y-6">
      <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setParams({})}>← All proposals</button>
      <PortalHeading eyebrow={`${p.brand} · proposal ${p.reference} · version ${p.version}`} title={p.title}><StatusPill status={p.status} words={CLIENT_WORDS} /> · valid until {fmtDay(p.valid_until)}</PortalHeading>
      {!s ? <LoadingGrid tiles={2} /> : (
        <Panel title="Details" actions={<Button size="sm" variant="outline" className="gap-1" onClick={() => downloadBytes(`${s.reference}-v${p.version}.pdf`, proposalPdf(s, p.brand, home.memberships[0]?.contact ?? "", p.version))}><FileDown className="h-3.5 w-3.5" aria-hidden="true" /> PDF</Button>}>
          {s.summary && <p className="mb-3 whitespace-pre-wrap">{s.summary}</p>}
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th className="py-1 pr-2 font-normal">Item</th><th className="py-1 pr-2 text-right font-normal">Qty</th><th className="py-1 pr-2 text-right font-normal">Unit price</th><th className="py-1 text-right font-normal">Discount / tax</th></tr></thead>
            <tbody>{s.items.map((it, i) => <tr key={i} className="border-t border-border/60"><td className="py-1.5 pr-2">{it.description}</td><td className="py-1.5 pr-2 text-right tabular-nums">{it.quantity}</td><td className="py-1.5 pr-2 text-right tabular-nums">{fmtMoney(it.unit_price, s.currency)}</td><td className="py-1.5 text-right text-xs">{Number(it.discount_pct) ? `−${it.discount_pct}%` : "—"} / {Number(it.tax_pct) ? `${it.tax_pct}%` : "—"}</td></tr>)}</tbody></table></div>
          <dl className="mt-3 grid grid-cols-2 gap-1 text-sm md:w-80 md:ml-auto"><dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{fmtMoney(s.totals.subtotal, s.currency)}</dd><dt className="text-muted-foreground">Discount</dt><dd className="text-right tabular-nums">−{fmtMoney(s.totals.discount, s.currency)}</dd><dt className="text-muted-foreground">Tax</dt><dd className="text-right tabular-nums">{fmtMoney(s.totals.tax, s.currency)}</dd><dt className="font-semibold">Total</dt><dd className="text-right font-semibold tabular-nums">{fmtMoney(s.totals.total, s.currency)}</dd></dl>
          {s.payment_terms && <p className="mt-3"><span className="text-muted-foreground">Payment terms:</span> {s.payment_terms}</p>}
          {s.delivery_estimate && <p><span className="text-muted-foreground">Delivery:</span> {s.delivery_estimate}</p>}
          {s.terms && <details className="mt-2"><summary className="cursor-pointer text-muted-foreground">Terms and conditions</summary><p className="mt-1 whitespace-pre-wrap text-xs">{s.terms}</p></details>}
        </Panel>
      )}
      {open && (
        <Panel title="Your decision">
          <textarea aria-label="Note with your decision" className={`${inputCls} h-16 py-1.5`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="An optional note to the team" />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" disabled={a.busy} onClick={() => { if (window.confirm(`Accept version ${p.version} of this proposal (${fmtMoney(p.total, p.currency)})?`)) void a.run(() => clientOsApi.decideProposal(p.id, p.version, true, note || null), "Accepted. The team was told.").then((ok) => ok && reload()); }}>Accept version {p.version}</Button>
            <Button size="sm" variant="outline" disabled={a.busy} onClick={() => void a.run(() => clientOsApi.decideProposal(p.id, p.version, false, note || null), "Rejected. The team was told.").then((ok) => ok && reload())}>Reject</Button>
            <Button size="sm" variant="ghost" disabled={a.busy || !note.trim()} onClick={() => void a.run(() => clientOsApi.proposalComment(p.id, note), "Comment sent.").then(() => { setNote(""); events.reload(); })}>Only send a comment</Button>
          </div>
          {a.view}
        </Panel>
      )}
      <Panel title="History"><ol className="space-y-1 text-xs">{(events.value ?? []).filter((e) => e.kind !== "created").map((e) => <li key={e.id}><span className="text-muted-foreground">{fmtWhen(e.created_at)}</span> · {e.actor_kind === "client" ? "You" : "The team"} · {e.kind}{e.version ? ` (version ${e.version})` : ""}{e.body ? `: ${e.body}` : ""}</li>)}</ol></Panel>
    </div>
  );
};

const Contracts = ({ home, reload }: { home: ClientHome; reload: () => void }) => {
  const [params, setParams] = useSearchParams();
  const c = (home.contracts ?? []).find((x) => x.id === params.get("id"));
  const v = useAsync(() => (c ? clientOsApi.contractVersion(c.id, c.version) : Promise.resolve(null)), [c?.id, c?.version]);
  const a = useAction();
  const [note, setNote] = useState("");
  if (!c) return (
    <div className="space-y-6"><PortalHeading title="Contracts" />
      <Panel title="Your contracts">{!(home.contracts ?? []).length ? <Empty title="No contract yet" /> : <ul className="divide-y divide-border/60">{home.contracts!.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 py-2"><button type="button" className="text-left hover:underline" onClick={() => setParams({ id: x.id })}><span className="font-medium">{x.title}</span><span className="block text-xs text-muted-foreground">{x.brand} · version {x.version}</span></button><StatusPill status={x.status} words={CLIENT_WORDS} /></li>)}</ul>}</Panel></div>
  );
  return (
    <div className="space-y-6">
      <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setParams({})}>← All contracts</button>
      <PortalHeading eyebrow={`${c.brand} · version ${c.version}`} title={c.title}><StatusPill status={c.status} words={CLIENT_WORDS} /></PortalHeading>
      {!v.value ? <LoadingGrid tiles={2} /> : (
        <Panel title="Text" actions={<Button size="sm" variant="outline" className="gap-1" onClick={() => downloadBytes(`contract-v${v.value!.version}.pdf`, contractPdf(v.value!, c.brand, home.memberships[0]?.contact ?? ""))}><FileDown className="h-3.5 w-3.5" aria-hidden="true" /> PDF</Button>}>
          <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm">{v.value.body}</pre>
          <p className="mt-2 break-all text-[0.7rem] text-muted-foreground">Text fingerprint: {v.value.body_sha256}</p>
        </Panel>
      )}
      {c.status === "sent" && (
        <Panel title="Your decision">
          <p className="mb-2 text-xs text-muted-foreground">Approving records your decision on version {c.version}, with your account and the time. It is not an electronic signature.</p>
          <textarea aria-label="Note with your decision" className={`${inputCls} h-16 py-1.5`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" disabled={a.busy} onClick={() => void a.run(() => clientOsApi.decideContract(c.id, c.version, true, note || null), "Approved.").then((ok) => ok && reload())}>Approve version {c.version}</Button>
            <Button size="sm" variant="outline" disabled={a.busy} onClick={() => void a.run(() => clientOsApi.decideContract(c.id, c.version, false, note || null), "Declined; the team was told.").then((ok) => ok && reload())}>Decline</Button>
          </div>{a.view}
        </Panel>
      )}
    </div>
  );
};

const Approvals = ({ home }: { home: ClientHome }) => {
  const pending = pendingOf(home);
  const done = (home.projects ?? []).flatMap((p) => (p.deliverables ?? []).filter((d) => d.status !== "submitted").map((d) => ({ project: p, d })));
  return (
    <div className="space-y-6"><PortalHeading title="Approvals" />
      <Panel title="Waiting for your review">{pending.length === 0 ? <Empty title="Nothing to review" /> : <ul className="divide-y divide-border/60">{pending.map(({ project, d }) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><span className="font-medium">{d.title}</span> · version {d.versions[0]?.version} · {project.name}</span><Button size="sm" asChild><Link to={`/portal/projects/${project.id}?deliverable=${d.id}`}>Review</Link></Button></li>)}</ul>}</Panel>
      <Panel title="Decided">{done.length === 0 ? <p className="text-muted-foreground">No decision yet.</p> : <ul className="divide-y divide-border/60">{done.map(({ project, d }) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link className="hover:underline" to={`/portal/projects/${project.id}?deliverable=${d.id}`}>{d.title} · {project.name}</Link><StatusPill status={d.status} words={CLIENT_WORDS} /></li>)}</ul>}</Panel>
    </div>
  );
};

const Invoices = ({ home }: { home: ClientHome }) => (
  <div className="space-y-6"><PortalHeading title="Invoices">Online payment is not available in the portal; use the payment instructions on each invoice.</PortalHeading>
    {!(home.invoices ?? []).length ? <Panel title="Invoices"><Empty title="No invoice shared with you" /></Panel> : home.invoices!.map((i) => (
      <Panel key={i.id} title={`Invoice ${i.number}`} description={`${i.brand} · issued ${fmtDay(i.issue_date)}${i.due_date ? ` · due ${fmtDay(i.due_date)}` : ""}`} actions={<StatusPill status={i.balance <= 0 ? "approved" : i.due_date && i.due_date < new Date().toISOString().slice(0, 10) ? "expired" : "pending"} words={{ approved: "Paid", expired: "Overdue", pending: "To pay" }} />}>
        <dl className="grid grid-cols-3 gap-2 text-sm"><div><dt className="text-xs text-muted-foreground">Amount</dt><dd className="tabular-nums">{fmtMoney(i.amount, i.currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Paid</dt><dd className="tabular-nums">{fmtMoney(i.paid, i.currency)}</dd></div><div><dt className="text-xs text-muted-foreground">Balance</dt><dd className="font-semibold tabular-nums">{fmtMoney(i.balance, i.currency)}</dd></div></dl>
        {i.description && <p className="mt-2 text-muted-foreground">{i.description}</p>}
        {i.payments.length > 0 && <ul className="mt-2 text-xs text-muted-foreground">{i.payments.map((p, k) => <li key={k}>Payment {fmtMoney(p.amount, p.currency)} received {fmtDay(p.received_on)}</li>)}</ul>}
        {i.instructions && <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs"><span className="font-medium">How to pay:</span> {i.instructions}</p>}
      </Panel>
    ))}
  </div>
);

const Requests = ({ home, reload }: { home: ClientHome; reload: () => void }) => {
  const [params, setParams] = useSearchParams();
  const a = useAction();
  const [f, setF] = useState({ brand: home.memberships[0]?.brand_id ?? "", project: params.get("project") ?? "", category: "support", title: "", description: "" });
  const open = (home.requests ?? []).find((r) => r.id === params.get("id"));
  const events = useAsync(() => (open ? clientOsApi.requestEvents(open.id) : Promise.resolve([])), [open?.id]);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const projects = (home.projects ?? []).filter((p) => p.brand_id === f.brand);
  return (
    <div className="space-y-6"><PortalHeading title="Requests" />
      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Your requests">{!(home.requests ?? []).length ? <Empty title="No request yet" /> : <ul className="divide-y divide-border/60">{home.requests!.map((r) => <li key={r.id}><button type="button" onClick={() => setParams({ id: r.id })} className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${open?.id === r.id ? "bg-muted/60" : ""}`}><span><span className="font-medium">{r.title}</span><span className="block text-xs text-muted-foreground">{REQUEST_CATEGORIES[r.category]} · {fmtWhen(r.created_at)}{r.resolved_at ? ` · resolved ${fmtDay(r.resolved_at)}` : ""}</span></span><StatusPill status={r.status} /></button></li>)}</ul>}</Panel>
        {open ? (
          <Panel title={open.title} actions={<StatusPill status={open.status} />}>
            <ol className="space-y-2">{(events.value ?? []).map((e) => <li key={e.id} className="rounded-md border border-border p-2 text-xs"><span className="text-muted-foreground">{fmtWhen(e.created_at)} · {e.kind === "status" ? "status" : e.actor_id ? "message" : e.kind}</span>{e.body && <p className="mt-1 whitespace-pre-wrap text-sm">{e.kind === "status" ? `Now: ${e.body.replace(/_/g, " ")}` : e.body}</p>}{e.file_id && <FileLink fileId={e.file_id} name="Attachment" />}</li>)}</ol>
            {!["resolved", "closed"].includes(open.status) && <div className="mt-2 space-y-2"><textarea aria-label="Reply" className={`${inputCls} h-16 py-1.5`} value={reply} onChange={(e) => setReply(e.target.value)} />
              <div className="flex flex-wrap items-center gap-2"><UploadButton brandId={open.brand_id} projectId={open.project_id} purpose="request" onUploaded={(id) => setFile(id)} />{file && <Pill>file attached</Pill>}
                <Button size="sm" disabled={!reply.trim()} onClick={() => void a.run(() => clientOsApi.commentRequest(open.id, open.brand_id, reply, false, file), "Sent.").then((ok) => { if (ok) { setReply(""); setFile(null); events.reload(); } })}>Send</Button>
                <Button size="sm" variant="ghost" onClick={() => void a.run(() => clientOsApi.updateRequest(open.id, { status: "closed" }), "Closed.").then((ok) => ok && reload())}>Close the request</Button></div>{a.view}</div>}
          </Panel>
        ) : (
          <Panel title="New request">
            <div className="grid gap-2">
              {home.memberships.length > 1 && <Field label="With"><select aria-label="Brand" className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value, project: "" })}>{home.memberships.map((m) => <option key={m.id} value={m.brand_id}>{m.brand}</option>)}</select></Field>}
              <Field label="Type"><select aria-label="Request type" className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(REQUEST_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Project (optional)"><select aria-label="Request project" className={inputCls} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Title"><input className={inputCls} value={f.title} maxLength={200} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Details"><textarea className={`${inputCls} h-24 py-1.5`} value={f.description} maxLength={4000} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
              <div className="flex items-center gap-2"><Button size="sm" disabled={!f.title.trim() || a.busy} onClick={async () => { let id = ""; const ok = await a.run(async () => { id = await clientOsApi.createRequest(f.brand, f.project || null, f.category, f.title, f.description); }, "Request sent; the team was told."); if (ok) { setF({ ...f, title: "", description: "" }); reload(); setParams({ id }); } }}>Send the request</Button>{a.view}</div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};

const Profile = ({ home }: { home: ClientHome }) => {
  const { user } = useSession();
  const prefs = useAsync(() => (user ? autopilotApi.preferences(user.id) : Promise.resolve(null)), [user?.id]);
  const a = useAction();
  return (
    <div className="space-y-6"><PortalHeading title="Profile" />
      <Panel title="Your account"><p>{user?.email}</p><p className="mt-1 text-xs text-muted-foreground">You can sign in with a link sent to this address, or with a password if you set one.</p></Panel>
      <Panel title="Your relationships"><ul className="space-y-1">{home.memberships.map((m) => <li key={m.id}>{m.contact} with <span className="font-medium">{m.brand}</span></li>)}</ul><p className="mt-2 text-xs text-muted-foreground">To change who has access for your organization, ask the team.</p></Panel>
      {prefs.value && (
        <Panel title="Notifications">
          <label className="flex items-center gap-2"><input type="checkbox" checked={prefs.value.in_app} onChange={(e) => void a.run(() => autopilotApi.savePreferences({ ...prefs.value!, in_app: e.target.checked }), "Saved.").then(prefs.reload)} /> Show updates in the portal</label>
          <p className="mt-1 text-xs text-muted-foreground">No email is sent: updates appear in the portal only.</p>{a.view}
        </Panel>
      )}
    </div>
  );
};

const ClientPortal = () => {
  const { section = "", projectId } = useParams();
  const { user } = useSession();
  const home = useAsync(() => (user ? clientOsApi.clientHome() : Promise.resolve(null)), [user?.id]);
  const myMemberships = useAsync(() => (user ? clientOsApi.myMemberships() : Promise.resolve([])), [user?.id]);
  const pending = home.value ? pendingOf(home.value).length + (home.value.proposals ?? []).filter((p) => ["sent", "viewed"].includes(p.status)).length + (home.value.contracts ?? []).filter((c) => c.status === "sent").length : 0;
  const nav = [
    { to: "/portal", label: "Overview", icon: Home }, { to: "/portal/projects", label: "My projects", icon: FolderKanban },
    { to: "/portal/proposals", label: "Proposals", icon: FileSignature }, { to: "/portal/contracts", label: "Contracts", icon: ScrollText },
    { to: "/portal/deliverables", label: "Deliverables", icon: PackageCheck }, { to: "/portal/approvals", label: "Approvals", icon: CheckCircle2, badge: pending },
    { to: "/portal/invoices", label: "Invoices", icon: Receipt }, { to: "/portal/messages", label: "Messages", icon: MessagesSquare },
    { to: "/portal/requests", label: "Requests", icon: Inbox }, { to: "/portal/profile", label: "Profile", icon: UserRound },
  ];
  const known = ["", "projects", "proposals", "contracts", "deliverables", "approvals", "invoices", "messages", "requests", "profile"];
  if (!known.includes(section)) return <Navigate to="/portal" replace />;
  const h = home.value;
  const body = home.error ? <ErrorBox message={home.error} onRetry={home.reload} />
    : !user || !h ? <LoadingGrid />
    : h.memberships.length === 0 ? (
      <Panel title="No access yet"><p>This account has no active client access. Open the invitation link the team sent you while signed in with the invited email address, or ask the team for a new invitation.</p></Panel>
    ) : projectId ? <ProjectView id={projectId} />
    : section === "" ? <Overview home={h} reload={home.reload} />
    : section === "projects" ? (
      <div className="space-y-6"><PortalHeading title="My projects" /><Panel title="Projects">{!(h.projects ?? []).length ? <Empty title="No project shared yet" /> : <ul className="divide-y divide-border/60">{h.projects!.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 py-2"><Link className="hover:underline" to={`/portal/projects/${p.id}`}><span className="font-medium">{p.name}</span><span className="block text-xs text-muted-foreground">{p.brand} · {p.status}</span></Link><span className="w-32"><Progress done={p.progress.done} total={p.progress.total} /></span></li>)}</ul>}</Panel></div>
    )
    : section === "proposals" ? <Proposals home={h} reload={home.reload} />
    : section === "contracts" ? <Contracts home={h} reload={home.reload} />
    : section === "deliverables" ? (
      <div className="space-y-6"><PortalHeading title="Deliverables" />{(h.projects ?? []).map((p) => (
        <Panel key={p.id} title={p.name}>{!(p.deliverables ?? []).length ? <p className="text-muted-foreground">Nothing shared yet.</p> : <ul className="divide-y divide-border/60">{p.deliverables!.map((d) => <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link className="hover:underline" to={`/portal/projects/${p.id}?deliverable=${d.id}`}>{d.title} <span className="text-xs text-muted-foreground">· {d.versions.length} version{d.versions.length === 1 ? "" : "s"}</span></Link><StatusPill status={d.status} words={CLIENT_WORDS} /></li>)}</ul>}</Panel>))}</div>
    )
    : section === "approvals" ? <Approvals home={h} />
    : section === "invoices" ? <Invoices home={h} />
    : section === "messages" ? (
      <div className="space-y-6"><PortalHeading title="Messages" /><ConversationsView brandIds={h.memberships.map((m) => m.brand_id)} side="external" me={user.id}
        starters={{ brands: h.memberships.map((m) => ({ id: m.brand_id, name: m.brand })), projects: (h.projects ?? []).map((p) => ({ id: p.id, name: p.name, brand_id: p.brand_id })), contacts: (myMemberships.value ?? []).filter((m) => m.kind === "client" && m.status === "active").map((m) => ({ id: m.contact_id, name: "", brand_id: m.brand_id })), audiences: ["client"] }} /></div>
    )
    : section === "requests" ? <Requests home={h} reload={home.reload} />
    : <Profile home={h} />;
  return <PortalShell kind="client" nav={nav}>{body}</PortalShell>;
};

export default ClientPortal;
