import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhotos } from "@/lib/photos";
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
  height_cm: number | null;
  looking_for: string | null;
  pets: string | null;
  smoking: string | null;
  drinking: string | null;
  workout: string | null;
  membership_tier: "select" | "plus" | "elite" | null;
}


export interface DiscoveryOptions {
  filters?: DiscoveryFilters;
  userCoords?: { lat: number; lng: number } | null;
  /**
   * When false, the client omits every premium-only filter from the RPC
   * payload (height range, interests, lifestyle). The server also enforces
   * this — the double gate keeps a premium filter from leaking into the
   * request if the server-side check ever regresses.
   */
  isPremium?: boolean;
}

const ONLINE_WINDOW_MS = 90_000;

interface DiscoveryResult {
  items: DiscoverProfile[];
  dailyLimits: DailyLimits;
  needsLocation: boolean;
  needsPreference: boolean;
}

const DEFAULT_LIMITS: DailyLimits = {
  likesUsed: 0,
  likesLimit: 25,
  likesRemaining: 25,
  superLikesUsed: 0,
  superLikesLimit: 0,
  superLikesRemaining: 0,
};

interface RawCandidate {
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  interests: string[] | null;
  is_verified: boolean | null;
  gender: string | null;
  last_active_at: string | null;
  distance_km: number | null;
  photos: string[] | null;
  height_cm: number | null;
  looking_for: string | null;
  pets: string | null;
  smoking: string | null;
  drinking: string | null;
  workout: string | null;
}

interface FeedResponse {
  candidates: RawCandidate[];
  needs_location?: boolean;
  needs_preference?: boolean;
  daily_limits: {
    likes_used: number;
    likes_limit: number;
    super_used: number;
    super_limit: number;
  };
}

const PAGE_SIZE = 100;

