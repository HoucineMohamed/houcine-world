import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bold, Italic, Heading2, List, Link2, Brackets, Quote, Save, Undo2, Send, Archive, ArchiveRestore, Loader2, AlertTriangle, History, Eye, Pencil, Columns2, Code2, GitCompare, X, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { studioApi, StudioError, type Draft, type NoteDetail, type Overlap } from "@/services/knowledgeStudio";
import { MarkdownView, type WikiLinkResolver } from "@/lib/knowledge/markdown";
import { diffLines, diffStats } from "@/lib/knowledge/diff";
import { BRAND_LABELS, STATUS_INFO, TYPE_LABELS, VISIBILITY_INFO, defaultPathFor, field, idFor, listOf, parseList, readNote, today, writeNote, type Fields } from "@/lib/knowledge/note";
import { useStudio } from "./StudioContext";
import { BrandDot, noteStatus, Pill, StatusPill, VisibilityPill, timeAgo } from "./ui";

// One note: the Markdown editor (edit, preview, side by side, raw source, compare, history) in the middle and its
// properties on the right. Saving writes a DRAFT (never what the AI uses); publishing goes through the Studio's
// publication, which validates everything and reports "live" only once the AI serves it. Concurrency: the draft's
// version and the file version it started from travel with every save; a clash is shown, never silently resolved.

type Mode = "edit" | "preview" | "split" | "source" | "compare" | "history";

const normalize = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join(" ");

const NEW_TEMPLATE = (title: string) => `# ${title || "New note"}\n\n## What this is about\nWrite the facts here, in plain sentences.\n`;

const DiffView = ({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) => {
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const stats = diffStats(lines);
  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span><span className="text-rose-300">− {beforeLabel}</span> → <span className="text-emerald-300">+ {afterLabel}</span></span>
        <span className="ml-auto">{stats.added} added · {stats.removed} removed</span>
      </div>
      <pre className="max-h-[60vh] overflow-auto p-2 font-mono text-xs leading-5">
        {lines.map((l, i) => (
          <div key={i} className={cn("whitespace-pre-wrap px-1", l.kind === "added" && "bg-emerald-500/10 text-emerald-200", l.kind === "removed" && "bg-rose-500/10 text-rose-200 line-through decoration-rose-400/40")}>
            {l.kind === "added" ? "+ " : l.kind === "removed" ? "− " : "  "}{l.text || " "}
          </div>
        ))}
      </pre>
    </div>
  );
};

interface Props {
  path: string | null;
  onOpen: (path: string) => void;
  onClose: () => void;
}

