import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

const MIN_LENGTH = 12;

const SetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/workspace";

  useEffect(() => {
    if (!loading && !session) {
      // No live session: recovery link expired or not present.
    }
  }, [session, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Link needed</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This page needs a recovery link. Request a new one from the sign-in page.
          </p>
          <Button asChild>
            <Link to="/workspace/login">Request a new link</Link>
          </Button>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don’t match.");
      return;
    }
    if (password.length < MIN_LENGTH) {
      toast.error(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      const msg = /weak|password/i.test(error.message)
        ? "That password is too weak. Use at least 12 characters."
        : /expire|invalid|session/i.test(error.message)
          ? "This link has expired. Request a new one."
          : "Could not set the password. Try again or request a new link.";
      toast.error(msg);
      return;
    }
    toast.success("Password set. You can now sign in with it.");
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2">Set a new password</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Choose a password of at least {MIN_LENGTH} characters. You will use it to sign in with email and password.
        </p>
        <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-xl p-6">
          <div className="relative">
            <Input
              type={show ? "text" : "password"}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            type={show ? "text" : "password"}
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-muted-foreground">At least {MIN_LENGTH} characters.</p>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Set password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