async function fetchDiscovery(
  filters: DiscoveryFilters | undefined,
  userCoords: { lat: number; lng: number } | null | undefined,
  offset = 0,
  isPremium = false,
): Promise<DiscoveryResult> {
  // Resolve viewer coords: caller-provided (GPS) wins; server RPC falls back
  // to stored profile coords if the caller still doesn't have any.
  let coords = userCoords ?? null;
  if (!coords) {
    const { data: locData } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: unknown }>)("get_my_location");
    const loc = Array.isArray(locData) ? (locData[0] as { latitude?: number; longitude?: number }) : (locData as { latitude?: number; longitude?: number } | null);
    if (loc && loc.latitude != null && loc.longitude != null) {
      coords = { lat: loc.latitude, lng: loc.longitude };
    }
  }

  const filterPayload: Record<string, unknown> = {};
  if (filters) {
    if (filters.gender) filterPayload.gender = filters.gender;
    // Wide-open sentinels (18-80, 200 km) mean "no override": let the RPC
    // fall back to user_settings from onboarding via COALESCE. Only send a
    // value when the user actually narrowed the range in the filters sheet.
    if (filters.ageMin != null && filters.ageMin > 18) filterPayload.ageMin = filters.ageMin;
    if (filters.ageMax != null && filters.ageMax < 80) filterPayload.ageMax = filters.ageMax;
    if (filters.distance != null && filters.distance < 201) filterPayload.distance = filters.distance;
    if (filters.hasBio) filterPayload.hasBio = true;
    if (filters.verifiedOnly) filterPayload.verifiedOnly = true;
    if (filters.onlineNow) filterPayload.onlineNow = true;
    // Height slider full-range sentinels (140-210) also mean "no override".
    // Premium-gated client-side too: skip entirely when not entitled so the
    // payload doesn't rely on the server's ignore-when-not-premium branch.
    if (isPremium) {
      if (filters.heightMin != null && filters.heightMin > 140) filterPayload.heightMin = filters.heightMin;
      if (filters.heightMax != null && filters.heightMax < 210) filterPayload.heightMax = filters.heightMax;

      // Interests / lifestyle. Server also enforces the premium gate; keeping
      // the client-side gate means a server regression won't silently start
      // narrowing the feed for free users who fiddled with premium fields.
      if (filters.interests && filters.interests.length > 0) {
        filterPayload.interests = filters.interests;
      }
      // Lifestyle UI uses sim/nao/as_vezes; the DB stores richer values.
      // Expand each choice into every matching DB value.
      const SMOKE_MAP: Record<string, string[]> = {
        sim: ["social", "regular"],
        nao: ["never", "quitting"],
        as_vezes: ["social"],
      };
      const DRINK_MAP: Record<string, string[]> = {
        sim: ["social", "regular"],
        nao: ["never", "sober"],
        as_vezes: ["social"],
      };
      const WORKOUT_MAP: Record<string, string[]> = {
        sim: ["often", "daily"],
        nao: ["never"],
        as_vezes: ["sometimes"],
      };
      if (filters.lifestyle?.smoke && SMOKE_MAP[filters.lifestyle.smoke]) {
        filterPayload.smoking = SMOKE_MAP[filters.lifestyle.smoke];
      }
      if (filters.lifestyle?.drink && DRINK_MAP[filters.lifestyle.drink]) {
        filterPayload.drinking = DRINK_MAP[filters.lifestyle.drink];
      }
      if (filters.lifestyle?.workout && WORKOUT_MAP[filters.lifestyle.workout]) {
        filterPayload.workout = WORKOUT_MAP[filters.lifestyle.workout];
      }
    }
  }

  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)("get_discovery_feed", {
    _filters: filterPayload,
    _viewer_lat: coords?.lat ?? null,
    _viewer_lng: coords?.lng ?? null,
    _limit: PAGE_SIZE,
    _offset: offset,
  });
  if (error) {
    console.error("get_discovery_feed failed", error);
    return { items: [], dailyLimits: DEFAULT_LIMITS, needsLocation: false, needsPreference: false };
  }
  const resp = (data as FeedResponse | null) ?? { candidates: [], needs_location: false, needs_preference: false, daily_limits: { likes_used: 0, likes_limit: 5, super_used: 0, super_limit: 0 } };
  const needsLocation = !!resp.needs_location;
  const needsPreference = !!resp.needs_preference;

  const dl = resp.daily_limits;
  const likesRemaining = dl.likes_limit < 0 ? Infinity : Math.max(0, dl.likes_limit - dl.likes_used);
  const dailyLimits: DailyLimits = {
    likesUsed: dl.likes_used,
    likesLimit: dl.likes_limit,
    likesRemaining: Number.isFinite(likesRemaining) ? (likesRemaining as number) : 9999,
    superLikesUsed: dl.super_used,
    superLikesLimit: dl.super_limit,
    superLikesRemaining: Math.max(0, dl.super_limit - dl.super_used),
  };

  // Flatten all photo paths and sign in one batch.
  const candidates = resp.candidates ?? [];
  const allPaths: string[] = [];
  const ranges: Array<{ start: number; end: number }> = [];
  for (const c of candidates) {
    const paths = c.photos ?? [];
    ranges.push({ start: allPaths.length, end: allPaths.length + paths.length });
    for (const p of paths) allPaths.push(p);
  }
  const signed = allPaths.length
    ? await signPhotos(allPaths, 3600, { width: 800, quality: 72, resize: "cover" })
    : [];

  const now = Date.now();
  const items: DiscoverProfile[] = candidates.map((c, idx) => {
    const { start, end } = ranges[idx];
    const photos = signed.slice(start, end).filter(Boolean) as string[];
    const t = c.last_active_at ? new Date(c.last_active_at).getTime() : 0;
    return {
      id: c.id,
      name: c.name ?? "",
      age: c.age ?? 0,
      city: c.city ?? "",
      country: c.country ?? "",
      bio: c.bio ?? "",
      photos,
      interests: c.interests ?? [],
      is_verified: !!c.is_verified,
      gender: c.gender,
      isOnline: t > 0 && now - t <= ONLINE_WINDOW_MS,
      lastActiveAt: c.last_active_at,
      distance: c.distance_km ?? 0,
      height_cm: c.height_cm ?? null,
      looking_for: c.looking_for ?? null,
      pets: c.pets ?? null,
      smoking: c.smoking ?? null,
      drinking: c.drinking ?? null,
      workout: c.workout ?? null,
    };
  });

  return { items, dailyLimits, needsLocation, needsPreference };
}

