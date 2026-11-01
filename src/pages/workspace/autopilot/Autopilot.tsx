import React, { createContext, Suspense, useContext, useEffect, useMemo, useState } from "react";
import { Link, Navigate, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gauge, Workflow, Radar, Bot, Bell, History, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fetchAllBrands } from "@/services/brands";
import { autopilotApi } from "@/services/autopilot";
import { fmtDateTime } from "@/components/command/ui";

// Houcine.world Autopilot (docs/autopilot.md): automations, monitoring, the AI operations assistant, notifications and
// execution history. Two scopes on the same records:
//   /workspace/autopilot/...           GLOBAL: super admins (every brand and the global automations)
//   /workspace/:brandId/autopilot/...  BRAND: that brand's admins
// The database decides what anyone sees or changes; these screens only choose what to ask for.

export interface AutopilotBrand { id: string; name: string; role: string | null }
interface Ctx {
  mode: "global" | "brand";
  brands: AutopilotBrand[];
  /** Brands of this view; null = every brand plus global records (super admins, no filter). */
  brandIds: string[] | null;
  scopeBrands: AutopilotBrand[];
  canManage: boolean;
  isSuperAdmin: boolean;
  link: (section: string, extra?: Record<string, string>) => string;
  brandName: (id: string | null) => string;
  lastScan: string | null;
  scan: (force?: boolean) => Promise<void>;
  scanning: boolean;
  tick: number;
}
const AutopilotContext = createContext<Ctx | null>(null);
export const useAutopilot = () => {
  const v = useContext(AutopilotContext);
  if (!v) throw new Error("useAutopilot outside the Autopilot page");
  return v;
};

const Overview = React.lazy(() => import("@/components/autopilot/Overview"));
const Automations = React.lazy(() => import("@/components/autopilot/Automations"));
const Monitoring = React.lazy(() => import("@/components/autopilot/Monitoring"));
const Assistant = React.lazy(() => import("@/components/autopilot/Assistant"));
const Notifications = React.lazy(() => import("@/components/autopilot/Notifications"));
const Executions = React.lazy(() => import("@/components/autopilot/Executions"));
const SettingsPage = React.lazy(() => import("@/components/autopilot/Settings"));

const SECTIONS = [
  { id: "", label: "Overview", icon: Gauge, Component: Overview },
  { id: "automations", label: "Automations", icon: Workflow, Component: Automations },
  { id: "monitoring", label: "Monitoring", icon: Radar, Component: Monitoring },
  { id: "assistant", label: "AI Assistant", icon: Bot, Component: Assistant },
  { id: "notifications", label: "Notifications", icon: Bell, Component: Notifications },
  { id: "executions", label: "Execution history", icon: History, Component: Executions },
  { id: "settings", label: "Settings", icon: Settings, Component: SettingsPage },
] as const;

