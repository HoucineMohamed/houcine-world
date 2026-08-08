import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { useMemberships } from "@/hooks/useMemberships";
import { WorkspaceContext } from "@/components/workspace/WorkspaceContext";
import WorkspaceLoading from "@/components/workspace/WorkspaceLoading";

/**
 * AUTH GUARD (UX layer only — RLS is the security boundary).
 * Authenticates first, then loads the user's platform role + memberships once
 * and shares them with every nested workspace route.
 */
const AuthGuard = () => {
  const location = useLocation();
  const { user, loading: sessionLoading } = useSession();
  const { memberships, platformRole, isSuperAdmin, roleForBrand, loading, error, reload } =
    useMemberships(user?.id ?? null);

  if (sessionLoading) return <WorkspaceLoading label="Restoring session…" />;

  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/workspace/login?returnTo=${returnTo}`} replace />;
  }

  if (loading) return <WorkspaceLoading label="Checking your access…" />;

  // Session exists but the membership fetch failed → retry, never a blank screen.
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Couldn't load your access</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider
      value={{ user, memberships, platformRole, isSuperAdmin, roleForBrand, reload }}
    >
      <Outlet />
    </WorkspaceContext.Provider>
  );
};

export default AuthGuard;