// Persist locally-swiped IDs so they don't reappear if the user navigates
// away and back before the server-side insert is reflected by the feed RPC.
// Scoped per-user; cleared on rewind.
const SWIPED_KEY_PREFIX = "hunie:swiped:";
function readSwiped(uid: string | undefined): Set<string> {
  if (!uid || typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SWIPED_KEY_PREFIX + uid);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function writeSwiped(uid: string | undefined, set: Set<string>) {
  if (!uid || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SWIPED_KEY_PREFIX + uid, JSON.stringify(Array.from(set)));
  } catch {
    /* quota — ignore */
  }
}

export function useDiscovery(options: DiscoveryOptions = {}) {
  const { user } = useAuth();
  const { filters, userCoords, isPremium = false } = options;

  // Offset-based pagination. When the client runs low on cards, `loadMore`
  // fetches the next page and appends. Reset whenever filters/coords/user change.
  const [pages, setPages] = useState<DiscoverProfile[][]>([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Normalize filters into a stable primitive shape so a new object identity
  // on each render (e.g. `{}` literal) does NOT trigger a refetch. Premium-
  // only fields are collapsed to null for non-premium so mexer neles não
  // invalida o cache quando o servidor os ignoraria de qualquer forma.
  const filtersKey = useMemo(() => {
    if (!filters) return null;
    const norm = {
      gender: filters.gender ?? null,
      ageMin: filters.ageMin ?? null,
      ageMax: filters.ageMax ?? null,
      distance: filters.distance ?? null,
      hasBio: filters.hasBio ?? null,
      verifiedOnly: filters.verifiedOnly ?? null,
      onlineNow: filters.onlineNow ?? null,
      heightMin: isPremium ? (filters.heightMin ?? null) : null,
      heightMax: isPremium ? (filters.heightMax ?? null) : null,
      interests: isPremium ? [...(filters.interests ?? [])].sort() : [],
      smoke: isPremium ? (filters.lifestyle?.smoke ?? null) : null,
      drink: isPremium ? (filters.lifestyle?.drink ?? null) : null,
      workout: isPremium ? (filters.lifestyle?.workout ?? null) : null,
    };
    return JSON.stringify(norm);
  }, [filters, isPremium]);

  // Round coords to ~1km precision so tiny GPS jitter doesn't invalidate cache.
  const coordsKey = useMemo(() => {
    if (!userCoords) return null;
    const round = (n: number) => Math.round(n * 100) / 100;
    return `${round(userCoords.lat)},${round(userCoords.lng)}`;
  }, [userCoords]);

  const queryKey = useMemo(
    () => ["discovery", user?.id ?? null, filtersKey, coordsKey] as const,
    [user?.id, filtersKey, coordsKey],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchDiscovery(filters, userCoords, 0, isPremium),
    enabled: !!user,
    // Keep the feed fresh for 60s so remounts (tab switches, route
    // navigations) don't trigger a new RPC on every mount.
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Reset accumulated pages when the base query changes (new filters/coords).
  useEffect(() => {
    setPages([]);
    setOffset(0);
  }, [queryKey]);

  const baseItems = data?.items ?? [];
  const rawItems: DiscoverProfile[] = useMemo(() => {
    const seen = new Set<string>();
    const merged: DiscoverProfile[] = [];
    for (const list of [baseItems, ...pages]) {
      for (const p of list) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        merged.push(p);
      }
    }
    return merged;
  }, [baseItems, pages]);

  const items: DiscoverProfile[] = useMemo(() => {
    const swiped = readSwiped(user?.id);
    if (!swiped.size) return rawItems;
    return rawItems.filter((p) => !swiped.has(p.id));
  }, [rawItems, user?.id]);

  const dailyLimits = data?.dailyLimits ?? DEFAULT_LIMITS;
  const needsLocation = !!data?.needsLocation;
  const needsPreference = !!data?.needsPreference;
  const loading = !!user && isLoading;

  const reload = useCallback(async () => {
    setPages([]);
    setOffset(0);
    await refetch();
  }, [refetch]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    // Only paginate when the current page is full — a short page means the end.
    const currentCount = baseItems.length + pages.reduce((n: number, p: DiscoverProfile[]) => n + p.length, 0);
    if (currentCount < PAGE_SIZE) return;
    setLoadingMore(true);
    try {
      const nextOffset = offset + PAGE_SIZE;
      const result = await fetchDiscovery(filters, userCoords, nextOffset, isPremium);
      if (result.items.length) {
        setPages((prev: DiscoverProfile[][]) => [...prev, result.items]);
        setOffset(nextOffset);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, baseItems.length, pages, offset, filters, userCoords, isPremium]);

  const markSwipedLocal = useCallback(
    (targetId: string) => {
      const set = readSwiped(user?.id);
      set.add(targetId);
      writeSwiped(user?.id, set);
    },
    [user?.id],
  );

  const unmarkSwipedLocal = useCallback(
    (targetId: string) => {
      const set = readSwiped(user?.id);
      set.delete(targetId);
      writeSwiped(user?.id, set);
    },
    [user?.id],
  );

  const swipe = useCallback(
    async (
      targetId: string,
      direction: "like" | "pass" | "super",
      opts?: { firstImpressionMessage?: string },
    ): Promise<{
      matched: boolean;
      matchId?: string;
      reason?: string;
      remainingSuperLikes?: number;
      remainingFirstImpressions?: number;
    }> => {
      if (!user) return { matched: false };
      // Mark BEFORE the RPC so a fast back-navigation can't reveal the card.
      markSwipedLocal(targetId);
      const fiMsg = opts?.firstImpressionMessage?.trim().slice(0, 280) || null;
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>)("insert_swipe", {
        _target_id: targetId,
        _direction: direction,
        _first_impression_message: fiMsg,
      });
      if (error) {
        console.error("insert_swipe failed", error);
        unmarkSwipedLocal(targetId);
        return { matched: false, reason: "insert_failed" };
      }
      const res = data as {
        success: boolean;
        reason?: string;
        matched?: boolean;
        match_id?: string;
        remaining_super_likes?: number | null;
        remaining_first_impressions?: number | null;
      } | null;
      if (!res?.success) {
        unmarkSwipedLocal(targetId);
        const reasonMap: Record<string, string> = {
          insufficient_super_like: "insufficient_credits",
          insufficient_first_impression: "insufficient_credits",
          daily_limit_reached: "daily_limit_reached",
          paywall_required: "paywall_required",
        };
        return { matched: false, reason: reasonMap[res?.reason ?? ""] ?? res?.reason };
      }
      if (fiMsg || direction === "super") {
        window.dispatchEvent(new CustomEvent("hunie:credits-changed"));
      }
      return {
        matched: !!res.matched,
        matchId: res.match_id ?? undefined,
        remainingSuperLikes: res.remaining_super_likes ?? undefined,
        remainingFirstImpressions: res.remaining_first_impressions ?? undefined,
      };
    },
    [user, markSwipedLocal, unmarkSwipedLocal],
  );

  const rewind = useCallback(async (): Promise<{
    success: boolean;
    swipedId?: string;
    error?: string;
  }> => {
    const { data } = await supabase.rpc("rewind_last_swipe");
    const res = data as { success: boolean; swiped_id?: string; error?: string } | null;
    if (res?.success) {
      if (res.swiped_id) unmarkSwipedLocal(res.swiped_id);
      return { success: true, swipedId: res.swiped_id };
    }
    return { success: false, error: res?.error };
  }, [unmarkSwipedLocal]);

  return { items, loading, swipe, rewind, reload, loadMore, loadingMore, dailyLimits, needsLocation, needsPreference };
}
