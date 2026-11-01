import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/useSession";
import { clientOsApi } from "@/services/clientOs";
import { PortalSignIn } from "@/components/clientos/PortalShell";
import logoH from "@/assets/logo-h.png";

// Accepting an invitation: the secret travels in the address's #fragment (never sent to a server log). Before
// signing in, the page shows only what the invitation is for. Acceptance needs the secret AND being signed in with
// the invited email address; the database creates exactly one membership.

const InvitePage = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token") ?? "");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof clientOsApi.invitationPreview>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!token) { setPreview({ valid: false, reason: "This invitation link is incomplete." }); return; }
    clientOsApi.invitationPreview(token).then(setPreview).catch(() => setPreview({ valid: false, reason: "This invitation could not be checked." }));
  }, [token]);

  if (loading || !preview) return <div className="flex min-h-screen items-center justify-center bg-background" role="status"><span className="sr-only">Loading…</span><span className="h-8 w-8 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin" aria-hidden="true" /></div>;
  if (preview.valid && !user) return <PortalSignIn title={`Your invitation to the ${preview.brand} ${preview.kind} portal`} />;
  const accept = async () => {
    setBusy(true); setError(null);
    try {
      const r = await clientOsApi.acceptInvitation(token);
      window.history.replaceState(null, "", window.location.pathname);
      navigate(r.kind === "partner" ? "/partners" : "/portal", { replace: true });
    } catch (e) { setError(e instanceof Error ? e.message : "The invitation could not be accepted."); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <img src={logoH} alt="Houcine.world" className="mx-auto h-12 w-auto" />
        {!preview.valid ? (
          <><h1 className="text-xl font-semibold">Invitation not available</h1><p className="text-sm text-muted-foreground">{preview.reason}</p></>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Join {preview.brand}'s {preview.kind} portal</h1>
            <p className="text-sm text-muted-foreground">This invitation is for {preview.email_hint}. You are signed in as {user?.email}.</p>
            <Button onClick={() => void accept()} disabled={busy}>Accept the invitation</Button>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <button type="button" className="block w-full text-xs text-muted-foreground underline" onClick={() => void supabase.auth.signOut()}>Use another account</button>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
