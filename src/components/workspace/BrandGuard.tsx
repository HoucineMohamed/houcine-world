import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { ActiveBrandContext, rememberBrand, type ActiveBrand } from "@/hooks/useActiveBrand";
import { fetchBrand } from "@/services/brands";
import WorkspaceLoading from "@/components/workspace/WorkspaceLoading";
import WorkspaceShell from "@/components/workspace/WorkspaceShell";
import { Button } from "@/components/ui/button";

/**
 * MEMBERSHIP GUARD. Runs after AuthGuard.
 * A guard that "passes" but whose brand query returns no row is treated as no-access,
 * because RLS (brands_select) is what actually decides visibility.
 */
const BrandGuard = () => {
  const { brandId } = useParams();
  const { memberships, isSuperAdmin, roleForBrand, reload } = useWorkspace();
  const [brand, setBrand] = useState<ActiveBrand | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "denied" | "error">("loading");

  const localMember = memberships.some((m) => m.brand_id === brandId);

  useEffect(() => {
    let cancelled = false;
    if (!brandId) return;
    if (!isSuperAdmin && !localMember) {
      setState("denied");
      return;
    }
    setState("loading");
    fetchBrand(brandId)
      .then((row) => {
        if (cancelled) return;
        if (!row) { setState("denied"); return; }
        setBrand(row as unknown as ActiveBrand);
        rememberBrand(brandId);
        setState("ok");
      })
      .catch(() => !cancelled && setState("error"));
    return () => { cancelled = true; };
  }, [brandId, isSuperAdmin, localMember]);

  if (state === "denied") return <Navigate to="/workspace/denied" replace />;
  if (state === "loading") return <WorkspaceLoading label="Opening brand…" />;
  if (state === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-foreground mb-2">Couldn't load this brand</h1>
          <Button onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <ActiveBrandContext.Provider
      value={{ brand, role: roleForBrand(brandId), isSuperAdmin, reload }}
    >
      <WorkspaceShell>
        <Outlet />
      </WorkspaceShell>
    </ActiveBrandContext.Provider>
  );
};

export default BrandGuard;
