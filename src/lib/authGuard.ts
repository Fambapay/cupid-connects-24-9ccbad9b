import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// ─── In-memory cache to avoid re-fetching on every navigation ──────────────
// getUser() hits the network every call; getSession() reads from storage.
// We also cache the onboarding flag per user, invalidated on auth changes.

let onboardingCache: { userId: string; completed: boolean; step: number | null } | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session || onboardingCache?.userId !== session.user.id) {
    onboardingCache = null;
  }
});

async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

async function getOnboarding(userId: string) {
  if (onboardingCache?.userId === userId) return onboardingCache;
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step")
    .eq("id", userId)
    .maybeSingle();
  onboardingCache = {
    userId,
    completed: !!profile?.onboarding_completed,
    step: profile?.onboarding_step ?? null,
  };
  return onboardingCache;
}

/** Call after onboarding completes to refresh the cached flag. */
export function invalidateOnboardingCache() {
  onboardingCache = null;
}

/** Protected routes: must be signed in AND have completed onboarding. */
export async function requireAuthAndOnboarding() {
  const user = await getCurrentUser();
  if (!user) throw redirect({ to: "/" });
  if (!user.email_confirmed_at) throw redirect({ to: "/auth/verify-email" });

  const ob = await getOnboarding(user.id);
  if (!ob.completed) {
    throw redirect({
      to: "/onboarding",
      search: { step: ob.step ?? 1 },
    });
  }
  return { user };
}

/** Public auth pages: if already signed in + complete, go to /discover. */
export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (!user || !user.email_confirmed_at) return;
  const ob = await getOnboarding(user.id);
  if (ob.completed) {
    throw redirect({ to: "/discover" });
  }
  throw redirect({
    to: "/onboarding",
    search: { step: ob.step ?? 1 },
  });
}
