import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Check, X, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioApi, StudioError, type ReviewItem } from "@/services/knowledgeStudio";
import { useStudio } from "./StudioContext";
import { Pill, timeAgo } from "./ui";

// The review queue: everything that needs the owner's attention, derived by the server from the notes and the logs
// (playground feedback, failed publications, note problems, out-of-date drafts, sections awaiting confirmation or
// outdated, missing tags, notes not checked for six months). Opening an item leads to the note to fix; feedback items
// are closed here once handled. Nothing in this queue changes knowledge by itself.

const KINDS: Record<string, { label: string; tone: "out" | "pending" | "review" | "neutral" | "archived" }> = {
  feedback_incorrect: { label: "Incorrect answer", tone: "out" },
  feedback_incomplete: { label: "Incomplete answer", tone: "pending" },
  feedback_missing: { label: "Missing knowledge", tone: "pending" },
  feedback_outdated: { label: "Outdated answer", tone: "pending" },
  publication_failed: { label: "Publication failed", tone: "out" },
  validation: { label: "Note problem", tone: "out" },
  draft_conflict: { label: "Draft out of date", tone: "out" },
  awaiting_confirmation: { label: "Awaiting confirmation", tone: "review" },
  outdated: { label: "Outdated", tone: "archived" },
  missing_metadata: { label: "Missing metadata", tone: "neutral" },
  stale: { label: "Not checked recently", tone: "neutral" },
};

const Review = () => {
  const { setTeachOpen, retrySync, publication } = useStudio();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [resolution, setResolution] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setItems((await studioApi.review()).items);
      setError(null);
    } catch (e) {
      setError(e instanceof StudioError ? e.message : "The review queue could not be loaded.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => (items ?? []).reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.kind]: (acc[i.kind] ?? 0) + 1 }), {}), [items]);
  const shown = (items ?? []).filter((i) => !filter || i.kind === filter);
  const notePath = (p?: string) => (p && p.endsWith(".md") ? p : null);

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    try {
      await studioApi.resolve(id, status, resolution[id] ?? "");
      await load();
    } catch (e) {
      setError(e instanceof StudioError ? e.message : "Could not update the item.");
    }
  };

  if (error && !items) return <p role="alert" className="text-sm">{error} <Button size="sm" variant="ghost" onClick={() => void load()}>Retry</Button></p>;
  if (!items) return <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFilter("")} className={`rounded-full border px-2.5 py-1 text-xs ${!filter ? "border-foreground/40" : "border-border text-muted-foreground"}`}>All {items.length}</button>
        {Object.entries(counts).map(([k, n]) => (
          <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full border px-2.5 py-1 text-xs ${filter === k ? "border-foreground/40" : "border-border text-muted-foreground"}`}>{KINDS[k]?.label ?? k} {n}</button>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto gap-1.5" onClick={() => void load()}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh</Button>
      </div>
      {shown.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing needs your attention here.</p>}
      <ul className="space-y-2">
        {shown.map((item, i) => {
          const kind = KINDS[item.kind] ?? { label: item.kind, tone: "neutral" as const };
          const path = notePath(item.path);
          const isFeedback = item.kind.startsWith("feedback_");
          return (
            <li key={`${item.kind}-${item.id ?? item.path ?? ""}-${i}`} className="rounded-lg border border-border bg-card/30 p-3 text-sm">
              <div className="flex flex-wrap items-start gap-2">
                <Pill tone={kind.tone}>{kind.label}</Pill>
                <p className="min-w-0 flex-1 font-medium">{item.title}</p>
                {item.at && <span className="text-xs text-muted-foreground">{timeAgo(item.at)}</span>}
              </div>
              {item.detail && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{item.detail}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {path && <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => navigate(`/workspace/knowledge/notes?path=${encodeURIComponent(path)}`)}><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open the note</Button>}
                {isFeedback && <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => setTeachOpen(true)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Teach the AI</Button>}
                {isFeedback && <Button size="sm" variant="outline" className="h-7" onClick={() => navigate("/workspace/knowledge/notes")}>Find the note to correct</Button>}
                {item.kind === "publication_failed" && publication?.id === item.id && <Button size="sm" variant="outline" className="h-7" onClick={() => void retrySync()}>Retry synchronization</Button>}
                {isFeedback && item.id && (
                  <>
                    <input value={resolution[item.id] ?? ""} onChange={(e) => setResolution((r) => ({ ...r, [item.id!]: e.target.value }))} placeholder="What you did (optional)" aria-label="Resolution" className="h-7 min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 text-xs" />
                    <Button size="sm" className="h-7 gap-1" onClick={() => void resolve(item.id!, "resolved")}><Check className="h-3.5 w-3.5" aria-hidden="true" /> Resolved</Button>
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => void resolve(item.id!, "dismissed")}><X className="h-3.5 w-3.5" aria-hidden="true" /> Dismiss</Button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Review;
