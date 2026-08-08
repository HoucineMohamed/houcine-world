import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

const WorkspaceLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/workspace";

  useEffect(() => {
    if (!loading && session) navigate(returnTo, { replace: true });
  }, [session, loading, navigate, returnTo]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    navigate(returnTo, { replace: true });
  };

  const magicLink = async () => {
    if (!email) return toast.error("Enter your email first");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${returnTo}` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setLinkSent(true);
    toast.success("Magic link sent — check your inbox.");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-foreground">H</Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">Workspace</h1>
          <p className="text-muted-foreground text-sm">Houcine.world multi-brand admin</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg">
          <form onSubmit={signIn} className="space-y-4">
            <Input
              type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} disabled={busy} autoComplete="email"
            />
            <Input
              type="password" placeholder="Password" value={password}
              onChange={(e) => setPassword(e.target.value)} disabled={busy} autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
              Sign in
            </Button>
          </form>
          <div className="my-4 text-center text-xs text-muted-foreground">or</div>
          <Button variant="outline" className="w-full" onClick={magicLink} disabled={busy}>
            <Mail className="w-4 h-4 mr-2" />
            {linkSent ? "Resend magic link" : "Email me a magic link"}
          </Button>
        </div>
        <p className="text-center text-muted-foreground text-xs mt-6">
          Access is granted per brand. Nothing is selected at login.
        </p>
      </div>
    </div>
  );
};

export default WorkspaceLogin;
