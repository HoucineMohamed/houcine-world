import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clientOsApi, type Conversation } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Field, inputCls, LoadingGrid, Panel, Pill } from "@/components/command/ui";
import { FileLink, UploadButton, fmtWhen, useAction } from "./shared";

// Conversations, shared by the internal Client OS (side "team": may write internal notes) and the portals (side
// "external": the database forces every external message to be visible, and hides internal ones).

export const Thread = ({ c, side, me }: { c: Conversation; side: "team" | "external"; me: string | null }) => {
  const messages = useAsync(() => clientOsApi.messages(c.id), [c.id]);
  const a = useAction();
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [file, setFile] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => { const t = setInterval(messages.reload, 30_000); return () => clearInterval(t); }, [messages.reload]);
  return (
    <Panel title={c.subject} description={`${c.audience === "internal" ? "Team only" : c.audience === "client" ? "With the client" : "With partners"}${c.project_id ? " · project conversation" : ""}`}>
      <div className="space-y-3">
        {messages.error ? <ErrorBox message={messages.error} /> : !messages.value ? <p className="text-xs text-muted-foreground">Loading…</p> : messages.value.length === 0 ? <Empty title="No message yet" /> : (
          <ol className="max-h-[28rem] space-y-2 overflow-y-auto">{messages.value.map((m) => (
            <li key={m.id} className={`rounded-md border p-2 ${m.internal ? "border-amber-500/40 bg-amber-500/5" : m.author_id === me ? "border-border bg-muted/40" : "border-border"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{m.author_id === me ? "You" : side === "team" ? "Participant" : "Team"} · {fmtWhen(m.created_at)} {m.internal && <Pill tone="warn">internal</Pill>}</div>
              <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
              {m.file_id && <FileLink fileId={m.file_id} name="Attachment" />}
            </li>))}</ol>
        )}
        <textarea aria-label="Message" className={`${inputCls} h-20 py-1.5`} maxLength={8000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message" />
        <div className="flex flex-wrap items-center gap-3">
          {side === "team" && c.audience !== "internal" && <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (team only)</label>}
          <UploadButton brandId={c.brand_id} projectId={c.project_id} purpose="message" audience={side === "team" ? (internal ? "internal" : c.audience === "partner" ? "partner" : "client") : null} onUploaded={(id, name) => setFile({ id, name })} />
          {file && <Pill>{file.name}</Pill>}
          <Button size="sm" disabled={!body.trim() || a.busy} onClick={() => void a.run(() => clientOsApi.sendMessage(c.id, c.brand_id, body, internal, file?.id ?? null), "Sent (in-app; no email).").then((ok) => { if (ok) { setBody(""); setFile(null); messages.reload(); } })}>Send</Button>
          {a.view}
        </div>
      </div>
    </Panel>
  );
};

/** A list of conversations with one open (?c=id), and a form to start one. */
export const ConversationsView = ({ brandIds, side, me, starters }: {
  brandIds: string[] | null; side: "team" | "external"; me: string | null;
  starters: { brands: { id: string; name: string }[]; projects: { id: string; name: string; brand_id: string }[]; contacts?: { id: string; name: string; brand_id: string }[]; audiences: string[] };
}) => {
  const [params, setParams] = useSearchParams();
  const list = useAsync(() => clientOsApi.conversations(brandIds), [JSON.stringify(brandIds)]);
  const a = useAction();
  const [f, setF] = useState({ brand: starters.brands[0]?.id ?? "", project: "", contact: "", audience: starters.audiences[0] ?? "client", subject: "" });
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />;
  if (!list.value) return <LoadingGrid tiles={3} />;
  const open = list.value.find((c) => c.id === params.get("c"));
  const projects = starters.projects.filter((p) => p.brand_id === f.brand);
  const contacts = (starters.contacts ?? []).filter((c) => c.brand_id === f.brand);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-5">
        <Panel title="Conversations">
          {list.value.length === 0 ? <Empty title="No conversation yet" /> : (
            <ul className="divide-y divide-border/60">{list.value.map((c) => (
              <li key={c.id}><button type="button" onClick={() => { const q = new URLSearchParams(params); q.set("c", c.id); setParams(q, { replace: true }); }} className={`flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-muted/40 ${open?.id === c.id ? "bg-muted/60" : ""}`}>
                <span className="min-w-0"><span className="font-medium">{c.subject}</span><span className="block text-xs text-muted-foreground">{starters.brands.find((b) => b.id === c.brand_id)?.name ?? ""} · {fmtWhen(c.last_message_at ?? c.created_at)}</span></span>
                {side === "team" && <Pill>{c.audience}</Pill>}</button></li>))}</ul>
          )}
        </Panel>
        <Panel title="Start a conversation">
          <div className="grid gap-2">
            {starters.brands.length > 1 && <Field label="Brand"><select aria-label="Conversation brand" className={inputCls} value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value, project: "", contact: "" })}>{starters.brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Field>}
            {starters.audiences.length > 1 && <Field label="With"><select aria-label="Audience" className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{starters.audiences.map((x) => <option key={x} value={x}>{x === "client" ? "The client" : x === "partner" ? "Partners" : "The team only"}</option>)}</select></Field>}
            <Field label="About a project"><select aria-label="Conversation project" className={inputCls} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}><option value="">{side === "team" ? "No project (relationship)" : "General"}</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            {side === "team" && !f.project && f.audience === "client" && <Field label="Client"><select aria-label="Conversation client" className={inputCls} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })}><option value="">Choose…</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
            <Field label="Subject"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={!f.subject.trim() || !f.brand || a.busy} onClick={async () => {
                let id = "";
                const ok = await a.run(async () => { id = await clientOsApi.createConversation({ brand_id: f.brand, project_id: f.project || null, contact_id: f.contact || (side === "external" ? (starters.contacts ?? []).find((c) => c.brand_id === f.brand)?.id ?? null : null), audience: f.audience, subject: f.subject }); }, "Conversation started.");
                if (ok) { setF({ ...f, subject: "" }); list.reload(); const q = new URLSearchParams(params); q.set("c", id); setParams(q, { replace: true }); }
              }}>Start</Button>{a.view}
            </div>
          </div>
        </Panel>
      </div>
      {open ? <Thread key={open.id} c={open} side={side} me={me} /> : <Panel title="Messages"><Empty title="Choose a conversation" /></Panel>}
    </div>
  );
};
