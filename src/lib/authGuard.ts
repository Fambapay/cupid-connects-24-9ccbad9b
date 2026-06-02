import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
