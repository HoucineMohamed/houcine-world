import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LogOut, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import PlatformCredentialsPanel from "@/components/workspace/settings/PlatformCredentialsPanel";

/**
 * App-level developer credentials (Meta app, TikTok app, Spotify app,
 * SoundCloud app) — not brand-scoped, so it lives outside any single brand's
 * /workspace/:brandId/settings route, same as /workspace/ecosystem.
 */
const PlatformCredentials = () => {
  const { isSuperAdmin, user } = useWorkspace();
  const navigate = useNavigate();

  if (!isSuperAdmin) return <Navigate to="/workspace/denied" replace />;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <KeyRound className="w-7 h-7 text-accent" /> Platform Credentials
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {user?.email} · super admin · app-level OAuth apps, shared across every brand
            </p>
          </div>
          <Button
            variant="ghost" size="sm"
            onClick={async () => { await supabase.auth.signOut(); navigate("/workspace/login"); }}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          These are your app's own developer credentials for each platform — one Meta app, one TikTok app, and so
          on — not a brand's personal login. Once a platform is configured here, every brand can connect its own
          account to it from that brand's Settings → Connected Accounts.
        </p>

        <PlatformCredentialsPanel />
      </div>
    </div>
  );
};

export default PlatformCredentials;
