import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session, User } from "@supabase/supabase-js";

export const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });

    // Initial protected-route decisions use getUser(), which re-validates the
    // persisted token with Auth instead of trusting local storage alone. The
    // listener remains registered first so callback-created sessions are not
    // missed while this request is in flight.
    const restoreVerifiedSession = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        setSession(null);
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      setSession(!userError && userData.user ? sessionData.session : null);
      setLoading(false);
    };

    restoreVerifiedSession();
    return () => subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
};
