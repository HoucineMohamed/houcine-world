import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, RotateCcw, Loader2, ThumbsUp, CircleDashed, XCircle, HelpCircle, Clock, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { studioApi, StudioError, type PlaygroundResult } from "@/services/knowledgeStudio";
import { STATUS_INFO } from "@/lib/knowledge/note";
import { useStudio } from "./StudioContext";
import { BrandDot, brandLabel, Pill } from "./ui";
import Coverage from "./Coverage";

// AI Training Playground: talk privately to the La Rosa View Concierge -- the same pipeline as the public chat
// (interpret -> retrieve -> answer), with the "live" knowledge (what visitors get) or a "preview" built with your
// unpublished drafts. Every answer comes with the retrieval inspector (what was understood, which passages were
// retrieved, why, from which sources) and feedback buttons that create PRIVATE review items. Feedback never changes
// knowledge and never trains the model: it tells you what to add or correct.

interface Turn {
  question: string;
  result: PlaygroundResult | null;
  error: string | null;
  feedback?: string;
}

const RATINGS = [
  { rating: "correct", label: "Correct", icon: ThumbsUp },
  { rating: "incomplete", label: "Incomplete", icon: CircleDashed },
  { rating: "incorrect", label: "Incorrect", icon: XCircle },
  { rating: "missing", label: "Missing knowledge", icon: HelpCircle },
  { rating: "outdated", label: "Outdated", icon: Clock },
] as const;

const Inspector = ({ result }: { result: PlaygroundResult }) => {
  const navigate = useNavigate();
  const { state } = useStudio();
  const open = (noteId: string) => {
    const n = state?.notes.find((x) => x.id === noteId);
    if (n) navigate(`/workspace/knowledge/notes?path=${encodeURIComponent(n.path)}`);
  };
  return (
    <div className="space-y-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-border p-2">
          <p className="mb-1 font-semibold text-muted-foreground">Understood as</p>
          {result.interpretation ? (
            <>
              <p>{result.interpretation.intent}</p>
              <p className="mt-1 text-muted-foreground">Language {result.interpretation.language} · topic {result.interpretation.topic.replace(/_/g, " ")}{result.interpretation.needs_clarification ? ` · missing: ${result.interpretation.missing_details.join(", ")}` : ""}</p>
            </>
          ) : <p className="text-muted-foreground">The interpreting step did not run (no model configured, or it failed): the search used the words as typed.</p>}
        </div>
        <div className="rounded-md border border-border p-2">
          <p className="mb-1 font-semibold text-muted-foreground">Searched for</p>
          <ul className="list-disc pl-4">{result.queries.map((q) => <li key={q}>{q}</li>)}</ul>
          <p className="mt-1 text-muted-foreground">Access: {result.access.brands.map(brandLabel).join(", ")}{result.access.referralBrands?.length ? ` (+ overviews of ${result.access.referralBrands.length} other brands)` : ""}</p>
        </div>
      </div>
      <p className="font-semibold text-muted-foreground">Retrieved passages ({result.passages.length}) · index {result.indexFingerprint}{result.source === "live" && result.liveFingerprint && result.liveFingerprint !== result.indexFingerprint ? ` (the public concierge serves ${result.liveFingerprint})` : ""}</p>
      <ol className="space-y-2">
        {result.passages.map((p, i) => (
          <li key={`${p.noteId}-${p.section}-${i}`} className="rounded-md border border-border p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tabular-nums text-muted-foreground">#{i + 1}</span>
              <BrandDot brand={p.brand} />
              <button type="button" onClick={() => open(p.noteId)} className="font-medium text-violet-300 hover:underline">{p.title}</button>
              <span className="text-muted-foreground">› {p.section}</span>
              <span className="ml-auto flex gap-1"><Pill tone="published">{p.visibility}</Pill><Pill tone={p.status === "verified" || p.status === "policy" ? "published" : "pending"}>{STATUS_INFO[p.status]?.label}</Pill></span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-foreground/80">{p.text}</p>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              Why: {p.via === "link" ? `linked from ${p.why?.linkedFrom ?? "a retrieved note"}` : p.via === "fallback" ? "always sent (contact) or nothing else matched" : p.why?.named ? "the question names this note" : "matched words"}
              {p.why?.matched.length ? ` (${p.why.matched.join(", ")})` : ""} · score {p.score} · sources {p.sources.join(", ") || "—"} · checked {p.updated}
            </p>
          </li>
        ))}
      </ol>
      {result.memory && (result.memory.stated.length > 0 || result.memory.inferred.length > 0) && (
        <div className="rounded-md border border-border p-2">
          <p className="mb-1 font-semibold text-muted-foreground">Conversation memory</p>
          <p>Stated: {result.memory.stated.map((m) => `${m.key}: ${m.value}`).join("; ") || "—"}</p>
          <p className="text-muted-foreground">Inferred (not confirmed): {result.memory.inferred.map((m) => `${m.key}: ${m.value}`).join("; ") || "—"}</p>
        </div>
      )}
    </div>
  );
};