const Frame = ({ brandId }: { brandId?: string }) => {
  const { memberships, isSuperAdmin } = useWorkspace();
  const { section = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [all, setAll] = useState<AutopilotBrand[] | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [tick, setTick] = useState(0);
  const mode = brandId ? "brand" : "global";

  useEffect(() => {
    const own = memberships.filter((m) => m.brand).map((m) => ({ id: m.brand!.id, name: m.brand!.name, role: m.role }));
    if (!isSuperAdmin) return setAll(own);
    fetchAllBrands().then((rows) => setAll((rows as unknown as { id: string; name: string }[]).map((b) => ({ id: b.id, name: b.name, role: own.find((o) => o.id === b.id)?.role ?? null })))).catch(() => setAll(own));
  }, [memberships, isSuperAdmin]);

  const brands = useMemo(() => all ?? [], [all]);
  const filter = params.get("brand");
  const scopeBrands = mode === "brand" ? brands.filter((b) => b.id === brandId) : filter ? brands.filter((b) => b.id === filter) : brands;
  const brandIds = mode === "brand" ? [brandId!] : filter ? [filter] : isSuperAdmin ? null : brands.map((b) => b.id);
  const canManage = isSuperAdmin || (scopeBrands.length > 0 && scopeBrands.every((b) => b.role === "brand_admin"));
  const base = mode === "brand" ? `/workspace/${brandId}/autopilot` : "/workspace/autopilot";
  const link = (s: string, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams();
    if (filter && mode === "global") q.set("brand", filter);
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    const qs = q.toString();
    return `${base}${s ? `/${s}` : ""}${qs ? `?${qs}` : ""}`;
  };
  const scan = async (force = false) => {
    setScanning(true);
    try {
      const r = await autopilotApi.tick(force);
      if (r.tick?.last_scan_at) setLastScan(r.tick.last_scan_at);
    } catch {
      // Monitoring unreachable: the screens still show the last results.
    } finally {
      setScanning(false);
      setLastScan((cur) => cur);
      autopilotApi.state().then(setLastScan).catch(() => {});
      setTick((t) => t + 1);
    }
  };
  // Opening Autopilot runs monitoring (the database skips it if it ran in the last 2 minutes).
  useEffect(() => { if (all !== null && canManage) void scan(false); }, [all === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = SECTIONS.find((s) => s.id === section);
  if (!current) return <Navigate to={link("")} replace />;
  if (all !== null && !canManage && section !== "notifications") {
    return <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Autopilot is for the admins of a brand. Your notifications are under <Link className="underline" to={link("notifications")}>Notifications</Link>.</p>;
  }
  const Component = current.Component;
  const ctx: Ctx = { mode, brands, brandIds, scopeBrands, canManage, isSuperAdmin, link, brandName: (id) => (id ? brands.find((b) => b.id === id)?.name ?? "Unknown brand" : "Global"), lastScan, scan, scanning, tick };
  return (
    <AutopilotContext.Provider value={ctx}>
      <div className="command-center mx-auto w-full max-w-[1500px] space-y-5 text-sm">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{mode === "global" ? "Houcine.world · Global" : "Brand"} Autopilot</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{mode === "global" ? (filter ? scopeBrands[0]?.name ?? "Ecosystem" : "Ecosystem") : scopeBrands[0]?.name ?? "Brand"}</h1>
            <p className="mt-1 text-xs text-muted-foreground">Monitoring last ran {lastScan ? fmtDateTime(lastScan) : "not yet"} · record events run their automations at once</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {mode === "global" && (
              <label className="text-xs"><span className="mb-1 block text-muted-foreground">Brand</span>
                <select aria-label="Brand filter" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={filter ?? ""} onChange={(e) => navigate(`${base}${section ? `/${section}` : ""}${e.target.value ? `?brand=${e.target.value}` : ""}`)}>
                  <option value="">All brands and global</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            {mode === "brand" && brands.filter((b) => b.role === "brand_admin").length > 1 && (
              <label className="text-xs"><span className="mb-1 block text-muted-foreground">Brand</span>
                <select aria-label="Switch brand" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={brandId} onChange={(e) => navigate(`/workspace/${e.target.value}/autopilot${section ? `/${section}` : ""}`)}>
                  {brands.filter((b) => b.role === "brand_admin").map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            )}
            {canManage && <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => void scan(true)} disabled={scanning}><RefreshCw className={cn("h-3.5 w-3.5", scanning && "animate-spin")} aria-hidden="true" /> Run monitoring now</Button>}
          </div>
        </header>
        <nav aria-label="Autopilot" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <NavLink key={id || "overview"} to={link(id)} end className={({ isActive }) => cn("flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </NavLink>
          ))}
        </nav>
        {all === null ? <p className="text-muted-foreground" role="status">Loading…</p> : (
          <Suspense fallback={<p className="text-muted-foreground" role="status">Loading…</p>}><Component /></Suspense>
        )}
      </div>
    </AutopilotContext.Provider>
  );
};

/** /workspace/autopilot/... : the global Autopilot (super admins), a page of its own. */
export const GlobalAutopilot = () => {
  const { isSuperAdmin } = useWorkspace();
  const { section } = useParams();
  // Everyone may open their own notifications here; the rest is for super admins.
  if (!isSuperAdmin && section !== "notifications") return <Navigate to="/workspace/denied" replace />;
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-3 md:px-8"><Link to="/workspace" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Workspace</Link></div>
      <main className="p-4 md:p-8"><Frame /></main>
    </div>
  );
};

/** /workspace/:brandId/autopilot/... : one brand, inside its workspace (BrandGuard has already checked membership). */
export const BrandAutopilot = () => {
  const { brandId } = useParams();
  return <Frame brandId={brandId} />;
};
