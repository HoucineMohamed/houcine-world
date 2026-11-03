import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { studioApi, StudioError, type KnowledgeEvent, type Publication } from "@/services/knowledgeStudio";
import { Pill, timeAgo } from "./ui";

// The activity log: every knowledge-management operation (drafts, publications, index updates, failures, feedback,
// AI access changes), newest first, with who and when. Append-only on the server; private to super admins. Versions of
// a note are compared and restored from the note's History tab.

const LABEL: Record<string, string> = {
  draft_saved: "Draft saved",
  draft_discarded: "Unpublished changes discarded",
  publish_requested: "Publication requested",
  validation_failed: "Validation failed",
  published_commit: "Saved to the repository",
  index_live: "AI index updated (live)",
  publish_failed: "Publication failed",
  sync_retried: "Synchronization retried",
  feedback: "Playground feedback",
  review_resolved: "Review item closed",
  access_changed: "AI access changed (draft)",
};

const tone = (kind: string) => (kind === "index_live" ? "published" : kind === "publish_failed" || kind === "validation_failed" ? "out" : kind === "access_changed" ? "review" : kind.startsWith("publish") ? "draft" : "neutral");

const Activity = () => {
  const [events, setEvents] = useState<KnowledgeEvent[] | null>(null);
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [more, setMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (before?: number) => {
    setLoading(true);
    try {
      const r = await studioApi.activity(before);
      setEvents((cur) => (before ? [...(cur ?? []), ...r.events] : r.events));
      if (!before) setPubs(r.publications);
      setMore(r.events.length === 50);
      setError(null);
    } catch (e) {
      setError(e instanceof StudioError ? e.message : "The activity could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !events) return <p role="alert" className="text-sm">{error}</p>;
  if (!events) return <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1fr_340px]">
      <section aria-label="Activity" className="rounded-lg border border-border bg-card/30">
        <h2 className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</h2>
        {events.length === 0 && <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>}
        <ol className="divide-y divide-border/60">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2 text-sm">
              <span className="w-28 shrink-0 text-xs text-muted-foreground" title={new Date(e.at).toLocaleString()}>{timeAgo(e.at)}</span>
              <Pill tone={tone(e.kind)}>{LABEL[e.kind] ?? e.kind}</Pill>
              <span className="min-w-0 flex-1">
                {e.path && <Link to={`/workspace/knowledge/notes?path=${encodeURIComponent(e.path)}`} className="text-accent hover:underline">{e.path}</Link>}
                {Array.isArray(e.detail.paths) && <span className="text-muted-foreground"> {(e.detail.paths as string[]).join(", ")}</span>}
                {typeof e.detail.code === "string" && <span className="text-rose-300"> ({e.detail.code})</span>}
                {typeof e.detail.commit === "string" && <code className="ml-1 text-xs text-muted-foreground">{(e.detail.commit as string).slice(0, 7)}</code>}
              </span>
              <span className="text-xs text-muted-foreground">{e.actor_email ?? (e.kind === "index_live" || e.kind === "publish_failed" ? "system" : "")}</span>
            </li>
          ))}
        </ol>
        {more && <div className="p-3"><Button size="sm" variant="outline" disabled={loading} onClick={() => void load(events[events.length - 1]?.id)}>{loading ? "Loading…" : "Load older"}</Button></div>}
      </section>
      <section aria-label="Publications" className="rounded-lg border border-border bg-card/30">
        <h2 className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Publications</h2>
        <ul className="divide-y divide-border/60">
          {pubs.map((p) => (
            <li key={p.id} className="space-y-1 px-4 py-2 text-xs">
              <div className="flex items-center gap-2">
                <Pill tone={p.status === "live" ? "published" : p.status === "failed" ? "out" : "draft"}>{p.status}</Pill>
                <span className="text-muted-foreground">{timeAgo(p.requested_at)}</span>
                {p.commit_sha && <code className="ml-auto text-muted-foreground">{p.commit_sha.slice(0, 7)}</code>}
              </div>
              <p className="truncate">{p.paths.join(", ")}</p>
              {p.error_code && <p className="text-rose-300">{p.error_code}{p.attempts > 1 ? ` · ${p.attempts} attempts` : ""}</p>}
            </li>
          ))}
          {pubs.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">None yet.</li>}
        </ul>
      </section>
    </div>
  );
};

export default Activity;
