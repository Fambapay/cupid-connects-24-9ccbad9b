import { useProfile } from "./useProfile";
import { getEntitlements, type MembershipTier, type PlanEntitlements } from "@/lib/plans";

export type { MembershipTier };

export function useSubscription() {
  const { profile } = useProfile();
  const tier = (profile?.membership_tier ?? "free") as MembershipTier;
  const status = (profile as { membership_status?: string } | null)?.membership_status ?? "inactive";
  const expiresAt = (profile as { membership_expires_at?: string | null } | null)?.membership_expires_at ?? null;
  const expDate = expiresAt ? new Date(expiresAt) : null;
  const isActive = status === "active" && (!expDate || expDate.getTime() > Date.now());
  const isPremium = isActive && tier !== "free";
  const entitlements: PlanEntitlements = getEntitlements(isPremium ? tier : "free");

  return {
    isPremium,
    entitlements,
    subscription: {
      membershipTier: tier,
      membershipStatus: status,
      expiresAt: expDate,
      isActive,
    },
  };
}
