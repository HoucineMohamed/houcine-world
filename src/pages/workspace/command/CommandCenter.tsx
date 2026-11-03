import React, { Suspense } from "react";
import { Link, Navigate, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Building2, Gauge, LineChart, Wallet, Users, FolderKanban, Layers, History, FileText, Bot, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { CommandProvider, useCommand } from "@/components/command/context";
import { ErrorBox, fmtDateTime } from "@/components/command/ui";
import { PERIOD_LABELS, type PeriodPreset } from "../../../../supabase/functions/_shared/command/metrics.ts";

// Houcine.world Command Center (docs/command-center.md). The same screens serve two scopes:
//   /workspace/command/...           GLOBAL: super admins, every brand (with a brand filter)
//   /workspace/:brandId/command/...  BRAND: inside the brand's workspace, that brand only (multi-brand admins switch)
// What anyone sees is decided by the database's row-level security; these screens only choose what to ask for.

const Overview = React.lazy(() => import("@/components/command/Overview"));
const Analytics = React.lazy(() => import("@/components/command/Analytics"));
const Finance = React.lazy(() => import("@/components/command/Finance"));
const Crm = React.lazy(() => import("@/components/command/Crm"));
const Projects = React.lazy(() => import("@/components/command/Projects"));
const Brands = React.lazy(() => import("@/components/command/Brands"));
const Activity = React.lazy(() => import("@/components/command/Activity"));
const Reports = React.lazy(() => import("@/components/command/Reports"));
const Analyst = React.lazy(() => import("@/components/command/Analyst"));

export const SECTIONS = [
  { id: "", label: "Overview", icon: Gauge, Component: Overview },
  { id: "analytics", label: "Analytics", icon: LineChart, Component: Analytics },
  { id: "finance", label: "Finance", icon: Wallet, Component: Finance },
  { id: "crm", label: "CRM", icon: Users, Component: Crm },
  { id: "projects", label: "Projects", icon: FolderKanban, Component: Projects },
  { id: "brands", label: "Brands", icon: Layers, Component: Brands },
  { id: "activity", label: "Activity", icon: History, Component: Activity },
  { id: "reports", label: "Reports", icon: FileText, Component: Reports },
  { id: "analyst", label: "AI Analyst", icon: Bot, Component: Analyst },
] as const;

const PRESETS = Object.keys(PERIOD_LABELS) as PeriodPreset[];

const Filters = () => {
  const { mode, brands, scopeBrands, period } = useCommand();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { section = "" } = useParams();
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next, { replace: true });
  };
  const selected = params.get("brands")?.split(",").filter(Boolean) ?? [];
  const toggleBrand = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    set({ brands: next.length ? next.join(",") : null });
  };
  return (
    <div className="flex flex-wrap items-end gap-2">
      {mode === "brand" && brands.length > 1 && (
        <label className="text-xs">
          <span className="mb-1 block text-muted-foreground">Brand</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={scopeBrands[0]?.id ?? ""}
            onChange={(e) => navigate(`/workspace/${e.target.value}/command${section ? `/${section}` : ""}?${params.toString()}`)}
            aria-label="Switch brand"
          >
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}
      {mode === "global" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5"><Building2 className="h-3.5 w-3.5" aria-hidden="true" />{selected.length ? `${selected.length} brand${selected.length > 1 ? "s" : ""}` : "All brands"}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <p className="px-1 pb-1 text-xs text-muted-foreground">Show only these brands</p>
            {brands.map((b) => (
              <label key={b.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                <input type="checkbox" checked={selected.includes(b.id)} onChange={() => toggleBrand(b.id)} className="accent-primary" /> {b.name}
              </label>
            ))}
            {selected.length > 0 && <button type="button" className="mt-1 px-1 text-xs underline" onClick={() => set({ brands: null })}>All brands</button>}
          </PopoverContent>
        </Popover>
      )}
      <label className="text-xs">
        <span className="mb-1 block text-muted-foreground">Period</span>
        <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={period.preset} onChange={(e) => set({ period: e.target.value, ...(e.target.value === "custom" ? { from: period.start, to: period.end } : { from: null, to: null }) })} aria-label="Period">
          {PRESETS.map((p) => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
        </select>
      </label>
      {period.preset === "custom" && (
        <>
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">From</span><input type="date" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={params.get("from") ?? period.start} onChange={(e) => set({ from: e.target.value })} /></label>
          <label className="text-xs"><span className="mb-1 block text-muted-foreground">To</span><input type="date" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={params.get("to") ?? period.end} onChange={(e) => set({ to: e.target.value })} /></label>
        </>
      )}
    </div>
  );
};

const Frame = () => {
  const { mode, scopeBrands, period, data, loading, error, reload, link } = useCommand();
  const { section = "" } = useParams();
  const current = SECTIONS.find((s) => s.id === section);
  if (!current) return <Navigate to={link("")} replace />;
  const Component = current.Component;
  return (
    <div className="command-center mx-auto w-full max-w-[1500px] space-y-5 text-sm">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{mode === "global" ? "Houcine.world · Global" : "Brand"} Command Center</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {mode === "global" ? "Ecosystem" : scopeBrands[0]?.name ?? "Brand"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {period.label}: {period.start} to {period.end}
            {mode === "global" && ` · ${scopeBrands.length} brand${scopeBrands.length === 1 ? "" : "s"}`}
            {data && <> · records loaded {fmtDateTime(data.loadedAt)} (not live: refresh to update)</>}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Filters />
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={reload} disabled={loading} aria-label="Refresh the records">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} aria-hidden="true" /> Refresh
          </Button>
        </div>
      </header>
      <nav aria-label="Command Center" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <NavLink key={id || "overview"} to={link(id)} end className={({ isActive }) => cn("flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {label}
          </NavLink>
        ))}
      </nav>
      {data && data.truncated.length > 0 && (
        <p role="status" className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
          Some tables have more records than this page reads at once ({data.truncated.join(", ")}): figures cover the most recent ones only. Narrow the brands to see complete figures.
        </p>
      )}
      {error && <ErrorBox message={`The records could not be loaded: ${error}`} onRetry={reload} />}
      <Suspense fallback={<p className="text-sm text-muted-foreground" role="status">Loading…</p>}>
        <Component />
      </Suspense>
    </div>
  );
};

/** /workspace/command/... : the global Command Center (super admins), a page of its own. */
export const GlobalCommandCenter = () => {
  const { isSuperAdmin } = useWorkspace();
  if (!isSuperAdmin) return <Navigate to="/workspace/denied" replace />;
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-3 md:px-8">
        <Link to="/workspace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Workspace</Link>
      </div>
      <main className="p-4 md:p-8">
        <CommandProvider><Frame /></CommandProvider>
      </main>
    </div>
  );
};

/** /workspace/:brandId/command/... : one brand, inside its workspace (BrandGuard has already checked access). */
export const BrandCommandCenter = () => {
  const { brandId } = useParams();
  return <CommandProvider brandId={brandId}><Frame /></CommandProvider>;
};
