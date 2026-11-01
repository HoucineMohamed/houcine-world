import React, { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autopilotApi, type Proposal } from "@/services/autopilot";
import { attempt } from "@/components/command/useAsync";
import { Empty, Panel, Pill } from "@/components/command/ui";
import { useAutopilot } from "@/pages/workspace/autopilot/Autopilot";

// AI Operations Assistant. It answers from the records this admin may see (assembled on the server as the user) and
// may PROPOSE a change. A proposal does nothing until the admin confirms it here; the database checks it again and
// audits the confirmation. Numbers the model wrote that are not in its facts are flagged.

interface Turn { role: "user" | "assistant"; content: string; unverified?: string[]; error?: string | null; proposals?: (Proposal & { decided?: string })[]; rejected?: number; knowledge?: { title: string; section: string; link: string | null }[]; context?: string }

const ACTION_LABEL: Record<string, string> = { create_task: "Create a task", assign_lead: "Assign a lead", notify_owner: "Notify the owner", create_alert: "Create an alert" };
const EXAMPLES = ["Which projects need attention this week?", "Which leads have no owner or no follow-up?", "Summarize the open alerts by severity.", "Which invoices are overdue?"];

const Assistant = () => {
  const { brandIds, scopeBrands, mode } = useAutopilot();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  const send = async (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setQuestion("");
    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: "user", content: text }]);
    try {
      const r = await autopilotApi.ask(text, brandIds, history);
      setTurns((t) => [...t, { role: "assistant", content: r.answer ?? "", error: r.error, unverified: r.unverified, proposals: r.proposals, rejected: r.rejected, knowledge: r.knowledge, context: r.context }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: "", error: e instanceof Error ? e.message : "The assistant could not be reached." }]);
    } finally {
      setBusy(false);
    }
  };

  const decide = async (turn: number, id: string, approve: boolean) => {
    setDeciding(id);
    let outcome = "";
    const error = await attempt(async () => {
      const r = await autopilotApi.confirmProposal(id, approve);
      outcome = !approve ? "Rejected: nothing was changed." : r && typeof r === "object" && "error" in r ? `Not done: ${String(r.error)}` : "Done. Recorded in the activity history as confirmed by you.";
    });
    setDeciding(null);
    setTurns((all) => all.map((t, i) => (i !== turn ? t : { ...t, proposals: t.proposals?.map((p) => (p.id === id ? { ...p, decided: error ?? outcome } : p)) })));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel title="AI Operations Assistant" description={`Answers from the records of ${mode === "global" && !brandIds ? "every brand" : scopeBrands.map((b) => b.name).join(", ") || "this brand"}. It can propose changes; nothing happens until you confirm.`}>
        <div className="space-y-4" aria-live="polite">
          {turns.length === 0 && (
            <Empty title="Ask about operations">
              <span className="mt-2 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((e) => <Button key={e} size="sm" variant="outline" className="h-auto whitespace-normal py-1.5" onClick={() => void send(e)}>{e}</Button>)}
              </span>
            </Empty>
          )}
          {turns.map((t, i) => t.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-lg bg-muted px-3 py-2"><p className="whitespace-pre-wrap">{t.content}</p></div>
          ) : (
            <div key={i} className="space-y-3 rounded-lg border border-border p-3">
              {t.error && <p role="alert" className="text-destructive">{t.error}</p>}
              {t.content && <p className="whitespace-pre-wrap">{t.content}</p>}
              {!!t.unverified?.length && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs">Not found in the facts, check before relying on them: {t.unverified.join(", ")}</p>}
              <p className="text-[0.7rem] text-muted-foreground">AI commentary from your authorized records. Figures come from the Command Center engine.</p>
              {!!t.proposals?.length && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proposed actions (need your confirmation)</p>
                  {t.proposals.map((p) => (
                    <div key={p.id} className="rounded-md border border-border bg-background p-3">
                      <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                        <dt className="text-muted-foreground">Action</dt><dd className="font-medium">{ACTION_LABEL[p.action_type] ?? p.action_type}</dd>
                        <dt className="text-muted-foreground">Target</dt><dd>{p.target_type}: {p.target_name}</dd>
                        <dt className="text-muted-foreground">Brand</dt><dd>{p.brand_name}</dd>
                        <dt className="text-muted-foreground">Expected change</dt><dd>{p.expected}</dd>
                        <dt className="text-muted-foreground">Responsible</dt><dd>{p.responsible}</dd>
                        {p.summary && p.summary !== p.expected && <><dt className="text-muted-foreground">Why</dt><dd>{p.summary}</dd></>}
                      </dl>
                      {p.decided ? <p role="status" className="mt-2 text-xs">{p.decided}</p> : (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" disabled={deciding === p.id} onClick={() => void decide(i, p.id, true)}>Confirm</Button>
                          <Button size="sm" variant="outline" disabled={deciding === p.id} onClick={() => void decide(i, p.id, false)}>Reject</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!!t.rejected && <p className="text-xs text-muted-foreground">{t.rejected} suggested action(s) were dropped: they did not match a record of an authorized brand.</p>}
              {!!t.knowledge?.length && <p className="text-xs text-muted-foreground">Knowledge used: {t.knowledge.map((k) => k.title).join(", ")}</p>}
              {t.context && <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Facts the assistant received</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{t.context}</pre></details>}
            </div>
          ))}
          {busy && <p role="status" className="text-muted-foreground">Thinking…</p>}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(question); }}>
            <label className="sr-only" htmlFor="ap-question">Question</label>
            <textarea id="ap-question" rows={2} maxLength={1000} value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(question); } }}
              placeholder="Ask about projects, leads, invoices, alerts or automations…" className="min-h-[2.5rem] flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            <Button type="submit" disabled={busy || !question.trim()} className="gap-1.5 self-end"><Send className="h-4 w-4" aria-hidden="true" /> Ask</Button>
          </form>
        </div>
      </Panel>
      <Panel title="What it can do">
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li><Pill>Reads</Pill> projects, leads, invoices, alerts and executions of brands you manage, plus published knowledge.</li>
          <li><Pill>Proposes</Pill> create a task, assign a lead, notify an owner, create an alert. Only on records listed in its facts.</li>
          <li><Pill>Never</Pill> changes anything by itself, sends email, or reaches a brand you do not manage. The database checks every confirmation again.</li>
        </ul>
      </Panel>
    </div>
  );
};

export default Assistant;
