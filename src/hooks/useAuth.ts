import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null;
        
        if (user) {
          // Check if user is admin using the has_role function
          const { data: isAdmin } = await supabase.rpc('has_role', {
            _user_id: user.id,
            _role: 'admin'
          });
          
          setAuthState({
            user,
            session,
            isAdmin: isAdmin ?? false,
            loading: false,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isAdmin: false,
            loading: false,
          });
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      
      if (user) {
        const { data: isAdmin } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        
        setAuthState({
          user,
          session,
          isAdmin: isAdmin ?? false,
          loading: false,
        });
      } else {
        setAuthState({
          user: null,
          session: null,
          isAdmin: false,
          loading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fworkspace`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    ...authState,
    signInWithMagicLink,
    signOut,
  };
};
