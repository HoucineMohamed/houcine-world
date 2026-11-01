import React, { Suspense } from "react";
import { Link, Navigate, NavLink } from "react-router-dom";
import { ArrowLeft, Brain, LayoutDashboard, FileText, Network, MessagesSquare, Inbox, History, Settings, Plus, Loader2, CheckCircle2, AlertTriangle, RotateCcw, X, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { StudioProvider, useStudio } from "@/components/knowledge/StudioContext";
import Overview from "@/components/knowledge/Overview";
import Explorer from "@/components/knowledge/Explorer";
import TeachDialog from "@/components/knowledge/TeachDialog";

// Knowledge Studio (/workspace/knowledge/...): the owner's place to explore, edit, publish and test the Houcine.world
// knowledge brain. Super admins only: this page checks it for the interface, and the knowledge-studio Edge Function
// enforces it on the server for every request (docs/knowledge-studio.md).

const Graph = React.lazy(() => import("@/components/knowledge/Graph"));
const Playground = React.lazy(() => import("@/components/knowledge/Playground"));
const Review = React.lazy(() => import("@/components/knowledge/Review"));
const Activity = React.lazy(() => import("@/components/knowledge/Activity"));
const StudioSettings = React.lazy(() => import("@/components/knowledge/StudioSettings"));

export type StudioSection = "overview" | "notes" | "graph" | "playground" | "review" | "activity" | "settings";

const NAV: { section: StudioSection; to: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { section: "overview", to: "/workspace/knowledge", label: "Overview", icon: LayoutDashboard },
  { section: "notes", to: "/workspace/knowledge/notes", label: "Notes", icon: FileText },
  { section: "graph", to: "/workspace/knowledge/graph", label: "Graph", icon: Network },
  { section: "playground", to: "/workspace/knowledge/playground", label: "AI Playground", icon: MessagesSquare },
  { section: "review", to: "/workspace/knowledge/review", label: "Review", icon: Inbox },
  { section: "activity", to: "/workspace/knowledge/activity", label: "Activity", icon: History },
  { section: "settings", to: "/workspace/knowledge/settings", label: "Settings", icon: Settings },
];

const STEPS = [
  { phase: "validating", label: "Validating" },
  { phase: "committing", label: "Saving to the repository" },
  { phase: "deploying", label: "Updating the AI's index" },
  { phase: "live", label: "Live" },
] as const;

const PublishBar = () => {
  const { phase, publishMessage, publishErrors, retrySync, dismissPublication, publication } = useStudio();
  if (phase === "idle") return null;
  const busy = phase === "validating" || phase === "committing" || phase === "deploying";
  const current = STEPS.findIndex((s) => s.phase === phase);
  return (
    <div role="status" aria-live="polite" className={cn("border-b px-4 py-2.5 text-sm", phase === "failed" ? "border-rose-500/30 bg-rose-500/10" : phase === "live" ? "border-emerald-500/30 bg-emerald-500/10" : "border-sky-500/30 bg-sky-500/5")}>
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2">
        {busy ? <Loader2 className="h-4 w-4 animate-spin text-sky-300" aria-hidden="true" /> : phase === "live" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 text-rose-300" aria-hidden="true" />}
        <ol className="hidden items-center gap-2 text-xs md:flex" aria-label="Publication steps">
          {STEPS.map((s, i) => (
            <li key={s.phase} className={cn("flex items-center gap-1.5", i < current || phase === "live" ? "text-emerald-300" : i === current && phase !== "failed" ? "text-foreground" : "text-muted-foreground")}>
              <CircleDot className="h-3 w-3" aria-hidden="true" />
              {s.label}
              {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
            </li>
          ))}
        </ol>
        <p className="flex-1 min-w-[200px]">{publishMessage}</p>
        {phase === "failed" && publication?.commit_sha && publication.status === "failed" && (
          <Button size="sm" variant="outline" onClick={() => void retrySync()} className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Retry synchronization</Button>
        )}
        {!busy && (
          <button type="button" onClick={dismissPublication} className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {publishErrors.length > 0 && (
        <ul className="mx-auto mt-2 max-h-40 max-w-[1600px] list-disc overflow-auto pl-8 text-xs text-rose-200">
          {publishErrors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </div>
  );
};

const SyncBadge = () => {
  const { state } = useStudio();
  if (!state) return null;
  const sync = state.index.sync;
  const map = {
    in_sync: { cls: "text-emerald-300 border-emerald-500/30", text: "AI in sync" },
    out_of_sync: { cls: "text-rose-300 border-rose-500/30", text: "AI out of sync" },
    publishing: { cls: "text-sky-300 border-sky-500/30", text: "Publishing…" },
    unknown: { cls: "text-muted-foreground border-border", text: "AI status unknown" },
  } as const;
  const m = map[sync];
  return (
    <span className={cn("hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:inline-flex", m.cls)} title={`Published index ${state.index.expected ?? "?"} · AI serves ${state.index.live ?? "?"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {m.text}
    </span>
  );
};

const Body = ({ section }: { section: StudioSection }) => {
  const { loading, error, reload, setTeachOpen, state } = useStudio();
  return (
    <div className="knowledge-studio flex min-h-screen flex-col bg-background text-sm text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5">
          <Link to="/workspace" className="rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Back to the workspace">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Brain className="h-5 w-5 text-accent" aria-hidden="true" />
          <h1 className="font-display text-base font-semibold tracking-wide">Knowledge Studio</h1>
          <span className="hidden text-xs text-muted-foreground lg:inline">Houcine.world knowledge brain</span>
          <div className="ml-auto flex items-center gap-2">
            <SyncBadge />
            <Button size="sm" onClick={() => setTeachOpen(true)} disabled={!state?.canPublish} title={state?.canPublish ? undefined : "Publishing is not set up yet (Settings)"} className="gap-1.5">
              <Plus className="h-4 w-4" aria-hidden="true" /> Teach the AI
            </Button>
          </div>
        </div>
        <nav aria-label="Knowledge Studio" className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 pb-1.5">
          {NAV.map(({ to, label, icon: Icon, section: s }) => (
            <NavLink
              key={to}
              to={to}
              end={s === "overview"}
              className={({ isActive }) => cn("flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        <PublishBar />
      </header>
      <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4">
        {loading ? (
          <div className="flex items-center gap-2 py-20 text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Loading the knowledge brain…</div>
        ) : error && !state ? (
          <div className="mx-auto max-w-md py-20 text-center" role="alert">
            <p className="mb-4">{error}</p>
            <Button onClick={() => void reload()}>Try again</Button>
          </div>
        ) : (
          <Suspense fallback={<div className="py-20 text-muted-foreground" role="status">Loading…</div>}>
            {section === "overview" && <Overview />}
            {section === "notes" && <Explorer />}
            {section === "graph" && <Graph />}
            {section === "playground" && <Playground />}
            {section === "review" && <Review />}
            {section === "activity" && <Activity />}
            {section === "settings" && <StudioSettings />}
          </Suspense>
        )}
      </main>
      <TeachDialog />
    </div>
  );
};

const KnowledgeStudio = ({ section }: { section: StudioSection }) => {
  const { isSuperAdmin } = useWorkspace();
  // Interface check only; the server refuses every Knowledge Studio request from anyone else.
  if (!isSuperAdmin) return <Navigate to="/workspace/denied" replace />;
  return (
    <StudioProvider>
      <Body section={section} />
    </StudioProvider>
  );
};

export default KnowledgeStudio;
