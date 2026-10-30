import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Check, X, ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioApi, StudioError, type FeedbackSummaryRow, type ReviewItem } from "@/services/knowledgeStudio";
import { useStudio } from "./StudioContext";
import { BrandDot, brandLabel, Pill, timeAgo } from "./ui";

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

const RATING_LABELS = { correct: "Correct", incomplete: "Incomplete", incorrect: "Incorrect", missing: "Missing knowledge", outdated: "Outdated" } as const;

/** Playground feedback counted per brand and kind (numbers only): where the knowledge needs work. */
const FeedbackSummary = ({ rows }: { rows: FeedbackSummaryRow[] }) => {
  if (rows.length === 0) return null;
  const ratings = Object.keys(RATING_LABELS) as (keyof typeof RATING_LABELS)[];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <caption className="px-3 pt-2 text-left font-semibold text-muted-foreground">Playground feedback by brand (open / all)</caption>
        <thead className="text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-medium">Brand</th>
            {ratings.map((r) => <th key={r} scope="col" className="px-3 py-1.5 font-medium">{RATING_LABELS[r]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.brand} className="border-t border-border">
              <th scope="row" className="px-3 py-1.5 font-medium">
                <span className="flex items-center gap-1.5">{row.brand === "unknown" ? "No note used" : <><BrandDot brand={row.brand} /> {brandLabel(row.brand)}</>}</span>
              </th>
              {ratings.map((r) => (
                <td key={r} className={`px-3 py-1.5 tabular-nums ${r !== "correct" && row.ratings[r].open > 0 ? "text-amber-200" : "text-muted-foreground"}`}>
                  {row.ratings[r].total === 0 ? "—" : `${row.ratings[r].open} / ${row.ratings[r].total}`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Review = () => {
  const { setTeachOpen, retrySync, publication } = useStudio();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [summary, setSummary] = useState<FeedbackSummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [resolution, setResolution] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const r = await studioApi.review();
      setItems(r.items);
      setSummary(r.feedbackSummary ?? []);
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
      <FeedbackSummary rows={summary} />
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
