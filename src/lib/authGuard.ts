import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// ─── In-memory cache to avoid re-fetching on every navigation ──────────────

interface ProfileGate {
  userId: string;
  completed: boolean;
  step: number | null;
  membershipActive: boolean;
}

let profileCache: ProfileGate | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session || profileCache?.userId !== session.user.id) {
    profileCache = null;
  }
});

async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

async function getProfileGate(userId: string): Promise<ProfileGate> {
  if (profileCache?.userId === userId) return profileCache;
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, onboarding_step, membership_status, membership_expires_at")
    .eq("id", userId)
    .maybeSingle();
  const status = (profile as { membership_status?: string } | null)?.membership_status ?? "inactive";
  const exp = (profile as { membership_expires_at?: string | null } | null)?.membership_expires_at;
  const membershipActive =
    status === "active" && (!exp || new Date(exp).getTime() > Date.now());
  profileCache = {
    userId,
    completed: !!profile?.onboarding_completed,
    step: profile?.onboarding_step ?? null,
    membershipActive,
  };
  return profileCache;
}

/** Call after onboarding or membership state changes to refresh the cached flag. */
export function invalidateOnboardingCache() {
  profileCache = null;
}

/** Auth + onboarding only — used by /membership, /profile, /settings. */
export async function requireAuthAndOnboarding() {
  const user = await getCurrentUser();
  if (!user) throw redirect({ to: "/" });
  if (!user.email_confirmed_at) throw redirect({ to: "/auth/verify-email" });

  const gate = await getProfileGate(user.id);
  if (!gate.completed) {
    throw redirect({
      to: "/onboarding",
      search: { step: gate.step ?? 1 },
    });
  }
  return { user };
}

/** Strict: auth + onboarding + active paid membership. Used by /chat, /matches. */
export async function requireMembership() {
  const { user } = await requireAuthAndOnboarding();
  const gate = await getProfileGate(user.id);
  if (!gate.membershipActive) {
    throw redirect({ to: "/discover" });
  }
  return { user };
}

/** Public auth pages: if already signed in + complete, route forward. */
export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();
  if (!user || !user.email_confirmed_at) return;
  const gate = await getProfileGate(user.id);
  if (!gate.completed) {
    throw redirect({
      to: "/onboarding",
      search: { step: gate.step ?? 1 },
    });
  }
  throw redirect({ to: "/discover" });
}

