import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhotos } from "@/lib/photos";
import { getEntitlements, type MembershipTier } from "@/lib/plans";
import type { DiscoveryFilters } from "@/components/FiltersSheet";


export interface DailyLimits {
  likesUsed: number;
  likesLimit: number;
  likesRemaining: number;
  superLikesUsed: number;
  superLikesLimit: number;
  superLikesRemaining: number;
}

export interface DiscoverProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  country: string;
  bio: string;
  photos: string[];
  interests: string[];
  is_verified: boolean;
  gender: string | null;
  isOnline: boolean;
  lastActiveAt: string | null;
  distance: number;
}

export interface DiscoveryOptions {
  filters?: DiscoveryFilters;
  userCoords?: { lat: number; lng: number } | null;
}

// Mirror of activityStatus LIVE_WINDOW_MS — consider a user "online now"
// if their last heartbeat is within this window.
const ONLINE_WINDOW_MS = 90_000;

function computeAge(birthdate: string | null): number {
  if (!birthdate) return 0;
  const d = new Date(birthdate);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

function mapGenderFilter(g: DiscoveryFilters["gender"]): string[] | null {
  switch (g) {
    case "feminino": return ["woman", "transwoman"];
    case "masculino": return ["man", "transman"];
    case "nao_binario": return ["nonbinary", "genderfluid", "agender", "other"];
    case "todos":
    default: return null;
  }
}

interface DiscoveryResult {
  items: DiscoverProfile[];
  dailyLimits: DailyLimits;
}

const DEFAULT_LIMITS: DailyLimits = {
  likesUsed: 0,
  likesLimit: 25,
  likesRemaining: 25,
  superLikesUsed: 0,
  superLikesLimit: 0,
  superLikesRemaining: 0,
};

async function fetchDiscovery(
  userId: string,
  filters: DiscoveryFilters | undefined,
  userCoords: { lat: number; lng: number } | null | undefined,
): Promise<DiscoveryResult> {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // All independent reads in a single parallel batch (was 6 + 1 sequential).
  const [
    { data: mySwipes },
    { data: me },
    { data: mySettings },
    { data: blocksA },
    { data: blocksB },
    { data: todaySwipes },
    { data: likedMeRows },
  ] = await Promise.all([
    supabase.from("swipes").select("swiped_id").eq("swiper_id", userId),
    supabase
      .from("profiles")
      .select("interested_in, latitude, longitude, membership_tier, membership_status, membership_expires_at")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_settings")
      .select("age_min, age_max, distance_radius, require_bio, min_photos")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("blocked_users").select("blocked_id").eq("blocker_id", userId),
    supabase.from("blocked_users").select("blocker_id").eq("blocked_id", userId),
    supabase
      .from("swipes")
      .select("direction")
      .eq("swiper_id", userId)
      .gte("created_at", todayStart.toISOString()),
    supabase
      .from("swipes")
      .select("swiper_id")
      .eq("swiped_id", userId)
      .in("direction", ["like", "super"]),
  ]);

  // Compute daily limits based on viewer's tier
  const myTier = (me?.membership_tier ?? "free") as MembershipTier;
  const myStatus = (me as { membership_status?: string } | null)?.membership_status ?? "inactive";
  const myExp = (me as { membership_expires_at?: string | null } | null)?.membership_expires_at;
  const myActive = myStatus === "active" && (!myExp || new Date(myExp).getTime() > Date.now());
  const ent = getEntitlements(myActive ? myTier : "free");
  const likesUsedToday = (todaySwipes ?? []).filter(
    (s) => s.direction === "like" || s.direction === "super",
  ).length;
  const superUsedToday = (todaySwipes ?? []).filter((s) => s.direction === "super").length;
  const likesLimit = ent.dailyLikes; // -1 unlimited
  const likesRemaining = likesLimit < 0 ? Infinity : Math.max(0, likesLimit - likesUsedToday);
  const dailyLimits: DailyLimits = {
    likesUsed: likesUsedToday,
    likesLimit,
    likesRemaining: Number.isFinite(likesRemaining) ? likesRemaining : 9999,
    superLikesUsed: superUsedToday,
    superLikesLimit: ent.dailySuperLikes,
    superLikesRemaining: Math.max(0, ent.dailySuperLikes - superUsedToday),
  };

  const excluded = new Set<string>((mySwipes ?? []).map((s) => s.swiped_id as string));
  excluded.add(userId);
  (blocksA ?? []).forEach((b) => excluded.add(b.blocked_id as string));
  (blocksB ?? []).forEach((b) => excluded.add(b.blocker_id as string));
  const likedMe = new Set<string>((likedMeRows ?? []).map((r) => r.swiper_id as string));

  let q = supabase
    .from("profiles")
    .select(
      "id,name,age,birthdate,city,country,bio,interests,is_verified,gender,latitude,longitude,last_active_at,is_seed,is_incognito,membership_tier,membership_status,membership_expires_at",
    )
    .eq("onboarding_completed", true)
    .eq("is_paused", false)
    .order("is_seed", { ascending: true })
    .limit(100);

  const genderFilter = filters ? mapGenderFilter(filters.gender) : null;
  if (genderFilter) {
    q = q.in("gender", genderFilter);
  } else {
    const interestedIn = (me?.interested_in ?? []) as string[];
    if (interestedIn.length) q = q.in("gender", interestedIn);
  }

  const ageMin = filters?.ageMin ?? mySettings?.age_min ?? 18;
  const ageMax = filters?.ageMax ?? mySettings?.age_max ?? 80;
  const distanceMax = filters?.distance ?? mySettings?.distance_radius ?? 200;
  const requireBio = filters?.hasBio ?? mySettings?.require_bio ?? false;

  if (ageMin > 18) q = q.gte("age", ageMin);
  if (ageMax < 80) q = q.lte("age", ageMax);
  if (filters?.verifiedOnly) q = q.eq("is_verified", true);
  if (requireBio) q = q.not("bio", "is", null).neq("bio", "");

  const { data: rows } = await q;
  let candidates = (rows ?? [])
    .filter((r) => !excluded.has(r.id))
    .filter((r) => !r.is_incognito || likedMe.has(r.id));

  const myCoords =
    userCoords ??
    (me?.latitude != null && me?.longitude != null
      ? { lat: me.latitude as number, lng: me.longitude as number }
      : null);
  const withDistance = candidates.map((r) => {
    const dist =
      myCoords && r.latitude != null && r.longitude != null
        ? haversine(myCoords, { lat: r.latitude as number, lng: r.longitude as number })
        : 0;
    return { ...r, _distance: dist };
  });
  candidates =
    myCoords && distanceMax < 200
      ? withDistance.filter((r) => r._distance <= distanceMax)
      : withDistance;

  if (filters?.onlineNow) {
    const now = Date.now();
    candidates = candidates.filter((r) => {
      const t = r.last_active_at ? new Date(r.last_active_at as string).getTime() : 0;
      return now - t <= ONLINE_WINDOW_MS;
    });
  }

  if (!candidates.length) {
    return { items: [], dailyLimits };
  }

  const candidateOrder = new Map(candidates.map((r, i) => [r.id, i]));
  const { data: activeBoosts } = await supabase
    .from("boosts")
    .select("profile_id,expires_at")
    .in("profile_id", candidates.map((r) => r.id))
    .gt("expires_at", new Date().toISOString());
  const boostedIds = new Set((activeBoosts ?? []).map((b) => b.profile_id as string));
  const nowMs = Date.now();
  const tierRank = (r: typeof candidates[number]) => {
    if (boostedIds.has(r.id)) return 3;
    const expires = r.membership_expires_at ? new Date(r.membership_expires_at as string).getTime() : 0;
    const active = r.membership_status === "active" && (!expires || expires > nowMs);
    if (!active) return 0;
    if (r.membership_tier === "elite") return 2;
    if (r.membership_tier === "plus") return 1;
    return 0;
  };
  candidates = [...candidates].sort((a, b) => {
    const rA = tierRank(a);
    const rB = tierRank(b);
    if (rA !== rB) return rB - rA;
    return (candidateOrder.get(a.id) ?? 0) - (candidateOrder.get(b.id) ?? 0);
  });

  const ids = candidates.map((r) => r.id);
  const { data: photos } = await supabase
    .from("profile_photos")
    .select("profile_id,storage_path,position")
    .in("profile_id", ids)
    .order("position", { ascending: true });

  const paths = (photos ?? []).map((p) => p.storage_path as string);
  const signed = await signPhotos(paths, 3600, { width: 800, quality: 72, resize: "cover" });
  const byProfile: Record<string, string[]> = {};
  (photos ?? []).forEach((p, i) => {
    const url = signed[i];
    if (!url) return;
    (byProfile[p.profile_id as string] ??= []).push(url);
  });

  const minPhotos = Math.max(1, mySettings?.min_photos ?? 1);
  const now = Date.now();
  const items: DiscoverProfile[] = candidates
    .filter((r) => (byProfile[r.id]?.length ?? 0) >= minPhotos)
    .map((r) => {
      const t = r.last_active_at ? new Date(r.last_active_at as string).getTime() : 0;
      return {
        id: r.id,
        name: r.name ?? "",
        age: r.age ?? computeAge(r.birthdate as string | null),
        city: r.city ?? "",
        country: r.country ?? "",
        bio: r.bio ?? "",
        photos: byProfile[r.id] ?? [],
        interests: (r.interests as string[]) ?? [],
        is_verified: !!r.is_verified,
        gender: r.gender as string | null,
        isOnline: t > 0 && now - t <= ONLINE_WINDOW_MS,
        lastActiveAt: (r.last_active_at as string | null) ?? null,
        distance: (r as { _distance?: number })._distance ?? 0,
      };
    });

  return { items, dailyLimits };
}

export function useDiscovery(options: DiscoveryOptions = {}) {
  const { user } = useAuth();
  const { filters, userCoords } = options;
  

  const queryKey = useMemo(
    () => ["discovery", user?.id ?? null, filters, userCoords] as const,
    [user?.id, filters, userCoords],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchDiscovery(user!.id, filters, userCoords),
    enabled: !!user,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const items: DiscoverProfile[] = data?.items ?? [];
  const dailyLimits = data?.dailyLimits ?? DEFAULT_LIMITS;
  const loading = !!user && isLoading;

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);



  const swipe = useCallback(
    async (
      targetId: string,
      direction: "like" | "pass" | "super",
      options?: { firstImpressionMessage?: string },
    ): Promise<{
      matched: boolean;
      matchId?: string;
      reason?: string;
      remainingSuperLikes?: number;
      remainingFirstImpressions?: number;
    }> => {
      if (!user) return { matched: false };
      let remainingSuperLikes: number | undefined;
      let remainingFirstImpressions: number | undefined;
      const fiMsg = options?.firstImpressionMessage?.trim().slice(0, 280) || null;
      const isFirstImpression = !!fiMsg;

      // First Impression: check own credit category (Elite-only, 10/month, fixed).
      // Otherwise, a Super Like swipe checks the super_like_balance.
      if (isFirstImpression) {
        const { data: balance } = await supabase
          .from("user_credits")
          .select("first_impression_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!balance || (balance.first_impression_balance ?? 0) <= 0) {
          return { matched: false, reason: "insufficient_credits" };
        }
      } else if (direction === "super") {
        const { data: balance } = await supabase
          .from("user_credits")
          .select("super_like_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!balance || (balance.super_like_balance ?? 0) <= 0) {
          return { matched: false, reason: "insufficient_credits" };
        }
      }

      const insertRow: Record<string, unknown> = {
        swiper_id: user.id,
        swiped_id: targetId,
        direction,
      };
      if (fiMsg) insertRow.first_impression_message = fiMsg;

      const { error: insertError } = await supabase
        .from("swipes")
        .upsert(insertRow as never, { onConflict: "swiper_id,swiped_id" });
      if (insertError) {
        console.error("swipe insert failed", insertError);
        return { matched: false, reason: "insert_failed" };
      }

      // Consume the appropriate credit AFTER a successful insert.
      // First Impression credit is consumed regardless of match outcome.
      if (isFirstImpression) {
        const { data } = await supabase.rpc("consume_first_impression_credit");
        const res = data as { success: boolean; remaining_balance?: number } | null;
        if (res?.success) {
          remainingFirstImpressions = res.remaining_balance;
        } else {
          console.warn("first_impression credit consume failed after insert", res);
        }
        window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
      } else if (direction === "super") {
        const { data } = await supabase.rpc("consume_super_like_credit");
        const res = data as { success: boolean; remaining_balance?: number } | null;
        if (res?.success) {
          remainingSuperLikes = res.remaining_balance;
        } else {
          console.warn("super_like credit consume failed after insert", res);
        }
        window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
      }

      if (direction === "pass") return { matched: false };
      const a = user.id < targetId ? user.id : targetId;
      const b = user.id < targetId ? targetId : user.id;
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      return {
        matched: !!match,
        matchId: match?.id,
        remainingSuperLikes,
        remainingFirstImpressions,
      };
    },
    [user],
  );

  const rewind = useCallback(async (): Promise<{
    success: boolean;
    swipedId?: string;
    error?: string;
  }> => {
    const { data } = await supabase.rpc("rewind_last_swipe");
    const res = data as {
      success: boolean;
      swiped_id?: string;
      error?: string;
    } | null;
    // Don't reload: caller manages the local card stack so the rewound card
    // can animate back into place from where it flew off.
    if (res?.success) return { success: true, swipedId: res.swiped_id };
    return { success: false, error: res?.error };
  }, []);

  return { items, loading, swipe, rewind, reload, dailyLimits };
}
