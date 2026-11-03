import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, FolderOpen, ChevronRight, Plus, X, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { studioApi, type NoteSummary } from "@/services/knowledgeStudio";
import { BRAND_LABELS, TYPE_LABELS, VISIBILITY_INFO } from "@/lib/knowledge/note";
import { useStudio } from "./StudioContext";
import { BrandDot, noteStatus, Pill } from "./ui";
import NoteEditor from "./NoteEditor";

// The knowledge explorer: navigation on the left (search, folders, filters, recent changes), the note in the middle,
// its properties on the right (NoteEditor). The selected note and the filters live in the address, so a link from
// the graph, the search or the review queue opens exactly that note.

type Filters = { brand: string; type: string; visibility: string; tag: string; status: string; archived: boolean };

const folderOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "(root)");

const Explorer = () => {
  const { state } = useStudio();
  const [params, setParams] = useSearchParams();
  const selected = params.get("path");
  const isNew = params.get("new") === "1";
  const [query, setQuery] = useState("");
  const [serverResults, setServerResults] = useState<{ path: string; title: string; brand: string; snippet: string; matchedIn: string; visibility: string }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const filters: Filters = {
    brand: params.get("brand") ?? "",
    type: params.get("type") ?? "",
    visibility: params.get("visibility") ?? "",
    tag: params.get("tag") ?? "",
    status: params.get("status") ?? "",
    archived: params.get("archived") === "1",
  };

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key !== "path" });
  };
  const openNote = (path: string) => {
    const next = new URLSearchParams(params);
    next.set("path", path);
    next.delete("new");
    setParams(next);
  };

  const notes = useMemo(() => state?.notes ?? [], [state?.notes]);
  const tags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))].sort(), [notes]);
  const lower = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      notes
        .filter((n) => (filters.archived ? n.archived : !n.archived || n.draft))
        .filter((n) => !filters.brand || n.brand === filters.brand)
        .filter((n) => !filters.type || n.type === filters.type)
        .filter((n) => !filters.visibility || n.visibility === filters.visibility)
        .filter((n) => !filters.tag || n.tags.includes(filters.tag))
        .filter((n) => !filters.status || noteStatus(n).label === filters.status)
        .filter((n) => !lower || [n.title ?? "", n.path, n.id ?? "", ...n.tags, ...n.aliases].some((v) => v.toLowerCase().includes(lower))),
    [notes, filters.archived, filters.brand, filters.type, filters.visibility, filters.tag, filters.status, lower],
  );
  const byFolder = useMemo(() => {
    const map = new Map<string, NoteSummary[]>();
    for (const n of visible) {
      const f = folderOf(n.path);
      map.set(f, [...(map.get(f) ?? []), n]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [visible]);
  const recent = useMemo(() => notes.filter((n) => n.draft).sort((a, b) => (b.draft!.updatedAt ?? "").localeCompare(a.draft!.updatedAt ?? "")).slice(0, 6), [notes]);
  const activeFilters = Object.entries(filters).filter(([, v]) => v).length;

  const runServerSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setServerResults((await studioApi.search(query.trim())).results);
    } catch {
      setServerResults([]);
    } finally {
      setSearching(false);
    }
  };

  const select = (label: string, key: keyof Filters, options: [string, string][]) => (
    <label className="block text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <select value={String(filters[key] || "")} onChange={(e) => setParam(key, e.target.value)} className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <option value="">All</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );

  const sidebar = (
    <aside className={cn("flex min-h-0 flex-col gap-3", selected || isNew ? "hidden lg:flex" : "flex")} aria-label="Knowledge navigation">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setServerResults(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") void runServerSearch(); }}
            placeholder="Search notes…"
            aria-label="Search notes (Enter searches all text)"
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Button size="sm" variant={activeFilters ? "secondary" : "outline"} className="h-9 px-2.5" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-label="Filters">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />{activeFilters > 0 && <span className="ml-1 text-xs">{activeFilters}</span>}
        </Button>
      </div>
      {query.trim() && (
        <button type="button" onClick={() => void runServerSearch()} className="-mt-1 text-left text-xs text-muted-foreground hover:text-foreground">
          {searching ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> : null}Press Enter to search all text and related words
        </button>
      )}
      {showFilters && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2.5">
          {select("Brand", "brand", Object.entries(BRAND_LABELS))}
          {select("Category", "type", Object.entries(TYPE_LABELS))}
          {select("Visibility", "visibility", Object.entries(VISIBILITY_INFO).map(([k, v]) => [k, v.label]))}
          {select("Status", "status", ["Published", "Draft", "Pending publication", "Needs review", "Archive pending"].map((s) => [s, s]))}
          {select("Tag", "tag", tags.map((t) => [t, t]))}
          <label className="flex items-end gap-2 pb-1.5 text-xs">
            <input type="checkbox" checked={filters.archived} onChange={(e) => setParam("archived", e.target.checked ? "1" : "")} className="h-4 w-4 accent-primary" />
            Archived notes
          </label>
          {activeFilters > 0 && (
            <button type="button" onClick={() => setParams(selected ? { path: selected } : {})} className="col-span-2 text-left text-xs text-muted-foreground hover:text-foreground"><X className="mr-1 inline h-3 w-3" />Clear filters</button>
          )}
        </div>
      )}
      <Button size="sm" variant="outline" className="justify-start gap-1.5" onClick={() => setParams({ new: "1" })}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New note
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card/30 p-1.5 lg:max-h-[calc(100vh-14rem)]">
        {serverResults ? (
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
              <span>{serverResults.length} result(s) for “{query}”</span>
              <button type="button" onClick={() => setServerResults(null)} className="hover:text-foreground">Back to folders</button>
            </div>
            <ul>
              {serverResults.map((r) => (
                <li key={r.path}>
                  <button type="button" onClick={() => openNote(r.path)} className={cn("w-full rounded-md px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected === r.path && "bg-muted")}>
                    <span className="flex items-center gap-1.5 text-sm"><BrandDot brand={r.brand} /> <span className="truncate">{r.title}</span></span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{r.snippet}</span>
                    <span className="text-[0.65rem] text-muted-foreground/70">matched in {r.matchedIn} · {r.visibility}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            {recent.length > 0 && !lower && !activeFilters && (
              <div className="mb-2">
                <div className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">Unpublished changes</div>
                {recent.map((n) => (
                  <button key={`r-${n.path}`} type="button" onClick={() => openNote(n.path)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60", selected === n.path && "bg-muted")}>
                    <BrandDot brand={n.brand} /> <span className="truncate">{n.title ?? n.path}</span>
                  </button>
                ))}
              </div>
            )}
            {byFolder.map(([folder, list]) => {
              const open = openFolders[folder] ?? (Boolean(lower) || Boolean(activeFilters) || list.some((n) => n.path === selected) || byFolder.length <= 4 || folder.includes("la-rosa-view"));
              return (
                <div key={folder}>
                  <button type="button" onClick={() => setOpenFolders((o) => ({ ...o, [folder]: !open }))} aria-expanded={open} className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground hover:text-foreground">
                    <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} aria-hidden="true" />
                    <FolderOpen className="h-3 w-3" aria-hidden="true" /> {folder}
                    <span className="ml-auto tabular-nums">{list.length}</span>
                  </button>
                  {open && (
                    <ul className="mb-1 ml-3 border-l border-border/60 pl-1">
                      {list.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? "")).map((n) => {
                        const st = noteStatus(n);
                        return (
                          <li key={n.path}>
                            <button type="button" onClick={() => openNote(n.path)} className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected === n.path && "bg-muted")} title={n.path}>
                              <BrandDot brand={n.brand} />
                              <span className={cn("min-w-0 flex-1 truncate", n.archived && "text-muted-foreground line-through")}>{n.title ?? n.path}</span>
                              {st.label !== "Published" && <Pill tone={st.tone}>{st.label === "Pending publication" ? "Edited" : st.label}</Pill>}
                              {n.visibility !== "public" && <span className="text-[0.6rem] uppercase text-muted-foreground" title={VISIBILITY_INFO[n.visibility ?? ""]?.help}>{n.visibility === "internal" ? "int" : "res"}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
            {byFolder.length === 0 && <p className="p-3 text-sm text-muted-foreground">No note matches.</p>}
          </>
        )}
      </div>
    </aside>
  );

  return (
    <div className="grid min-h-[70vh] gap-4 lg:grid-cols-[270px_1fr]">
      {sidebar}
      {selected || isNew ? (
        <NoteEditor key={isNew ? "new" : selected!} path={isNew ? null : selected} onOpen={openNote} onClose={() => setParams({})} />
      ) : (
        <div className="hidden items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground lg:flex">
          Select a note to read or edit it, or create a new one.
        </div>
      )}
    </div>
  );
};

export default Explorer;