const Playground = () => {
  const { state } = useStudio();
  const [source, setSource] = useState<"live" | "preview">("live");
  const [params] = useSearchParams();
  const [view, setView] = useState<"chat" | "coverage">(params.get("view") === "coverage" ? "coverage" : "chat");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [openInspector, setOpenInspector] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const memory = useRef<unknown>(undefined);
  const drafts = state?.drafts.length ?? 0;

  const ask = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setBusy(true);
    setInput("");
    const index = turns.length;
    setTurns((t) => [...t, { question, result: null, error: null }]);
    const history = turns.flatMap((t) => (t.result?.reply ? [{ role: "user" as const, content: t.question }, { role: "assistant" as const, content: t.result.reply }] : []));
    try {
      const result = await studioApi.playground({ message: question, history: history.slice(-16), memory: memory.current, source });
      if (result.memory) memory.current = result.memory;
      setTurns((t) => t.map((x, i) => (i === index ? { ...x, result } : x)));
      setOpenInspector(index);
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === index ? { ...x, error: e instanceof StudioError ? e.message : "The playground could not answer." } : x)));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setTurns([]);
    memory.current = undefined;
    setOpenInspector(null);
  };

  const sendFeedback = async (index: number, rating: string) => {
    const t = turns[index];
    if (!t?.result) return;
    try {
      await studioApi.feedback({ rating, question: t.question, answer: t.result.reply || t.result.error?.message || "", comment, sources: [...new Set(t.result.passages.map((p) => p.noteId))] });
      setTurns((all) => all.map((x, i) => (i === index ? { ...x, feedback: rating } : x)));
      setComment("");
    } catch (e) {
      setTurns((all) => all.map((x, i) => (i === index ? { ...x, error: e instanceof StudioError ? e.message : "Feedback could not be saved." } : x)));
    }
  };

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/30 p-3 text-sm">
        <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="Playground view">
          {(["chat", "coverage"] as const).map((v) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("rounded px-2.5 py-1 text-xs", view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {v === "chat" ? "Chat with the concierge" : "Coverage"}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border border-border p-0.5" role="radiogroup" aria-label="Which knowledge">
          {(["live", "preview"] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={source === s} onClick={() => setSource(s)} className={cn("rounded px-2.5 py-1 text-xs", source === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              {s === "live" ? "Published knowledge" : `With my drafts (${drafts})`}
            </button>
          ))}
        </div>
        <p className="flex-1 text-xs text-muted-foreground">
          <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          {source === "live" ? "Exactly what visitors get: published notes only." : "A private preview: your drafts are included, nothing is published."}
        </p>
        {view === "chat" && <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> New conversation</Button>}
      </div>

      {view === "coverage" ? <Coverage source={source} initialBrand={params.get("brand")} /> : (<>

      <div className="space-y-4">
        {turns.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Ask what a visitor would ask, for example “How can I book DJ Hajri for an event outside Tunisia?”. You will see the answer and exactly what it was based on.
          </p>
        )}
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-500/20 px-3 py-2 text-sm">{t.question}</div>
            <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-border bg-card/40 px-3 py-2 text-sm">
              {!t.result && !t.error && <span className="flex items-center gap-2 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Interpreting, retrieving, answering…</span>}
              {t.error && <span className="text-rose-300">{t.error}</span>}
              {t.result && (
                t.result.error ? (
                  <span className="text-amber-200">{t.result.error.message}{t.result.error.code === "not_configured" ? " (Set ANTHROPIC_API_KEY to get answers; the retrieval below still shows what the AI would read.)" : ""}</span>
                ) : <p className="whitespace-pre-wrap">{t.result.reply}</p>
              )}
            </div>
            {t.result && (
              <div className="space-y-2 pl-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {RATINGS.map(({ rating, label, icon: Icon }) => (
                    <button key={rating} type="button" disabled={Boolean(t.feedback)} onClick={() => void sendFeedback(i, rating)} className={cn("flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs disabled:opacity-60", t.feedback === rating ? "border-violet-400 bg-violet-500/20" : "border-border text-muted-foreground hover:text-foreground")}>
                      <Icon className="h-3 w-3" aria-hidden="true" /> {label}
                    </button>
                  ))}
                  {t.feedback ? <span className="text-xs text-emerald-300">Saved to the review queue{t.feedback === "correct" ? "" : ": fix it under Review"}.</span> : (
                    <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional note for the review queue" maxLength={2000} className="h-7 min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 text-xs" aria-label="Feedback comment" />
                  )}
                  <button type="button" onClick={() => setOpenInspector(openInspector === i ? null : i)} aria-expanded={openInspector === i} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                    Retrieval inspector <ChevronDown className={cn("h-3 w-3 transition-transform", openInspector === i && "rotate-180")} />
                  </button>
                </div>
                {openInspector === i && <div className="rounded-lg border border-border bg-card/20 p-3"><Inspector result={t.result} /></div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sticky bottom-3 flex items-end gap-2 rounded-lg border border-border bg-background/95 p-2 backdrop-blur">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(); } }} rows={1} maxLength={2000} placeholder="Ask the concierge…" aria-label="Question for the concierge" className="min-h-[44px] resize-none" />
        <Button onClick={() => void ask()} disabled={busy || !input.trim()} size="icon" className="h-11 w-11 shrink-0" aria-label="Send">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
      </div>
      </>)}
    </div>
  );
};

export default Playground;
