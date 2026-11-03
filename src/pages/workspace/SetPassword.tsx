import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import logoH from "@/assets/logo-h.png";

export const MIN_PASSWORD_LENGTH = 12;

/** Plain-sentence problem with the typed passwords, or null when they are fine. */
export const passwordProblem = (password: string, confirm: string): string | null => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirm) return "The two passwords are not the same.";
  return null;
};

/**
 * The page a password-reset link opens (via /auth/callback). The link signs the
 * owner in; this page then asks for the new password and saves it with
 * supabase.auth.updateUser. The password is never logged, echoed or put in a URL.
 */
const SetPassword = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requested = params.get("returnTo") || "/workspace";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/workspace";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(password, confirm);
    if (problem) return toast.error(problem);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("weak") || msg.includes("pwned") || msg.includes("easy to guess")) {
        return toast.error("That password is too easy to guess. Choose a longer, less common one.");
      }
      if (msg.includes("same")) return toast.error("Choose a password different from the current one.");
      if (msg.includes("session") || msg.includes("jwt") || msg.includes("expired")) {
        return toast.error("This link has expired. Request a new password email from the sign-in page.");
      }
      return toast.error("Could not save the password. Request a new password email and try again.");
    }
    setPassword("");
    setConfirm("");
    setDone(true);
    toast.success("Password saved.");
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <img src={logoH} alt="Houcine.world" className="h-12 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-4">Choose a password</h1>
          <p className="text-muted-foreground text-sm">Houcine.world multi-brand admin</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-lg">{children}</div>
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-foreground" />
      </div>,
    );
  }

  if (!session) {
    return shell(
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          This page needs the link from your password email, and that link may have expired or been used already.
        </p>
        <Button className="w-full" onClick={() => navigate("/workspace/login", { replace: true })}>
          Request a new link
        </Button>
      </div>,
    );
  }

  if (done) {
    return shell(
      <div className="text-center space-y-4">
        <p className="text-sm text-foreground">Your password is saved. You can now sign in with your email and this password.</p>
        <Button className="w-full" onClick={() => navigate(returnTo, { replace: true })}>
          Go to the workspace
        </Button>
      </div>,
    );
  }

  return shell(
    <form onSubmit={save} className="space-y-4">
      <div className="relative">
        <Input
          type={show ? "text" : "password"} placeholder="New password" value={password}
          onChange={(e) => setPassword(e.target.value)} disabled={busy}
          autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required
        />
        <button
          type="button" onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide passwords" : "Show passwords"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <Input
        type={show ? "text" : "password"} placeholder="Repeat the new password" value={confirm}
        onChange={(e) => setConfirm(e.target.value)} disabled={busy}
        autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required
      />
      <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters. A long phrase works well.</p>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
        Save password
      </Button>
    </form>,
  );
};

export default SetPassword;
