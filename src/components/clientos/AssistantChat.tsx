import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clientOsApi, type AiMessage } from "@/services/clientOs";
import { useAsync } from "@/components/command/useAsync";
import { Empty, ErrorBox, Panel, Pill } from "@/components/command/ui";
import { fmtWhen } from "./shared";

// The Client OS assistants (docs/client-os-ai.md): the client assistant in /portal and the intelligence assistant in
// /workspace/clients. Conversations are the person's own (row-level security). Each answer is built on the server from
// records read just then with this person's access; actions are proposals that run only after "Confirm".

const CLIENT_QUESTIONS = ["What is the status of my project?", "What are you waiting for from me?", "When is my next milestone?", "How much remains unpaid?", "How do I request a revision?"];
const INTERNAL_QUESTIONS = ["Which clients need attention?", "Which proposals are awaiting a decision?", "Which projects are at risk?", "Which clients have overdue invoices?", "What should I prioritize this week?", "Identify bottlenecks in the delivery process."];

const Proposals = ({ m }: { m: AiMessage }) => {
  const ids = (m.meta?.proposals ?? []).map((p) => p.id);
  const live = useAsync(() => clientOsApi.aiProposals(ids), [ids.join(",")]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, { text: string; link?: string; error?: boolean }>>({});
  if (!ids.length) return null;
  const decide = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      const r = await clientOsApi.aiConfirm(id, approve);
      setNotes((n) => ({ ...n, [id]: r.status === "executed" ? { text: "Done.", link: r.link } : r.status === "declined" ? { text: "Declined: nothing was changed." } : { text: `Not done: ${r.error ?? "refused"}`, error: true } }));
    } catch (e) { setNotes((n) => ({ ...n, [id]: { text: e instanceof Error ? e.message : "Not done.", error: true } })); }
    setBusy(null);
    live.reload();
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed action (needs your confirmation)</p>
      {m.meta!.proposals!.map((p) => {
        const status = live.value?.find((x) => x.id === p.id)?.status ?? p.status;
        const note = notes[p.id];
        return (
          <div key={p.id} className="rounded-md border border-border bg-background p-3">
            <p className="font-medium">{p.summary}</p>
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">{p.preview.map((x, i) => <li key={i}>{x}</li>)}</ul>
            {note ? <p role={note.error ? "alert" : "status"} className={cn("mt-2 text-xs", note.error && "text-destructive")}>{note.text} {note.link && <Link className="underline" to={note.link}>Open</Link>}</p>
              : status === "proposed" ? (
                <div className="mt-2 flex gap-2"><Button size="sm" disabled={busy === p.id} onClick={() => void decide(p.id, true)}>Confirm</Button><Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => void decide(p.id, false)}>Decline</Button></div>
              ) : <p className="mt-2 text-xs"><Pill tone={status === "executed" ? "good" : status === "failed" ? "bad" : "neutral"}>{status}</Pill></p>}
          </div>
        );
      })}
    </div>
  );
};

