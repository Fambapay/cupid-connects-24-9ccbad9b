// Fonte única de acesso do utilizador.
// Consome a RPC get_my_access() (SECURITY DEFINER) — nada de decisões
// hardcoded no cliente. Todo o gating de features passa por este hook.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Tier = "free" | "select" | "plus" | "elite";

export interface AccessLevel {
  authenticated: boolean;
  tier: Tier;
  status: string;
  isPremium: boolean;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  membershipExpiresAt: Date | null;
  showDay4Recap: boolean;
  pauseUsed: boolean;
  currency: "MZN" | "AOA";
  likesUsedToday: number;
  likesLimitToday: number; // -1 = ilimitado
  likesRemainingToday: number; // -1 = ilimitado
  superLikesUsedToday: number;
  superLikesLimitToday: number;
  superLikesRemainingToday: number;
  canInitiateConversationDefault: boolean;
  consumables: {
    boosts: number;
    superLikes: number;
    firstImpressions: number;
    welcomeBoostUsed: boolean;
  };
  boostAvailableNow: boolean;
  boostPeriodKey: string | null;

  // Derivados por conveniência
  canSeeWhoLiked: boolean;
  canUsePassport: boolean;
  canUseAdvancedFilters: boolean;
  hasReadReceipts: boolean;
  canSendFirstImpression: boolean;
  hasEliteBadge: boolean;
  canInvisible: boolean;
  hasFeedPriority: boolean;
}

const EMPTY: AccessLevel = {
  authenticated: false,
  tier: "free",
  status: "inactive",
  isPremium: false,
  isTrialing: false,
  trialEndsAt: null,
  membershipExpiresAt: null,
  showDay4Recap: false,
  pauseUsed: false,
  currency: "MZN",
  likesUsedToday: 0,
  likesLimitToday: 10,
  likesRemainingToday: 10,
  superLikesUsedToday: 0,
  superLikesLimitToday: 0,
  superLikesRemainingToday: 0,
  canInitiateConversationDefault: false,
  consumables: { boosts: 0, superLikes: 0, firstImpressions: 0, welcomeBoostUsed: false },
  boostAvailableNow: false,
  boostPeriodKey: null,
  canSeeWhoLiked: false,
  canUsePassport: false,
  canUseAdvancedFilters: false,
  hasReadReceipts: false,
  canSendFirstImpression: false,
  hasEliteBadge: false,
  canInvisible: false,
  hasFeedPriority: false,
};

function derive(raw: Record<string, unknown> | null): AccessLevel {
  if (!raw || raw.authenticated !== true) return EMPTY;
  const tier = ((raw.tier as string) ?? "free") as Tier;
  const isPremium = raw.is_premium === true;
  const isTrialing = raw.is_trialing === true;

  // Regras de features por tier (trial = Elite completo).
  const effective: Tier = isTrialing ? "elite" : tier;
  const canSeeWhoLiked = isPremium && (effective === "plus" || effective === "elite");
  const canUsePassport = isPremium && (effective === "plus" || effective === "elite");
  const canUseAdvancedFilters = isPremium && (effective === "plus" || effective === "elite");
  const hasReadReceipts = isPremium && (effective === "plus" || effective === "elite");
  const canSendFirstImpression =
    (isPremium && effective === "elite") ||
    (raw.consumables as { first_impressions?: number } | null)?.first_impressions
      ? true
      : false;
  const hasEliteBadge = isPremium && effective === "elite";
  const canInvisible = isPremium && effective === "elite";
  const hasFeedPriority = isPremium && effective === "elite";

  const consumables = (raw.consumables ?? {}) as {
    boosts?: number;
    super_likes?: number;
    first_impressions?: number;
    welcome_boost_used?: boolean;
  };

  return {
    authenticated: true,
    tier,
    status: (raw.status as string) ?? "inactive",
    isPremium,
    isTrialing,
    trialEndsAt: raw.trial_ends_at ? new Date(raw.trial_ends_at as string) : null,
    membershipExpiresAt: raw.membership_expires_at
      ? new Date(raw.membership_expires_at as string)
      : null,
    showDay4Recap: raw.show_day4_recap === true,
    pauseUsed: raw.pause_used === true,
    currency: (raw.currency as "MZN" | "AOA") ?? "MZN",
    likesUsedToday: (raw.likes_used_today as number) ?? 0,
    likesLimitToday: (raw.likes_limit_today as number) ?? 10,
    likesRemainingToday: (raw.likes_remaining_today as number) ?? 10,
    superLikesUsedToday: (raw.super_likes_used_today as number) ?? 0,
    superLikesLimitToday: (raw.super_likes_limit_today as number) ?? 0,
    superLikesRemainingToday: (raw.super_likes_remaining_today as number) ?? 0,
    canInitiateConversationDefault: raw.can_initiate_conversation_default === true,
    consumables: {
      boosts: consumables.boosts ?? 0,
      superLikes: consumables.super_likes ?? 0,
      firstImpressions: consumables.first_impressions ?? 0,
      welcomeBoostUsed: consumables.welcome_boost_used ?? false,
    },
    boostAvailableNow: raw.boost_available_now === true,
    boostPeriodKey: (raw.boost_period_key as string | null) ?? null,
    canSeeWhoLiked,
    canUsePassport,
    canUseAdvancedFilters,
    hasReadReceipts,
    canSendFirstImpression,
    hasEliteBadge,
    canInvisible,
    hasFeedPriority,
  };
}

export function useAccessLevel() {
  const { user } = useAuth();
  const [access, setAccess] = useState<AccessLevel>(EMPTY);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setAccess(EMPTY);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_my_access");
    if (error) {
      console.error("[useAccessLevel] rpc error:", error);
      setAccess(EMPTY);
    } else {
      setAccess(derive(data as Record<string, unknown> | null));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatPrice = useMemo(
    () => (amount: number) =>
      `${amount.toLocaleString("pt-PT")} ${access.currency === "AOA" ? "Kz" : "MT"}`,
    [access.currency],
  );

  return { access, loading, reload: load, formatPrice };
}

/**
 * Verifica no servidor se o utilizador pode iniciar conversa numa match
 * específica (Free só pode responder). Devolve `null` enquanto carrega.
 */
export function useCanInitiate(matchId: string | null | undefined) {
  const { user } = useAuth();
  const [canInitiate, setCanInitiate] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user || !matchId) {
      setCanInitiate(null);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("can_initiate_conversation", {
        _match_id: matchId,
      });
      if (cancelled) return;
      setCanInitiate(error ? false : Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [user, matchId]);

  return canInitiate;
}