const NoteEditor = ({ path, onOpen, onClose }: Props) => {
  const { state, reload, publish, phase } = useStudio();
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [body, setBody] = useState("");
  const [source, setSource] = useState("");
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [mode, setMode] = useState<Mode>("split");
  const [newPath, setNewPath] = useState("");
  const [pathTouched, setPathTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error" | "info"; text: string } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [overlaps, setOverlaps] = useState<Overlap[]>([]);
  const [conflict, setConflict] = useState<Draft | null>(null);
  const [historyView, setHistoryView] = useState<{ sha: string; content: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const isNew = path === null;

  // ----- load -----
  const load = useCallback(async () => {
    if (!path) {
      const f: Fields = { id: "", title: "", brand: "la-rosa-view", type: "topic", visibility: "public", status: "pending", tags: [], aliases: [], sources: [], updated: today() };
      setFields(f);
      setBody(NEW_TEMPLATE(""));
      setMode("split");
      return;
    }
    try {
      const d = await studioApi.note(path);
      setDetail(d);
      const text = d.draft?.operation === "upsert" && d.draft.content !== null ? d.draft.content : d.content ?? "";
      const parsed = readNote(text, path);
      setFields(parsed.fields);
      setBody(parsed.body);
      setDirty(false);
      setLoadError(null);
      setConflict(null);
    } catch (e) {
      setLoadError(e instanceof StudioError ? e.message : "The note could not be loaded.");
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  const markdown = useMemo(() => writeNote(fields, body), [fields, body]);
  const effectivePath = isNew ? newPath : path!;
  useEffect(() => {
    if (isNew && !pathTouched) setNewPath(defaultPathFor(field(fields, "brand") || "la-rosa-view", field(fields, "type") || "topic", field(fields, "title")));
  }, [isNew, pathTouched, fields]);

  const setField = (key: string, value: string | string[]) => {
    setFields((f) => {
      const next = { ...f, [key]: value };
      if (isNew && key === "title" && (!f.id || f.id === idFor(field(f, "brand"), field(f, "title")))) next.id = idFor(field(next, "brand"), value as string);
      if (isNew && key === "brand" && f.id === idFor(field(f, "brand"), field(f, "title"))) next.id = idFor(value as string, field(f, "title"));
      return next;
    });
    setDirty(true);
  };

  // ----- note links -----
  const byName = useMemo(() => {
    const map = new Map<string, { path: string; title: string; id: string | null }>();
    for (const n of state?.notes ?? []) {
      if (n.archived) continue;
      for (const name of [n.title ?? "", ...n.aliases]) if (name) map.set(normalize(name), { path: n.path, title: n.title ?? n.path, id: n.id });
    }
    return map;
  }, [state?.notes]);
  const resolver: WikiLinkResolver = useMemo(() => ({ resolve: (t) => byName.get(normalize(t)) ?? null, open: onOpen }), [byName, onOpen]);
  const summary = state?.notes.find((n) => n.path === path) ?? null;
  const noteId = field(fields, "id");
  const outgoing = useMemo(() => {
    const out = new Map<string, { path: string; title: string }>();
    for (const m of body.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]+)?\]\]/g)) {
      const hit = byName.get(normalize(m[1]!));
      if (hit && hit.path !== path) out.set(hit.path, hit);
    }
    return [...out.values()];
  }, [body, byName, path]);
  const backlinks = useMemo(() => (state?.notes ?? []).filter((n) => noteId && n.links.includes(noteId) && n.path !== path), [state?.notes, noteId, path]);

  // ----- editing helpers -----
  const surround = (before: string, after = before, placeholder = "text") => {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const chosen = body.slice(a, b) || placeholder;
    const next = body.slice(0, a) + before + chosen + after + body.slice(b);
    setBody(next);
    setDirty(true);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, a + before.length + chosen.length);
    });
  };
  const prefixLine = (prefix: string) => {
    const el = textarea.current;
    if (!el) return;
    const start = body.lastIndexOf("\n", el.selectionStart - 1) + 1;
    setBody(body.slice(0, start) + prefix + body.slice(start));
    setDirty(true);
    requestAnimationFrame(() => el.focus());
  };
  const insertLink = (title: string) => {
    surround(`[[${title}`, "]]", "");
    setPicker(false);
    setPickerQuery("");
  };

  // ----- debounced validation while editing (shows broken links, header problems) -----
  useEffect(() => {
    if (!dirty || !effectivePath || !state?.canPublish) return;
    const t = window.setTimeout(async () => {
      try {
        const v = await studioApi.validate(effectivePath, markdown);
        setErrors(v.errors);
        setOverlaps(v.overlaps);
      } catch {
        // validation is advisory while typing; saving validates again
      }
    }, 1500);
    return () => window.clearTimeout(t);
  }, [dirty, markdown, effectivePath, state?.canPublish]);

  // ----- actions -----
  const save = async (opts: { force?: Draft; rebase?: boolean } = {}): Promise<boolean> => {
    if (!effectivePath) {
      setNotice({ tone: "error", text: "Choose a file path for the new note." });
      return false;
    }
    setSaving(true);
    setNotice(null);
    try {
      const res = await studioApi.saveDraft({
        path: effectivePath,
        content: markdown,
        expectedVersion: opts.force ? opts.force.version : detail?.draft?.version ?? null,
        baseSha: detail?.sha ?? null,
        ...(opts.rebase && detail?.sha ? { rebaseOnto: detail.sha } : {}),
      });
      setErrors(res.errors);
      setOverlaps(res.overlaps);
      setDirty(false);
      setConflict(null);
      setNotice({ tone: res.errors.length ? "error" : "ok", text: res.errors.length ? "Draft saved, but it has problems to fix before it can be published." : "Draft saved successfully. The AI does not use it until you publish." });
      void reload();
      if (isNew) onOpen(effectivePath);
      else await load();
      return res.errors.length === 0;
    } catch (e) {
      const err = e instanceof StudioError ? e : null;
      if (err?.code === "draft_conflict") setConflict((err.data.current as Draft) ?? null);
      setNotice({ tone: "error", text: err?.message ?? "The draft could not be saved." });
      if (Array.isArray(err?.data.errors)) setErrors(err!.data.errors as string[]);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discard = async () => {
    if (!detail?.draft || !path) return;
    if (!window.confirm("Discard the unpublished changes of this note? The published version stays as it is.")) return;
    try {
      await studioApi.discard(path, detail.draft.version);
      setNotice({ tone: "info", text: "Unpublished changes discarded." });
      void reload();
      if (!detail.content) onClose();
      else await load();
    } catch (e) {
      setNotice({ tone: "error", text: e instanceof StudioError ? e.message : "Could not discard." });
    }
  };

  const publishThis = async () => {
    if (dirty && !(await save())) return;
    const target = isNew ? newPath : path!;
    await publish([target]);
  };

  const move = async (kind: "archive" | "restore") => {
    if (!path) return;
    const question = kind === "archive" ? "Archive this note? After publishing, no AI uses it; it stays in archive/ and can be restored." : "Restore this archived note? It becomes active again after publishing.";
    if (!window.confirm(question)) return;
    try {
      const res = kind === "archive" ? await studioApi.archive(path) : await studioApi.restore(path);
      setErrors(res.errors);
      setNotice({ tone: res.errors.length ? "error" : "ok", text: res.errors.length ? `${kind === "archive" ? "Archive" : "Restore"} saved as a draft, but other notes still link to it: fix the links listed below before publishing.` : `${kind === "archive" ? "Archive" : "Restore"} saved as a draft. Publish to apply it.` });
      void reload();
      await load();
    } catch (e) {
      setNotice({ tone: "error", text: e instanceof StudioError ? e.message : "Could not do that." });
    }
  };

  const viewVersion = async (sha: string) => {
    if (!path) return;
    try {
      const v = await studioApi.version(path, sha);
      setHistoryView({ sha, content: v.content });
    } catch (e) {
      setNotice({ tone: "error", text: e instanceof StudioError ? e.message : "That version could not be loaded." });
    }
  };
  const restoreVersion = () => {
    if (!historyView || !path) return;
    const parsed = readNote(historyView.content, path);
    setFields(parsed.fields);
    setBody(parsed.body);
    setDirty(true);
    setMode("split");
    setNotice({ tone: "info", text: `Loaded the version of ${historyView.sha.slice(0, 7)} into the editor. Save the draft and publish to restore it.` });
    setHistoryView(null);
  };

  // ----- derived -----
  if (loadError) return <div className="rounded-lg border border-border p-6 text-sm" role="alert">{loadError} <Button size="sm" variant="ghost" onClick={() => void load()}>Retry</Button></div>;
  if (!isNew && !detail) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading the note…</div>;
  const archived = Boolean(path?.startsWith("archive/"));
  const draft = detail?.draft ?? null;
  const published = detail?.content ?? "";
  const busy = phase === "validating" || phase === "committing" || phase === "deploying";
  const visibility = field(fields, "visibility");
  const brand = field(fields, "brand");
  const agent = state?.agents["la-rosa-view-concierge"];
  const access =
    visibility !== "public" ? { ok: false, text: `No AI can use this note: it is ${VISIBILITY_INFO[visibility]?.label.toLowerCase() ?? visibility}.` }
    : archived ? { ok: false, text: "Archived: no AI uses it." }
    : agent && agent.brands.includes(brand) ? { ok: true, text: "The La Rosa View Concierge can use this note once it is published." }
    : agent && agent.referralBrands.includes(brand) && field(fields, "type") === "overview" ? { ok: true, text: "The La Rosa View Concierge may only use it to point visitors to this brand." }
    : { ok: false, text: "The La Rosa View Concierge cannot use it: this brand is outside its access (Settings, AI access)." };
  const status = summary ? noteStatus(summary) : { tone: "draft" as const, label: "New draft", help: "Not saved yet." };
  const pickerMatches = [...byName.values()].filter((v, i, arr) => arr.findIndex((x) => x.path === v.path) === i).filter((v) => !pickerQuery || v.title.toLowerCase().includes(pickerQuery.toLowerCase())).slice(0, 8);

  const modes: { m: Mode; label: string; icon: React.ComponentType<{ className?: string }>; show?: boolean }[] = [
    { m: "edit", label: "Edit", icon: Pencil },
    { m: "split", label: "Side by side", icon: Columns2 },
    { m: "preview", label: "Preview", icon: Eye },
    { m: "source", label: "Markdown", icon: Code2 },
    { m: "compare", label: "Compare", icon: GitCompare, show: !isNew && Boolean(published) },
    { m: "history", label: "History", icon: History, show: !isNew },
  ];

  const editorArea = (
    <div className="flex min-h-[420px] flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5" role="toolbar" aria-label="Formatting">
        {[
          { icon: Bold, label: "Bold", act: () => surround("**") },
          { icon: Italic, label: "Italic", act: () => surround("*") },
          { icon: Heading2, label: "Section heading", act: () => prefixLine("## ") },
          { icon: List, label: "List", act: () => prefixLine("- ") },
          { icon: Link2, label: "Web link", act: () => surround("[", "](https://)", "text") },
          { icon: Quote, label: "Awaiting confirmation marker", act: () => prefixLine("> [!pending] ") },
        ].map(({ icon: Icon, label, act }) => (
          <button key={label} type="button" onClick={act} title={label} aria-label={label} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="relative">
          <button type="button" onClick={() => setPicker((p) => !p)} title="Link to a note ([[...]])" aria-label="Link to a note" aria-expanded={picker} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Brackets className="h-3.5 w-3.5" />
          </button>
          {picker && (
            <div className="absolute left-0 top-8 z-30 w-72 rounded-md border border-border bg-popover p-2 shadow-xl">
              <Input autoFocus value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} placeholder="Find a note to link…" className="mb-1 h-8 text-xs" onKeyDown={(e) => { if (e.key === "Escape") setPicker(false); if (e.key === "Enter" && pickerMatches[0]) insertLink(pickerMatches[0].title); }} />
              <ul className="max-h-60 overflow-auto">
                {pickerMatches.map((m) => (
                  <li key={m.path}><button type="button" onClick={() => insertLink(m.title)} className="w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted">{m.title}</button></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <span className="ml-auto text-[0.7rem] text-muted-foreground">Markdown · [[links]] connect notes</span>
      </div>
      <textarea
        ref={textarea}
        value={body}
        onChange={(e) => { setBody(e.target.value); setDirty(true); }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); void save(); }
          if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); surround("**"); }
          if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); surround("*"); }
        }}
        spellCheck
        aria-label="Note text (Markdown)"
        className="min-h-[380px] flex-1 resize-y bg-transparent p-3 font-mono text-[13px] leading-6 focus-visible:outline-none"
      />
    </div>
  );

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[1fr_300px]">
      {/* Center: the note */}
      <section className="min-w-0 rounded-lg border border-border bg-card/30" aria-label="Note editor">
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden" aria-label="Back to the list"><ArrowLeft className="h-4 w-4" /></button>
          <BrandDot brand={brand} />
          <h2 className="min-w-0 flex-1 truncate font-semibold">{field(fields, "title") || "Untitled note"}</h2>
          <Pill tone={status.tone} title={status.help}>{status.label}</Pill>
          {dirty && <Pill tone="neutral">Unsaved</Pill>}
        </header>

        {detail?.stale && draft && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm" role="alert">
            <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {detail.stale[0]!.toUpperCase() + detail.stale.slice(1)}.</p>
            <p className="mt-1 text-xs text-muted-foreground">Compare the two versions, then keep yours (it will replace the newer one when published) or start again from the newer version.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setMode("compare")}>Compare</Button>
              <Button size="sm" variant="outline" onClick={() => void save({ rebase: true })}>Keep my draft</Button>
              <Button size="sm" variant="ghost" onClick={() => void discard()}>Use the newer version</Button>
            </div>
          </div>
        )}
        {conflict && (
          <div className="border-b border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm" role="alert">
            <p className="font-medium">{conflict.updated_by_email ?? "Someone"} saved this draft {timeAgo(conflict.updated_at)} (version {conflict.version}). Nothing was overwritten.</p>
            {conflict.content && <div className="mt-2"><DiffView before={conflict.content} after={markdown} beforeLabel="their draft" afterLabel="your edit" /></div>}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => { if (conflict.content) { const p = readNote(conflict.content, effectivePath); setFields(p.fields); setBody(p.body); } setConflict(null); void load(); }}>Load their version</Button>
              <Button size="sm" variant="destructive" onClick={() => void save({ force: conflict })}>Replace it with mine</Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
          {modes.filter((x) => x.show !== false).map(({ m, label, icon: Icon }) => (
            <button key={m} type="button" onClick={() => { if (m === "source") { setSource(markdown); setSourceErrors([]); } setMode(m); }} aria-pressed={mode === m} className={cn("flex items-center gap-1 rounded-md px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", mode === m ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <div className="p-0">
          {mode === "edit" && editorArea}
          {mode === "preview" && <div className="max-h-[70vh] overflow-auto p-4"><MarkdownView source={body} links={resolver} /></div>}
          {mode === "split" && (
            <div className="grid md:grid-cols-2">
              <div className="border-b border-border md:border-b-0 md:border-r">{editorArea}</div>
              <div className="max-h-[70vh] overflow-auto p-4" aria-label="Preview"><MarkdownView source={body} links={resolver} /></div>
            </div>
          )}
          {mode === "source" && (
            <div className="p-3">
              <p className="mb-2 text-xs text-muted-foreground">The whole file, header included, exactly as it is stored. Apply to update the form and the editor.</p>
              <textarea value={source} onChange={(e) => setSource(e.target.value)} aria-label="Markdown source" className="min-h-[420px] w-full rounded-md border border-border bg-black/30 p-3 font-mono text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              {sourceErrors.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-rose-200">{sourceErrors.map((e) => <li key={e}>{e}</li>)}</ul>}
              <Button size="sm" className="mt-2" onClick={() => { const p = readNote(source, effectivePath || "note.md"); if (p.errors.length) { setSourceErrors(p.errors); return; } setFields(p.fields); setBody(p.body); setDirty(true); setMode("split"); }}>Apply</Button>
            </div>
          )}
          {mode === "compare" && <div className="p-3"><DiffView before={published} after={markdown} beforeLabel="published version" afterLabel={dirty ? "your edit" : draft ? "your draft" : "published"} /></div>}
          {mode === "history" && (
            <div className="space-y-3 p-3 text-sm">
              {historyView ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Version {historyView.sha.slice(0, 7)} compared with the editor</span>
                    <Button size="sm" variant="outline" className="ml-auto" onClick={restoreVersion}>Restore this version</Button>
                    <Button size="sm" variant="ghost" onClick={() => setHistoryView(null)} aria-label="Close"><X className="h-4 w-4" /></Button>
                  </div>
                  <DiffView before={historyView.content} after={markdown} beforeLabel={historyView.sha.slice(0, 7)} afterLabel="editor" />
                </>
              ) : (
                <>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published versions (repository)</h3>
                  {detail?.history.length ? (
                    <ul className="divide-y divide-border/60">
                      {detail.history.map((c) => (
                        <li key={c.sha} className="flex flex-wrap items-center gap-2 py-1.5">
                          <code className="text-xs text-muted-foreground">{c.sha.slice(0, 7)}</code>
                          <span className="min-w-0 flex-1 truncate">{c.message}</span>
                          <span className="text-xs text-muted-foreground">{c.author} · {timeAgo(c.date)}</span>
                          <Button size="sm" variant="ghost" className="h-7" onClick={() => void viewVersion(c.sha)}>View & compare</Button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-muted-foreground">No repository history available{state?.mode === "snapshot" ? " (read-only mode)" : ""}.</p>}
                  <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Studio activity on this note</h3>
                  {detail?.events.length ? (
                    <ul className="space-y-1 text-xs">
                      {detail.events.map((e) => <li key={e.id}><span className="text-muted-foreground">{timeAgo(e.at)}</span> · {e.kind.replace(/_/g, " ")} {e.actor_email ? `by ${e.actor_email}` : ""}</li>)}
                    </ul>
                  ) : <p className="text-xs text-muted-foreground">Nothing yet.</p>}
                </>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2">
          <Button size="sm" onClick={() => void save()} disabled={saving || (!dirty && !isNew) || !state?.canPublish} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />} Save draft
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void publishThis()} disabled={busy || saving || !state?.canPublish || (!draft && !dirty)} className="gap-1.5" title="Validate, save to the repository and update the AI's index">
            <Send className="h-3.5 w-3.5" aria-hidden="true" /> Publish
          </Button>
          {draft && <Button size="sm" variant="ghost" onClick={() => void discard()} className="gap-1.5"><Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Undo unpublished changes</Button>}
          {!isNew && !draft && !archived && detail?.content && <Button size="sm" variant="ghost" onClick={() => void move("archive")} className="ml-auto gap-1.5 text-muted-foreground"><Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive</Button>}
          {!isNew && !draft && archived && <Button size="sm" variant="ghost" onClick={() => void move("restore")} className="ml-auto gap-1.5"><ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> Restore</Button>}
        </footer>
        {notice && (
          <p role="status" className={cn("flex items-center gap-1.5 border-t px-3 py-2 text-sm", notice.tone === "ok" ? "border-emerald-500/30 text-emerald-200" : notice.tone === "error" ? "border-rose-500/30 text-rose-200" : "border-border text-muted-foreground")}>
            {notice.tone === "ok" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : notice.tone === "error" ? <AlertTriangle className="h-4 w-4" aria-hidden="true" /> : null}{notice.text}
          </p>
        )}
        {errors.length > 0 && (
          <div className="border-t border-rose-500/30 px-3 py-2">
            <p className="text-xs font-semibold text-rose-200">To fix before publishing</p>
            <ul className="mt-1 list-disc pl-5 text-xs text-rose-200">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        {overlaps.length > 0 && (
          <div className="border-t border-border px-3 py-2">
            <p className="text-xs font-semibold text-amber-200">Possibly overlapping knowledge: check these do not contradict this note</p>
            <ul className="mt-1 space-y-1.5 text-xs">
              {overlaps.slice(0, 5).map((o) => {
                const target = state?.notes.find((n) => n.id === o.noteId);
                return (
                  <li key={`${o.noteId}-${o.section}`}>
                    <button type="button" className="font-medium text-accent hover:underline" onClick={() => target && onOpen(target.path)}>{o.title} › {o.section}</button>
                    <span className="ml-1 text-muted-foreground">({STATUS_INFO[o.status]?.label}) {o.text.slice(0, 160)}…</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Right: properties */}
      <aside className="space-y-3 text-sm" aria-label="Note properties">
        <div className="space-y-3 rounded-lg border border-border bg-card/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Properties</h3>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Title</span><Input value={field(fields, "title")} onChange={(e) => setField("title", e.target.value)} className="h-8 text-sm" /></label>
          {isNew && (
            <>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Note id (never changes)</span><Input value={field(fields, "id")} onChange={(e) => setField("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="h-8 font-mono text-xs" /></label>
              <label className="block"><span className="mb-1 block text-xs text-muted-foreground">File</span><Input value={newPath} onChange={(e) => { setNewPath(e.target.value.toLowerCase()); setPathTouched(true); }} className="h-8 font-mono text-xs" /></label>
            </>
          )}
          {!isNew && <p className="font-mono text-[0.7rem] text-muted-foreground">{path} · {noteId}</p>}
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Brand</span>
              <select value={brand} onChange={(e) => setField("brand", e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                {Object.entries(BRAND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Category</span>
              <select value={field(fields, "type")} onChange={(e) => setField("type", e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="mb-1 text-xs text-muted-foreground">Visibility</legend>
            <div className="space-y-1">
              {Object.entries(VISIBILITY_INFO).map(([v, info]) => (
                <label key={v} className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-0.5 hover:bg-muted/40">
                  <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setField("visibility", v)} className="mt-1 accent-primary" />
                  <span><span className="text-xs font-medium">{info.label}</span><span className="block text-[0.7rem] text-muted-foreground">{info.help}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Confidence</span>
            <select value={field(fields, "status")} onChange={(e) => setField("status", e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs">
              {Object.entries(STATUS_INFO).map(([v, info]) => <option key={v} value={v}>{info.label}</option>)}
            </select>
            <span className="mt-1 block text-[0.7rem] text-muted-foreground">{STATUS_INFO[field(fields, "status")]?.help} A section can differ: start it with a marker line, for example “&gt; [!pending] …”.</span>
          </label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Tags (comma separated)</span><Input value={listOf(fields, "tags").join(", ")} onChange={(e) => setField("tags", parseList(e.target.value))} className="h-8 text-xs" /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Other names (aliases)</span><Input value={listOf(fields, "aliases").join(", ")} onChange={(e) => setField("aliases", parseList(e.target.value))} className="h-8 text-xs" /></label>
          <fieldset>
            <legend className="mb-1 text-xs text-muted-foreground">Sources</legend>
            <div className="max-h-32 space-y-0.5 overflow-auto rounded-md border border-border p-1.5">
              {(state?.sources ?? []).map((s) => (
                <label key={s.id} className="flex items-start gap-1.5 text-[0.7rem]" title={s.label}>
                  <input type="checkbox" checked={listOf(fields, "sources").includes(s.id)} onChange={(e) => setField("sources", e.target.checked ? [...listOf(fields, "sources"), s.id] : listOf(fields, "sources").filter((x) => x !== s.id))} className="mt-0.5 accent-primary" />
                  <span className="font-mono">{s.id}</span>
                </label>
              ))}
            </div>
            <span className="mt-1 block text-[0.7rem] text-muted-foreground">A new source (for example a written confirmation) is added to the “Sources on the public site” note.</span>
          </fieldset>
          <div className="flex items-end gap-2">
            <label className="block flex-1"><span className="mb-1 block text-xs text-muted-foreground">Last checked</span><Input type="date" value={field(fields, "updated")} onChange={(e) => setField("updated", e.target.value)} className="h-8 text-xs" /></label>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setField("updated", today())}>Today</Button>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-card/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI access</h3>
          <p className={cn("text-xs", access.ok ? "text-emerald-200" : "text-muted-foreground")}>{access.text}</p>
          <div className="flex flex-wrap gap-1.5"><VisibilityPill visibility={visibility} /><StatusPill status={field(fields, "status")} /></div>
          {summary?.sections.some((s) => s.status !== field(fields, "status")) && (
            <ul className="text-[0.7rem] text-muted-foreground">{summary.sections.filter((s) => s.status !== field(fields, "status")).map((s) => <li key={s.heading}>{s.heading}: {STATUS_INFO[s.status]?.label}</li>)}</ul>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-border bg-card/30 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related notes</h3>
          {outgoing.length === 0 && backlinks.length === 0 && <p className="text-xs text-muted-foreground">No links yet. Use [[ ]] in the text to connect notes.</p>}
          {outgoing.length > 0 && <p className="text-[0.7rem] text-muted-foreground">Links to</p>}
          <ul className="space-y-0.5">{outgoing.map((o) => <li key={o.path}><button type="button" onClick={() => onOpen(o.path)} className="min-h-6 text-left text-xs text-accent hover:underline">{o.title}</button></li>)}</ul>
          {backlinks.length > 0 && <p className="pt-1 text-[0.7rem] text-muted-foreground">Linked from</p>}
          <ul className="space-y-0.5">{backlinks.map((b) => <li key={b.path}><button type="button" onClick={() => onOpen(b.path)} className="min-h-6 text-left text-xs text-accent hover:underline">{b.title}</button></li>)}</ul>
        </div>

        {draft && (
          <div className="rounded-lg border border-border bg-card/30 p-3 text-xs text-muted-foreground">
            Draft version {draft.version}, saved {timeAgo(draft.updated_at)}{draft.updated_by_email ? ` by ${draft.updated_by_email}` : ""}.
            {draft.original_input && (
              <details className="mt-2"><summary className="cursor-pointer text-foreground/80">Your original words</summary><p className="mt-1 whitespace-pre-wrap">{draft.original_input}</p></details>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default NoteEditor;
