import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2, AlertTriangle, Info, Brain } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { studioApi, StudioError, type AssistResult } from "@/services/knowledgeStudio";
import { BRAND_LABELS, STATUS_INFO, TYPE_LABELS, VISIBILITY_INFO, defaultPathFor, idFor, parseList, today, writeNote } from "@/lib/knowledge/note";
import { useStudio } from "./StudioContext";

// "+ Teach the AI": write information in ordinary words; optionally let the AI suggest a structure; save it as a DRAFT
// note. The rules this screen keeps:
//   - your own words are always kept (in the draft's record, and in the note when you choose "use my text as is");
//   - AI suggestions are shown as suggestions, next to your text; a suggested section that adds a number, address or
//     price you did not write is removed by the server and listed here;
//   - nothing becomes "verified" unless you tick the confirmation: otherwise the note is "awaiting confirmation";
//   - nothing is published from here: the draft goes to the editor, and you publish when you are ready.

const TeachDialog = () => {
  const { teachOpen, setTeachOpen, state, reload } = useStudio();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("la-rosa-view");
  const [type, setType] = useState("topic");
  const [visibility, setVisibility] = useState("public");
  const [tags, setTags] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [related, setRelated] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [assist, setAssist] = useState<AssistResult | null>(null);
  const [useSuggestion, setUseSuggestion] = useState(false);
  const [working, setWorking] = useState<"assist" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setText(""); setTitle(""); setBrand("la-rosa-view"); setType("topic"); setVisibility("public"); setTags(""); setSources([]);
    setRelated([]); setContext(""); setConfirmed(false); setAssist(null); setUseSuggestion(false); setError(null);
  };
  const close = (open: boolean) => {
    setTeachOpen(open);
    if (!open) reset();
  };

  const titles = useMemo(() => (state?.notes ?? []).filter((n) => !n.archived && n.title).map((n) => n.title!).sort(), [state?.notes]);

  const runAssist = async () => {
    setWorking("assist");
    setError(null);
    try {
      const r = await studioApi.assist(text, brand);
      setAssist(r);
      if (r.suggestion) {
        if (!title && r.suggestion.title) setTitle(r.suggestion.title);
        if (!tags && r.suggestion.tags.length) setTags(r.suggestion.tags.join(", "));
        setRelated((cur) => [...new Set([...cur, ...r.suggestion!.relatedNotes])]);
        setUseSuggestion(r.suggestion.sections.length > 0);
      }
    } catch (e) {
      setError(e instanceof StudioError ? e.message : "The formatting help could not run.");
    } finally {
      setWorking(null);
    }
  };

  const buildBody = (): string => {
    const heading = `# ${title.trim()}`;
    const status = confirmed ? null : "> [!pending] Awaiting the owner's confirmation.";
    const sections = useSuggestion && assist?.suggestion?.sections.length
      ? assist.suggestion.sections.map((s) => `## ${s.heading}\n${s.text.trim()}`)
      : [`## ${title.trim()}\n${text.trim()}`];
    const relatedLine = related.length ? `\n## Related\n${related.map((r) => `- [[${r}]]`).join("\n")}` : "";
    const missing = assist?.suggestion?.missingDetails.length
      ? `\n## Not confirmed yet\n> [!incomplete] Questions to settle: ${assist.suggestion.missingDetails.join(" ")}`
      : "";
    const comment = (label: string, value: string) => `\n<!-- ${label} (kept in the note, never shown to the AI): ${value.trim().replace(/-->/g, "—>")} -->`;
    // When the suggested structure is used, the owner's exact words stay in the note (and in the repository's history).
    const original = useSuggestion && assist?.suggestion?.sections.length ? comment("Original words of the owner", text) : "";
    const contextNote = context.trim() ? comment("Context from the owner", context) : "";
    return [heading, "", ...(status ? [status, ""] : []), sections.join("\n\n"), relatedLine, missing, original, contextNote].join("\n").replace(/\n{3,}/g, "\n\n");
  };

  const save = async () => {
    if (!title.trim() || !text.trim()) {
      setError("A title and the information itself are needed.");
      return;
    }
    if (visibility === "public" && sources.length === 0) {
      setError("A public note needs at least one source: choose where this information comes from.");
      return;
    }
    setWorking("save");
    setError(null);
    const path = defaultPathFor(brand, type, title);
    const fields = {
      id: idFor(brand, title), title: title.trim(), brand, type, visibility,
      status: confirmed ? "verified" : "pending",
      tags: parseList(tags), aliases: [], sources, updated: today(),
    };
    try {
      await studioApi.saveDraft({ path, content: writeNote(fields, buildBody()), expectedVersion: null, baseSha: null, originalInput: [text.trim(), context.trim() ? `\n\nContext: ${context.trim()}` : ""].join("") });
      await reload();
      close(false);
      navigate(`/workspace/knowledge/notes?path=${encodeURIComponent(path)}`);
    } catch (e) {
      setError(e instanceof StudioError ? (e.code === "draft_conflict" ? `A draft already exists at ${path}. Choose another title, or open that draft.` : e.message) : "The note could not be saved.");
    } finally {
      setWorking(null);
    }
  };

  const s = assist?.suggestion ?? null;

  return (
    <Dialog open={teachOpen} onOpenChange={close}>
      <DialogContent className="knowledge-studio max-h-[92vh] max-w-4xl overflow-y-auto text-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-accent" aria-hidden="true" /> Teach the AI</DialogTitle>
          <DialogDescription>Write what the AI should know, in your own words. It becomes a draft note: nothing reaches the AI until you publish it.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">The information</span>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={8000} placeholder="For example: DJ Hajri is available for private corporate events. For international bookings, organizers should contact the management team directly." />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void runAssist()} disabled={!text.trim() || working !== null} className="gap-1.5">
                {working === "assist" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} Help me organize it
              </Button>
              <span className="text-xs text-muted-foreground">Optional. Suggests a title, sections, tags and links, and checks existing knowledge; it never adds facts.</span>
            </div>

            {assist && (
              <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-sm">
                {!assist.aiAvailable && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" /> The AI formatting help is not configured (ANTHROPIC_API_KEY); the checks against existing knowledge below still ran.</p>}
                {assist.aiError && <p className="text-xs text-amber-200">The AI could not answer this time ({assist.aiError}). Your text is unchanged.</p>}
                {s && (
                  <>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-accent">AI suggestion (not saved unless you choose it)</p>
                    {s.sections.length > 0 && (
                      <div className="space-y-2">
                        {s.sections.map((sec) => <div key={sec.heading}><p className="font-medium">{sec.heading}</p><p className="whitespace-pre-wrap text-muted-foreground">{sec.text}</p></div>)}
                        <label className="flex items-center gap-2 text-xs">
                          <input type="checkbox" checked={useSuggestion} onChange={(e) => setUseSuggestion(e.target.checked)} className="accent-primary" />
                          Use this structure (otherwise your text is kept exactly as written)
                        </label>
                      </div>
                    )}
                    {s.removedSections.length > 0 && (
                      <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-100">
                        <p className="font-medium">Removed from the suggestion because they added something you did not write:</p>
                        <ul className="mt-1 list-disc pl-4">{s.removedSections.map((r) => <li key={r.heading}>{r.heading}: {r.reason}</li>)}</ul>
                      </div>
                    )}
                    {s.missingDetails.length > 0 && (
                      <div className="text-xs"><p className="font-medium">Details that seem missing (they will be marked “not confirmed yet”, never invented):</p><ul className="mt-1 list-disc pl-4 text-muted-foreground">{s.missingDetails.map((m) => <li key={m}>{m}</li>)}</ul></div>
                    )}
                    {s.possibleConflicts.length > 0 && (
                      <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-xs">
                        <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3.5 w-3.5" /> Possible conflicts with existing notes</p>
                        <ul className="mt-1 list-disc pl-4">{s.possibleConflicts.map((c) => {
                          const n = state?.notes.find((x) => x.id === c.note_id);
                          return <li key={c.note_id}>{n ? <a className="text-accent underline" href={`/workspace/knowledge/notes?path=${encodeURIComponent(n.path)}`} target="_blank" rel="noreferrer">{n.title}</a> : c.note_id}: {c.explanation}</li>;
                        })}</ul>
                        <p className="mt-1 text-muted-foreground">Nothing is changed automatically: open those notes and correct whichever is wrong.</p>
                      </div>
                    )}
                  </>
                )}
                {assist.overlaps.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer">Existing knowledge on the same subject ({assist.overlaps.length})</summary>
                    <ul className="mt-1 space-y-1">{assist.overlaps.map((o) => <li key={`${o.noteId}${o.section}`}><span className="font-medium">{o.title} › {o.section}</span> <span className="text-muted-foreground">({STATUS_INFO[o.status]?.label}) {o.text.slice(0, 180)}…</span></li>)}</ul>
                  </details>
                )}
              </div>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-medium">Additional context <span className="font-normal text-muted-foreground">(optional, kept for you, never shown to the AI)</span></span>
              <Input value={context} onChange={(e) => setContext(e.target.value)} maxLength={1000} placeholder="Why this changed, who confirmed it…" />
            </label>
          </div>

          <div className="space-y-3 text-sm">
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Title</span><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Brand</span>
              <select value={brand} onChange={(e) => setBrand(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{Object.entries(BRAND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Category</span>
              <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{Object.entries(TYPE_LABELS).filter(([v]) => !["index", "source", "agent"].includes(v)).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Visibility</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">{Object.entries(VISIBILITY_INFO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}</select>
              <span className="mt-1 block text-[0.7rem] text-muted-foreground">{VISIBILITY_INFO[visibility]?.help}</span>
            </label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Tags</span><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="booking, international" /></label>
            <fieldset>
              <legend className="mb-1 text-xs text-muted-foreground">Source</legend>
              <div className="max-h-28 space-y-0.5 overflow-auto rounded-md border border-border p-1.5">
                {(state?.sources ?? []).map((src) => (
                  <label key={src.id} className="flex items-start gap-1.5 text-[0.7rem]" title={src.label}>
                    <input type="checkbox" checked={sources.includes(src.id)} onChange={(e) => setSources((cur) => (e.target.checked ? [...cur, src.id] : cur.filter((x) => x !== src.id)))} className="mt-0.5 accent-primary" />
                    <span><span className="font-mono">{src.id}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Related notes</span>
              <select multiple value={related} onChange={(e) => setRelated([...e.target.selectedOptions].map((o) => o.value))} className="h-24 w-full rounded-md border border-input bg-background px-1 text-xs">
                {titles.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-border p-2 text-xs">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-emerald-400" />
              <span><span className="font-medium">I confirm this information is accurate.</span> <span className="text-muted-foreground">Without this, the note is saved as “awaiting confirmation” and the AI never states it as fact.</span></span>
            </label>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
          <Button onClick={() => void save()} disabled={working !== null || !text.trim() || !title.trim()} className="gap-1.5">
            {working === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Save as draft and review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeachDialog;
