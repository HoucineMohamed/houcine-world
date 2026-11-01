import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientOsApi, fmtMoney, type Relationship } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel } from "@/components/command/ui";
import { useClientOs } from "@/pages/workspace/clients/ClientOS";
import { Section, StatusPill, fmtDay, fmtWhen, useAction } from "../shared";

// Clients and partners: the Command Center's contacts and brand relationships (one identity, many brands), plus what
// Client OS adds: external access (memberships), invitations, and the invoices a client may see.
// New contacts are created in the Command Center CRM; nothing here duplicates a contact.

const Detail = ({ rel, kind, onChanged }: { rel: Relationship; kind: "client" | "partner"; onChanged: () => void }) => {
  const { brandName } = useClientOs();
  const ids = [rel.brand_id];
  const memberships = useAsync(() => clientOsApi.memberships(ids), [rel.id]);
  const invitations = useAsync(() => clientOsApi.invitations(ids), [rel.id]);
  const projects = useAsync(() => clientOsApi.projects(ids), [rel.id]);
  const invoices = useAsync(() => (kind === "client" ? clientOsApi.invoices(ids) : Promise.resolve([])), [rel.id]);
  const shares = useAsync(() => (kind === "client" ? clientOsApi.invoiceShares(ids) : Promise.resolve([])), [rel.id]);
  const profiles = useAsync(async () => clientOsApi.profiles((memberships.value ?? []).map((m) => m.user_id)), [memberships.value]);
  const a = useAction();
  const [email, setEmail] = useState(rel.contact?.email ?? "");
  const [days, setDays] = useState(7);
  const [picked, setPicked] = useState<string[]>([]);
  const [link, setLink] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const mine = (memberships.value ?? []).filter((m) => m.contact_id === rel.contact_id && m.kind === kind);
  const invs = (invitations.value ?? []).filter((i) => i.contact_id === rel.contact_id && i.kind === kind);
  const clientProjects = (projects.value ?? []).filter((p) => kind === "partner" || p.client_contact_id === rel.contact_id);
  const myInvoices = (invoices.value ?? []).filter((i) => i.contact_id === rel.contact_id);
  const reload = () => { memberships.reload(); invitations.reload(); shares.reload(); onChanged(); };

  const invite = async () => {
    setLink(null);
    let token = "";
    const ok = await a.run(async () => { token = (await clientOsApi.invite(kind, rel.brand_id, rel.contact_id, email, kind === "client" ? picked : [], days)).token; }, "Invitation created. Copy the link now: it is shown only once.");
    if (ok) { setLink(`${window.location.origin}/portal/invite#token=${token}`); reload(); }
  };

  return (
    <Panel title={rel.contact?.name ?? "Contact"} description={`${brandName(rel.brand_id)} · ${rel.status}${rel.became_client_at ? ` since ${fmtDay(rel.became_client_at)}` : ""}`}>
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">{rel.contact?.email ?? "No email"} · {rel.contact?.kind} · <Link className="underline" to={`/workspace/command/crm?id=${rel.contact_id}`}>Open in the Command Center</Link></p>
        <Section title="Portal access">
          {!memberships.value ? <p className="text-xs text-muted-foreground">Loading…</p> : mine.length === 0 ? <p className="text-xs text-muted-foreground">No one has access yet. Access starts only when an invitation is accepted.</p> : (
            <ul className="space-y-2">{mine.map((m) => {
              const p = profiles.value?.find((x) => x.id === m.user_id);
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2">
                  <span><span className="font-medium">{p?.full_name || p?.email || "Portal user"}</span> <span className="text-xs text-muted-foreground">{p?.email} · since {fmtDay(m.created_at)}</span></span>
                  <span className="flex items-center gap-2"><StatusPill status={m.status} />
                    {m.status === "active" && <Button size="sm" variant="outline" disabled={a.busy} onClick={() => void a.run(() => clientOsApi.setMembershipStatus(m.id, "suspended"), "Access suspended.").then(reload)}>Suspend</Button>}
                    {m.status === "suspended" && <Button size="sm" variant="outline" disabled={a.busy} onClick={() => void a.run(() => clientOsApi.setMembershipStatus(m.id, "active"), "Access restored.").then(reload)}>Restore</Button>}
                    {m.status !== "revoked" && <Button size="sm" variant="ghost" disabled={a.busy} onClick={() => { if (window.confirm("Revoke this access for good? A new invitation will be needed.")) void a.run(() => clientOsApi.setMembershipStatus(m.id, "revoked"), "Access revoked.").then(reload); }}>Revoke</Button>}
                  </span>
                </li>
              );
            })}</ul>
          )}
        </Section>
        <Section title={`Invite to the ${kind} portal`}>
          <div className="grid gap-2 md:grid-cols-[1fr_120px]">
            <Field label="Email address (they must sign in with it)"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Valid for (days)"><input className={inputCls} type="number" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
          </div>
          {kind === "client" && clientProjects.length > 0 && (
            <fieldset className="mt-2"><legend className="mb-1 text-xs text-muted-foreground">Projects they will see</legend>
              <div className="flex flex-wrap gap-3">{clientProjects.map((p) => <label key={p.id} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={picked.includes(p.id)} onChange={() => setPicked((x) => (x.includes(p.id) ? x.filter((y) => y !== p.id) : [...x, p.id]))} /> {p.name}</label>)}</div>
            </fieldset>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" onClick={() => void invite()} disabled={a.busy || !email}>Create invitation</Button>{a.view}</div>
          {link && (
            <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs">
              <p className="mb-1">No email provider is configured, so nothing was emailed. Send this link yourself (it works once, for the invited address only):</p>
              <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all">{link}</code><Button size="sm" variant="outline" className="gap-1" onClick={() => void navigator.clipboard.writeText(link)}><Copy className="h-3.5 w-3.5" aria-hidden="true" /> Copy</Button></div>
            </div>
          )}
          {invs.length > 0 && (
            <ul className="mt-3 divide-y divide-border/60 text-xs">{invs.map((i) => {
              const expired = i.status === "pending" && new Date(i.expires_at) < new Date();
              return (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span>{i.email} · created {fmtWhen(i.created_at)} · {i.status === "accepted" ? `accepted ${fmtWhen(i.accepted_at)}` : `expires ${fmtWhen(i.expires_at)}`}</span>
                  <span className="flex items-center gap-2"><StatusPill status={expired ? "expired" : i.status} />{i.status === "pending" && !expired && <Button size="sm" variant="ghost" onClick={() => void a.run(() => clientOsApi.revokeInvitation(i.id), "Invitation withdrawn.").then(reload)}>Withdraw</Button>}</span>
                </li>
              );
            })}</ul>
          )}
        </Section>
        {kind === "client" && (
          <Section title="Invoices the client can see">
            {myInvoices.length === 0 ? <p className="text-xs text-muted-foreground">No invoice for this client in the Command Center.</p> : (
              <>
                <Field label="Payment instructions shown with a shared invoice (optional)"><input className={inputCls} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. bank transfer details" /></Field>
                <ul className="mt-2 divide-y divide-border/60">{myInvoices.map((i) => {
                  const shared = shares.value?.find((s) => s.invoice_id === i.id && !s.revoked_at);
                  return (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                      <span>{i.number} · {fmtMoney(i.amount, i.currency)} · {fmtDay(i.issue_date)} <StatusPill status={i.status} /></span>
                      {shared ? <Button size="sm" variant="outline" onClick={() => void a.run(() => clientOsApi.shareInvoice(i.id, false, null), "The client no longer sees this invoice.").then(reload)}>Hide from client</Button>
                        : <Button size="sm" variant="outline" disabled={i.status !== "sent"} title={i.status !== "sent" ? "Only a sent invoice can be shown" : undefined} onClick={() => void a.run(() => clientOsApi.shareInvoice(i.id, true, instructions || null), "The client can now see this invoice.").then(reload)}>Show to client</Button>}
                    </li>
                  );
                })}</ul>
              </>
            )}
          </Section>
        )}
      </div>
    </Panel>
  );
};

const Relationships = () => {
  const { section } = useParams();
  const kind = section === "partners" ? "partner" : "client";
  const { brandIds, brandName } = useClientOs();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const statuses = kind === "client" ? ["client", "prospect"] : ["partner"];
  const rels = useAsync(() => clientOsApi.relationships(brandIds, statuses), [JSON.stringify(brandIds), kind]);
  const memberships = useAsync(() => clientOsApi.memberships(brandIds), [JSON.stringify(brandIds)]);
  if (rels.error) return <ErrorBox message={rels.error} onRetry={rels.reload} />;
  if (!rels.value) return <LoadingGrid tiles={4} />;
  const selectedId = params.get("id");
  const list = rels.value.filter((r) => !q || (r.contact?.name ?? "").toLowerCase().includes(q.toLowerCase()) || (r.contact?.email ?? "").toLowerCase().includes(q.toLowerCase()));
  const selected = rels.value.find((r) => r.id === selectedId || r.contact_id === selectedId);
  const access = (r: Relationship) => (memberships.value ?? []).filter((m) => m.contact_id === r.contact_id && m.brand_id === r.brand_id && m.kind === kind && m.status === "active").length;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel title={kind === "client" ? "Clients and prospects" : "Partners"} description="From the Command Center CRM; one person or organization can work with several brands"
        actions={<Link className="text-xs text-muted-foreground hover:underline" to="/workspace/command/crm">Add in the CRM</Link>}>
        <input aria-label="Filter" className={`${inputCls} mb-3`} placeholder="Filter by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        {list.length === 0 ? <Empty title={kind === "client" ? "No client yet" : "No partner yet"}>{kind === "partner" ? "Mark a contact's brand relationship as partner in the Command Center CRM." : "Clients come from the Command Center CRM."}</Empty> : (
          <ul className="divide-y divide-border/60">{list.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => { const p = new URLSearchParams(params); p.set("id", r.id); setParams(p, { replace: true }); }} aria-current={selected?.id === r.id ? "true" : undefined}
                className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${selected?.id === r.id ? "bg-muted/60" : ""}`}>
                <span className="min-w-0"><span className="font-medium">{r.contact?.name}</span><span className="block text-xs text-muted-foreground">{brandName(r.brand_id)} · {r.contact?.email ?? "no email"}</span></span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">{access(r) > 0 ? `${access(r)} portal user${access(r) > 1 ? "s" : ""}` : "no portal access"}<StatusPill status={r.status} words={{ client: "Client", prospect: "Prospect", partner: "Partner" }} /></span>
              </button>
            </li>))}</ul>
        )}
      </Panel>
      {selected ? <Detail key={selected.id} rel={selected} kind={kind} onChanged={() => memberships.reload()} /> : <Panel title="Details"><Empty title={`Choose a ${kind}`}>Portal access, invitations{kind === "client" ? " and visible invoices" : ""} appear here.</Empty></Panel>}
    </div>
  );
};

export default Relationships;
