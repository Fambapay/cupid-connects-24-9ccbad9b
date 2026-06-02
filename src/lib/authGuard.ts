import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Protected routes: must be signed in AND have completed onboarding. */
export async function requireAuthAndOnboarding() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw redirect({ to: "/" });
  if (!data.user.email_confirmed_at) throw redirect({ to: "/auth/verify-email" });

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) {
    throw redirect({
      to: "/onboarding",
      search: { step: profile?.onboarding_step ?? 1 },
    });
  }
  return { user: data.user };
}

/** Public auth pages: if already signed in + complete, go to /discover. */
export async function redirectIfAuthenticated() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  if (!data.user.email_confirmed_at) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.onboarding_completed) {
    throw redirect({ to: "/discover" });
  }
  throw redirect({
    to: "/onboarding",
    search: { step: profile?.onboarding_step ?? 1 },
  });
}