const Answer = ({ m, mode }: { m: AiMessage; mode: "client" | "internal" }) => {
  const meta = m.meta ?? {};
  if (meta.error) return <p role="alert" className="text-muted-foreground">{m.content}</p>;
  return (
    <div className="space-y-3">
      <p className="whitespace-pre-wrap">{m.content}</p>
      {mode === "internal" && !!meta.observations?.length && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observations (from the records)</h4><ul className="mt-1 list-disc space-y-0.5 pl-5">{meta.observations.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      {mode === "internal" && !!meta.recommendations?.length && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations (suggestions)</h4><ul className="mt-1 list-disc space-y-0.5 pl-5">{meta.recommendations.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      {mode === "internal" && !!meta.missing?.length && <section><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Not available</h4><ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">{meta.missing.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
      {!!meta.unverified?.length && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs">Not found in your records, check before relying on them: {meta.unverified.join(", ")}</p>}
      {!!meta.links?.length && <div className="flex flex-wrap gap-2">{meta.links.map((l) => <Button key={l.path} size="sm" variant="outline" asChild><Link to={l.path}>{l.label}</Link></Button>)}</div>}
      <Proposals m={m} />
      {!!meta.knowledge?.length && <p className="text-[0.7rem] text-muted-foreground">Published information used: {[...new Set(meta.knowledge.map((k) => `${k.title} (updated ${k.updated})`))].join("; ")}</p>}
    </div>
  );
};

export const AssistantChat = ({ mode, brandId = null, title, intro }: { mode: "client" | "internal"; brandId?: string | null; title: string; intro: string }) => {
  const convs = useAsync(() => clientOsApi.aiConversations(mode), [mode]);
  const [current, setCurrent] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!current) { setMessages([]); return; }
    clientOsApi.aiMessages(current).then(setMessages).catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, [current]);
  useEffect(() => { end.current?.scrollIntoView?.({ block: "end" }); }, [messages.length, busy]);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true); setError(null); setQuestion("");
    setMessages((m) => [...m, { id: `pending-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString(), meta: null }]);
    try {
      const r = await clientOsApi.aiAsk({ mode, question: text, conversationId: current, brandId });
      if (r.conversationId !== current) { setCurrent(r.conversationId); convs.reload(); }
      else setMessages((m) => [...m, r.message]);
    } catch (e) { setError(e instanceof Error ? e.message : "The assistant could not be reached."); }
    setBusy(false);
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this conversation? It cannot be recovered.")) return;
    try { await clientOsApi.aiDeleteConversation(id); if (current === id) setCurrent(null); convs.reload(); } catch (e) { setError(e instanceof Error ? e.message : "Could not delete."); }
  };
  const clearAll = async () => {
    if (!window.confirm("Delete all your assistant conversations? This cannot be undone.")) return;
    for (const c of convs.value ?? []) await clientOsApi.aiDeleteConversation(c.id).catch(() => {});
    setCurrent(null); convs.reload();
  };
  const suggestions = mode === "client" ? CLIENT_QUESTIONS : INTERNAL_QUESTIONS;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Panel title="Conversations" actions={<Button size="sm" variant="ghost" className="gap-1" onClick={() => { setCurrent(null); setError(null); }}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> New</Button>}>
        {convs.error ? <ErrorBox message={convs.error} /> : !convs.value ? <p className="text-xs text-muted-foreground">Loading…</p> : convs.value.length === 0 ? <p className="text-xs text-muted-foreground">No conversation yet.</p> : (
          <ul className="space-y-1">{convs.value.map((c) => (
            <li key={c.id} className="group flex items-center gap-1">
              <button type="button" onClick={() => setCurrent(c.id)} aria-current={current === c.id ? "true" : undefined} className={cn("min-w-0 flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/50", current === c.id && "bg-muted")}>
                <span className="block truncate">{c.title}</span><span className="block text-[0.7rem] text-muted-foreground">{fmtWhen(c.updated_at)}</span>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Delete conversation ${c.title}`} onClick={() => void remove(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>))}</ul>
        )}
        {!!convs.value?.length && <Button size="sm" variant="ghost" className="mt-2 w-full text-xs text-muted-foreground" onClick={() => void clearAll()}>Clear all history</Button>}
      </Panel>
      <Panel title={title} description={intro}>
        <div className="space-y-4" aria-live="polite">
          {!current && messages.length === 0 && (
            <Empty title={mode === "client" ? "Ask about your projects" : "Ask about your clients and delivery"}>
              <span className="mt-2 flex flex-wrap justify-center gap-2">{suggestions.map((s) => <Button key={s} size="sm" variant="outline" className="h-auto whitespace-normal py-1.5" onClick={() => void send(s)}>{s}</Button>)}</span>
            </Empty>
          )}
          {messages.map((m) => m.role === "user" ? (
            <div key={m.id} className="ml-auto max-w-[85%] rounded-lg bg-muted px-3 py-2"><p className="whitespace-pre-wrap">{m.content}</p><p className="mt-1 text-right text-[0.7rem] text-muted-foreground">{fmtWhen(m.created_at)}</p></div>
          ) : (
            <div key={m.id} className="rounded-lg border border-border p-3"><Answer m={m} mode={mode} /><p className="mt-2 text-[0.7rem] text-muted-foreground">{fmtWhen(m.created_at)} · AI answer from your authorized records{mode === "client" ? "" : "; the database decides every action"}</p></div>
          ))}
          {busy && <p role="status" className="text-muted-foreground">Reading your records…</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div ref={end} />
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(question); }}>
            <label className="sr-only" htmlFor={`assistant-${mode}`}>Your question</label>
            <textarea id={`assistant-${mode}`} rows={2} maxLength={1000} value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(question); } }}
              placeholder={mode === "client" ? "Ask about your projects, approvals, invoices…" : "Ask about clients, projects, proposals, finances…"}
              className="min-h-[2.5rem] flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <Button type="submit" disabled={busy || !question.trim()} className="gap-1.5 self-end"><Send className="h-4 w-4" aria-hidden="true" /> Ask</Button>
          </form>
        </div>
      </Panel>
    </div>
  );
};
