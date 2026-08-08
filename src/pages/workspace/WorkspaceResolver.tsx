import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { recentBrands } from "@/hooks/useActiveBrand";
import WorkspaceLoading from "@/components/workspace/WorkspaceLoading";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

/** Option A resolver: brand access is derived, never chosen at login. */
const WorkspaceResolver = () => {
  const { memberships, isSuperAdmin } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (isSuperAdmin) { navigate("/workspace/ecosystem", { replace: true }); return; }
    if (memberships.length === 1) {
      navigate(`/workspace/${memberships[0].brand_id}/dashboard`, { replace: true });
      return;
    }
    if (memberships.length > 1) {
      // Re-validated last active brand, if still a member.
      const last = recentBrands().find((id) => memberships.some((m) => m.brand_id === id));
      navigate(last ? `/workspace/${last}/dashboard` : "/workspace/select", { replace: true });
    }
  }, [memberships, isSuperAdmin, navigate]);

  if (memberships.length === 0 && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">No workspace assigned</h1>
          <p className="text-muted-foreground mb-6">
            Your account is active but you have not been granted access to any brand yet.
            A brand admin can add you from that brand's settings.
          </p>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return <WorkspaceLoading label="Resolving your workspace…" />;
};

export default WorkspaceResolver;
