import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { fetchAllBrands } from "@/services/brands";
import { atLeast } from "@/lib/roles";
import { loadDataset, type LoadedData, type Scope } from "@/services/command";
import { dayOf, resolvePeriod, snapshot, forBrands, type Period, type PeriodPreset, type Snapshot } from "../../../supabase/functions/_shared/command/metrics.ts";

// The Command Center's shared state: which brands are in scope (global = every brand the caller may see, or a brand
// filter; brand = one brand from the URL), the period (kept in the URL so links and reloads keep it), the loaded
// records and the engine's snapshot. Access is decided by the database; this only decides what to ask for and what
// to offer in the interface.

export interface CommandBrand { id: string; name: string; slug: string; status: string; service: string | null; role: string | null }

interface CommandContextValue {
  mode: "global" | "brand";
  base: string;
  brands: CommandBrand[];
  /** Brands the current view shows (the brand filter applied). */
  scopeBrands: CommandBrand[];
  scope: Scope;
  canEdit: boolean;
  canAdmin: boolean;
  period: Period;
  today: string;
  data: LoadedData | null;
  snap: Snapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  link: (section: string, extra?: Record<string, string>) => string;
  brandName: (id: string | null | undefined) => string;
}

const Ctx = createContext<CommandContextValue | null>(null);
export const useCommand = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommand outside CommandProvider");
  return v;
};

const PRESETS: PeriodPreset[] = ["today", "last_7_days", "last_30_days", "this_month", "last_month", "this_quarter", "this_year", "custom"];

export const CommandProvider = ({ brandId, children }: { brandId?: string; children: React.ReactNode }) => {
  const { memberships, isSuperAdmin } = useWorkspace();
  const [params] = useSearchParams();
  const [allBrands, setAllBrands] = useState<CommandBrand[] | null>(null);
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const mode = brandId ? "brand" : "global";
  const today = dayOf(new Date().toISOString());

  // The brands the caller may use: every brand for a super admin, otherwise their memberships.
  useEffect(() => {
    const own = memberships.filter((m) => m.brand).map((m) => ({ id: m.brand!.id, name: m.brand!.name, slug: m.brand!.slug, status: m.brand!.status, service: m.brand!.service?.name ?? null, role: m.role }));
    if (!isSuperAdmin) {
      setAllBrands(own);
      return;
    }
    fetchAllBrands()
      .then((rows) => setAllBrands((rows as unknown as { id: string; name: string; slug: string; status: string; service: { name: string } | null }[]).map((b) => ({ id: b.id, name: b.name, slug: b.slug, status: b.status, service: b.service?.name ?? null, role: own.find((o) => o.id === b.id)?.role ?? null }))))
      .catch(() => setAllBrands(own));
  }, [memberships, isSuperAdmin]);

  const brands = useMemo(() => allBrands ?? [], [allBrands]);
  const filter = params.get("brands")?.split(",").filter(Boolean) ?? [];
  const scopeBrands = useMemo(() => {
    if (mode === "brand") return brands.filter((b) => b.id === brandId);
    return filter.length ? brands.filter((b) => filter.includes(b.id)) : brands;
  }, [mode, brands, brandId, filter.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const roleOk = (min: "editor" | "brand_admin") => isSuperAdmin || (scopeBrands.length > 0 && scopeBrands.every((b) => atLeast(b.role, min)));
  const scope: Scope = useMemo(() => ({
    brandIds: mode === "global" && !filter.length && isSuperAdmin ? null : scopeBrands.map((b) => b.id),
    financeVisible: roleOk("brand_admin"),
  }), [mode, filter.join(","), isSuperAdmin, scopeBrands]); // eslint-disable-line react-hooks/exhaustive-deps

  const preset = (PRESETS.includes(params.get("period") as PeriodPreset) ? params.get("period") : "this_month") as PeriodPreset;
  let period: Period;
  try {
    period = resolvePeriod(preset, today, preset === "custom" ? { start: params.get("from") ?? "", end: params.get("to") ?? "" } : undefined);
  } catch {
    period = resolvePeriod("this_month", today);
  }

  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (allBrands === null) return;
    let cancelled = false;
    setLoading(true);
    loadDataset(scope)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "The records could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [allBrands, JSON.stringify(scope), tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const snap = useMemo(() => (data ? snapshot(forBrands(data.dataset, scope.brandIds), period, today) : null), [data, period.start, period.end, scope.brandIds, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = mode === "brand" ? `/workspace/${brandId}/command` : "/workspace/command";
  const keep = ["period", "from", "to", "brands"];
  const link = (section: string, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams();
    for (const k of keep) { const v = params.get(k); if (v) q.set(k, v); }
    for (const [k, v] of Object.entries(extra)) q.set(k, v);
    const s = q.toString();
    return `${base}${section ? `/${section}` : ""}${s ? `?${s}` : ""}`;
  };
  const brandName = (id: string | null | undefined) => brands.find((b) => b.id === id)?.name ?? (id ? "Unknown brand" : "No brand");

  return (
    <Ctx.Provider value={{ mode, base, brands, scopeBrands, scope, canEdit: roleOk("editor"), canAdmin: roleOk("brand_admin"), period, today, data, snap, loading: loading || allBrands === null, error, reload, link, brandName }}>
      {children}
    </Ctx.Provider>
  );
};
