import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";

/**
 * Single auth callback for every magic-link / OTP email in the app.
 * Handles all three shapes Supabase can return:
 *   1. ?code=...                       (PKCE)  -> exchangeCodeForSession
 *   2. ?token_hash=...&type=magiclink  (verify) -> verifyOtp
 *   3. #access_token=...&refresh_token (implicit) -> setSession / detectSessionInUrl
 * plus explicit error params (expired or already-used links).
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const q = url.searchParams;

      const requestedNext = q.get("next") || hash.get("next") || "/workspace";
      // The old admin panel is no longer the authenticated destination. Keep all
      // admin magic-link entry points inside the membership-aware workspace.
      const next = requestedNext === "/admin" || requestedNext === "/admin/login"
        ? "/workspace"
        : requestedNext;

      const errCode = q.get("error_code") || hash.get("error_code");
      const errDesc = q.get("error_description") || hash.get("error_description");
      if (errCode || errDesc) {
        setError(
          errCode === "otp_expired"
            ? "This login link has expired or was already used. Request a new one — links are valid once, for a short time."
            : decodeURIComponent(errDesc || errCode || "Sign-in failed."),
        );
        return;
      }

      const code = q.get("code");
      const tokenHash = q.get("token_hash");
      const type = (q.get("type") || "magiclink") as
        | "magiclink" | "recovery" | "invite" | "email" | "signup" | "email_change";
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      try {
        // The client has detectSessionInUrl enabled by default. It may have
        // consumed an implicit URL or PKCE code while initializing, so always
        // wait for that initialization and inspect the persisted session before
        // attempting an explicit exchange. This prevents exchanging a code twice.
        const { data: initialData, error: initialError } = await supabase.auth.getSession();
        if (initialError) throw initialError;

        if (!initialData.session && code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (!initialData.session && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        } else if (!initialData.session && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session) {
          setError(
            code || tokenHash || accessToken
              ? "We couldn't establish a session from that link. It may have expired or already been used. Request a new login link."
              : "This callback does not contain a login token. Request a new login link and open the full link from the email.",
          );
          return;
        }

        // Do not route into the protected workspace based only on a token from
        // browser storage. Re-validate it with Auth before navigation so the
        // guard receives a real, durable session rather than a transient one.
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          throw userError ?? new Error("The login session could not be verified.");
        }

        window.history.replaceState({}, "", window.location.pathname);
        navigate(next.startsWith("/") ? next : "/workspace", { replace: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sign-in failed.";
        setError(
          /expire|invalid|used|not found/i.test(msg)
            ? "This login link is invalid, expired, or has already been used. Request a new one."
            : msg,
        );
      }
    };

    run();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Sign-in link didn't work</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button onClick={() => navigate("/workspace/login", { replace: true })}>
            Request a new link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Signing you in…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
