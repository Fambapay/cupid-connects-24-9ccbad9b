import { useProfile } from "./useProfile";

export type MembershipTier = "free" | "select" | "plus" | "elite";

export function useSubscription() {
  const { profile } = useProfile();
  const tier = (profile?.membership_tier ?? "free") as MembershipTier;
  return {
    isPremium: tier !== "free",
    subscription: { membershipTier: tier },
  };
}
