import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialized = false;
    const finalize = (s: Session | null) => {
      setSession(s);
      if (!initialized) {
        initialized = true;
        setLoading(false);
      }
    };

    // Source of truth: onAuthStateChange fires INITIAL_SESSION immediately
    // on subscribe, then for every subsequent SIGNED_IN/SIGNED_OUT/etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      finalize(s);
    });

    // Fallback in case INITIAL_SESSION is delayed: resolve once with whatever
    // getSession returns. If onAuthStateChange already fired, this is a no-op.
    supabase.auth.getSession().then(({ data }) => {
      if (!initialized) finalize(data.session);
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
    signUp: (email: string, password: string, name?: string) => {
      const origin =
        typeof window !== "undefined" && window.location.origin.startsWith("http")
          ? window.location.origin
          : "https://hunie.app";
      return supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/onboarding?step=1`,
          data: name ? { name } : undefined,
        },
      });
    },
    signInWithGoogle: () =>
      lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/discover`,
      }),
    resetPasswordForEmail: (email: string) => {
      const origin =
        typeof window !== "undefined" && window.location.origin.startsWith("http")
          ? window.location.origin
          : "https://hunie.app";
      return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
    },
    updatePassword: (password: string) => supabase.auth.updateUser({ password }),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
