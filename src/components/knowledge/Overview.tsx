import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, CircleHelp, Send, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudio } from "./StudioContext";
import { BrandDot, brandLabel, noteStatus, Pill, Section, timeAgo } from "./ui";

// The knowledge dashboard: every number is derived by the server from the notes themselves (no stored statistics),
// and the top card says plainly whether the AI serves the published knowledge.

const Stat = ({ label, value, hint, to }: { label: string; value: React.ReactNode; hint?: string; to?: string }) => {
  const inner = (
    <>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-1 text-[0.7rem] text-muted-foreground/80">{hint}</div>}
    </>
  );
  return to ? (
    <Link to={to} className="rounded-lg border border-border bg-card/40 p-3 transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{inner}</Link>
  ) : (
    <div className="rounded-lg border border-border bg-card/40 p-3">{inner}</div>
  );
};

const Overview = () => {
  const { state, publish, phase, reload } = useStudio();
  if (!state) return null;
  const { stats, index } = state;
  const drafts = state.drafts;
  const busy = phase === "validating" || phase === "committing" || phase === "deploying";
  const brandMax = Math.max(1, ...Object.values(stats.byBrand));
  const errors = [...new Set([...state.validation.published, ...state.validation.working])];
  const statusCounts = state.notes.reduce<Record<string, number>>((acc, n) => {
    const s = noteStatus(n).label;
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  const syncCard =
    index.sync === "in_sync" ? { icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/5", title: "The AI uses the published knowledge", text: `The live concierge serves index ${index.live}, built from the repository's current notes.` }
    : index.sync === "publishing" ? { icon: RefreshCw, cls: "border-sky-500/30 bg-sky-500/5", title: "A publication is on its way to the AI", text: "The notes are being saved and the AI's index rebuilt. This card turns green when the AI serves it." }
    : index.sync === "out_of_sync" ? { icon: AlertTriangle, cls: "border-rose-500/30 bg-rose-500/5", title: "The AI is out of sync", text: `The repository's notes give index ${index.expected}, but the live concierge serves ${index.live}. A deployment is pending or failed (see Activity).` }
    : { icon: CircleHelp, cls: "border-border bg-card/40", title: "AI status unknown", text: "The live concierge could not be reached to compare its index." };
  const SyncIcon = syncCard.icon;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className={`rounded-lg border p-4 lg:col-span-2 ${syncCard.cls}`}>
        <div className="flex items-start gap-3">
          <SyncIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{syncCard.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{syncCard.text}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {index.notes ?? "?"} public notes · {index.passages ?? "?"} passages in the AI's index ·
              last successful update {state.lastLive ? timeAgo(state.lastLive.finished_at ?? state.lastLive.requested_at) : "not through the Studio yet"} ·
              last change {state.lastChange ? `${timeAgo(state.lastChange.at)}${state.lastChange.actor_email ? ` by ${state.lastChange.actor_email}` : ""}` : "—"}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void reload()} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {!state.canPublish && (
          <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            Read-only: publishing is not set up ({state.repoProblem === "not_configured" || state.mode === "snapshot" ? "the KNOWLEDGE_GITHUB_TOKEN secret is missing" : `the repository answered "${state.repoProblem}"`}). See <Link to="/workspace/knowledge/settings" className="underline">Settings</Link>.
          </p>
        )}
      </div>

      <Section title="Unpublished changes" actions={drafts.length > 0 && <Button size="sm" disabled={busy || !state.canPublish} onClick={() => void publish()} className="h-7 gap-1.5"><Send className="h-3.5 w-3.5" aria-hidden="true" /> Publish {drafts.length}</Button>}>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting. Everything in the Studio is published.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {drafts.map((d) => (
              <li key={d.path} className="flex items-start justify-between gap-2">
                <Link to={`/workspace/knowledge/notes?path=${encodeURIComponent(d.path)}`} className="min-w-0 truncate hover:underline">{d.path}</Link>
                <span className="shrink-0">{d.stale ? <Pill tone="out" title={d.stale}>Out of date</Pill> : <Pill tone="pending">{d.operation === "upsert" ? "Edited" : d.operation}</Pill>}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-3 lg:grid-cols-8">
        <Stat label="Notes" value={stats.total} to="/workspace/knowledge/notes" />
        <Stat label="Public" value={stats.public} hint="usable by the AI" />
        <Stat label="Internal" value={stats.internal} hint="admins only" />
        <Stat label="Restricted" value={stats.confidential} />
        <Stat label="Unpublished" value={drafts.length} />
        <Stat label="Links" value={stats.links} to="/workspace/knowledge/graph" />
        <Stat label="Awaiting confirmation" value={stats.pendingSections} hint="sections" to="/workspace/knowledge/review" />
        <Stat label="Archived" value={stats.archived} />
      </div>

      <Section title="Knowledge by brand" className="lg:col-span-2">
        <ul className="space-y-2">
          {state.brands.map((b) => (
            <li key={b} className="grid grid-cols-[minmax(120px,190px)_1fr_auto] items-center gap-3 text-sm">
              <Link to={`/workspace/knowledge/notes?brand=${b}`} className="flex min-h-6 items-center gap-2 truncate hover:underline"><BrandDot brand={b} /> {brandLabel(b)}</Link>
              <div className="h-1.5 rounded-full bg-muted" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-foreground/50" style={{ width: `${(100 * (stats.byBrand[b] ?? 0)) / brandMax}%` }} />
              </div>
              <span className="w-8 text-right tabular-nums text-muted-foreground">{stats.byBrand[b] ?? 0}</span>
            </li>
          ))}
          <li className="grid grid-cols-[minmax(120px,190px)_1fr_auto] items-center gap-3 border-t border-border/60 pt-2 text-sm">
            <span className="text-muted-foreground">People</span>
            <span />
            <span className="w-8 text-right tabular-nums text-muted-foreground">{stats.people}</span>
          </li>
        </ul>
      </Section>

      <Section title="Note status">
        <ul className="space-y-1.5 text-sm">
          {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([label, count]) => (
            <li key={label} className="flex justify-between"><span>{label}</span><span className="tabular-nums text-muted-foreground">{count}</span></li>
          ))}
          <li className="flex justify-between border-t border-border/60 pt-1.5"><span>AI index</span><span>{index.sync === "in_sync" ? <Pill tone="published">In sync</Pill> : index.sync === "out_of_sync" ? <Pill tone="out">Out of sync</Pill> : <Pill tone="neutral">{index.sync}</Pill>}</span></li>
        </ul>
      </Section>

      {errors.length > 0 && (
        <Section title={`Problems (${errors.length})`} className="lg:col-span-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-rose-200">{errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}</ul>
        </Section>
      )}
    </div>
  );
};

export default Overview;
