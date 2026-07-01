import { useProfile } from "./useProfile";
import { getEntitlements, type MembershipTier, type PlanEntitlements } from "@/lib/plans";

export type { MembershipTier };

const DAY_MS = 24 * 60 * 60 * 1000;

export function useSubscription() {
  const { profile } = useProfile();
  const tier = (profile?.membership_tier ?? "free") as MembershipTier;
  const status = (profile as { membership_status?: string } | null)?.membership_status ?? "inactive";
  const expiresAt = (profile as { membership_expires_at?: string | null } | null)?.membership_expires_at ?? null;
  const expDate = expiresAt ? new Date(expiresAt) : null;

  const now = Date.now();
  const notExpired = !expDate || expDate.getTime() > now;
  const isActive = status === "active" && notExpired;
  const isTrialing = status === "trialing" && notExpired;
  const isInGracePeriod = status === "grace_period" && notExpired;

  // Trial and grace both count as premium access (hard-block model).
  const hasPremiumAccess = isActive || isTrialing || isInGracePeriod;

  // Paid premium = paid, not trialing. Used for entitlements table.
  const isPremium = hasPremiumAccess && tier !== "free";

  const trialDaysLeft = isTrialing && expDate
    ? Math.max(0, Math.ceil((expDate.getTime() - now) / DAY_MS))
    : 0;
  const graceDaysLeft = isInGracePeriod && expDate
    ? Math.max(0, Math.ceil((expDate.getTime() - now) / DAY_MS))
    : 0;

  const entitlements: PlanEntitlements = getEntitlements(hasPremiumAccess ? tier : "free");

  return {
    isPremium,
    hasPremiumAccess,
    isTrialing,
    isInGracePeriod,
    trialDaysLeft,
    graceDaysLeft,
    entitlements,
    subscription: {
      membershipTier: tier,
      membershipStatus: status,
      expiresAt: expDate,
      isActive,
    },
  };
}
