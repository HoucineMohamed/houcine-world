import React, { useState } from "react";
import { Loader2, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useCommand } from "./context";
import { Panel } from "./ui";

// The AI management analyst (supabase/functions/command-analyst). It answers from a facts pack computed by the same
// engine as these screens, from the records the database lets YOU read; it cannot change anything. Every number in an
// answer is checked against the facts, and the facts themselves can be opened under each answer.

const EXAMPLES = [
  "Which brand generated the most revenue this quarter?",
  "How many new clients did we acquire this month?",
  "Which projects are overdue or at risk, and why?",
  "How much revenue remains outstanding?",
  "What changed compared with last month?",
  "Summarize the current operational situation.",
];

interface Turn { question: string; answer?: string | null; error?: string | null; unverified?: string[]; facts?: string; scope?: string[] | "all" }

const Analyst = () => {
  const { scope, mode, scopeBrands } = useCommand();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setInput("");
    const index = turns.length;
    setTurns((t) => [...t, { question }]);
    const history = turns.flatMap((t) => (t.answer ? [{ role: "user" as const, content: t.question }, { role: "assistant" as const, content: t.answer }] : []));
    const brandIds = mode === "global" && scope.brandIds === null ? null : scopeBrands.map((b) => b.id);
    const { data, error } = await supabase.functions.invoke("command-analyst", { body: { question, brandIds, history } });
    let result: Turn;
    if (error) {
      let message = "The analyst could not be reached.";
      try { const ctx = (error as { context?: Response }).context; const payload = ctx ? await ctx.json() : null; if (payload?.error) message = payload.error; } catch { /* keep the plain message */ }
      result = { question, error: message };
    } else result = { question, ...(data as Omit<Turn, "question">) };
    setTurns((t) => t.map((x, i) => (i === index ? result : x)));
    setBusy(false);
  };
  return (
    <div className="mx-auto grid max-w-4xl gap-4">
      <Panel title="AI management analyst" description={`Read-only. Answers only from figures computed from the records you may see (${mode === "global" && scope.brandIds === null ? "every brand" : scopeBrands.map((b) => b.name).join(", ")}). Not the public La Rosa View Concierge.`}>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((q) => <button key={q} type="button" onClick={() => void ask(q)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground">{q}</button>)}
          </div>
        )}
        <div className="space-y-4">
          {turns.map((t, i) => (
            <div key={i} className="space-y-2">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-muted px-3 py-2 text-sm">{t.question}</p>
              <div className="max-w-[95%] rounded-2xl rounded-tl-sm border border-border bg-card/40 px-3 py-2 text-sm">
                {t.answer === undefined && t.error === undefined ? <span className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Computing the figures and answering…</span>
                  : t.error ? <span className="text-amber-200">{t.error}</span>
                  : <p className="whitespace-pre-wrap">{t.answer}</p>}
              </div>
              {t.unverified && t.unverified.length > 0 && (
                <p role="alert" className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> These numbers in the answer are not in the computed figures, so they are unverified: {t.unverified.join(", ")}. Rely on the figures below.
                </p>
              )}
              {t.facts && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">The figures this answer was based on</summary>
                  <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border p-2">{t.facts}</pre>
                </details>
              )}
            </div>
          ))}
        </div>
        <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void ask(input); }}>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
            rows={2} maxLength={1000} placeholder="Ask about revenue, clients, leads, projects…" aria-label="Question for the analyst" className="min-h-[44px] flex-1 resize-none rounded-md border border-input bg-background p-2 text-sm" />
          <Button type="submit" size="icon" className="h-11 w-11" disabled={busy || !input.trim()} aria-label="Ask">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </form>
      </Panel>
    </div>
  );
};

export default Analyst;
