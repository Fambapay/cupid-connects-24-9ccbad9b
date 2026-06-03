import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const user: (User & { phone?: string }) | null = session?.user ?? null;

  return {
    user,
    session,
    loading,
    isAuthenticated: !!session,
    signInWithPassword: (email: string, password: string) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email: string, password: string, name?: string) =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding?step=1`,
          data: name ? { name } : undefined,
        },
      }),
    signInWithGoogle: () =>
      lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/discover`,
      }),
    resetPasswordForEmail: (email: string) =>
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    updatePassword: (password: string) => supabase.auth.updateUser({ password }),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
