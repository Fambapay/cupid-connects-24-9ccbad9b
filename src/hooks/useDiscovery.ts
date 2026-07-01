import { useCallback, useMemo } from "react";
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
}

export interface DiscoveryOptions {
  filters?: DiscoveryFilters;
  userCoords?: { lat: number; lng: number } | null;
}

const ONLINE_WINDOW_MS = 90_000;

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
}

interface FeedResponse {
  candidates: RawCandidate[];
  daily_limits: {
    likes_used: number;
    likes_limit: number;
    super_used: number;
    super_limit: number;
  };
}

async function fetchDiscovery(
  filters: DiscoveryFilters | undefined,
  userCoords: { lat: number; lng: number } | null | undefined,
): Promise<DiscoveryResult> {
  // Resolve viewer coords (server-side path if not provided by caller).
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
    if (filters.ageMin != null) filterPayload.ageMin = filters.ageMin;
    if (filters.ageMax != null) filterPayload.ageMax = filters.ageMax;
    if (filters.distance != null) filterPayload.distance = filters.distance;
    if (filters.hasBio != null) filterPayload.hasBio = filters.hasBio;
    if (filters.verifiedOnly != null) filterPayload.verifiedOnly = filters.verifiedOnly;
    
    if (filters.heightMin != null) filterPayload.heightMin = filters.heightMin;
    if (filters.heightMax != null) filterPayload.heightMax = filters.heightMax;
  }


  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)("get_discovery_feed", {
    _filters: filterPayload,
    _viewer_lat: coords?.lat ?? null,
    _viewer_lng: coords?.lng ?? null,
    _limit: 100,
  });
  if (error) {
    console.error("get_discovery_feed failed", error);
    return { items: [], dailyLimits: DEFAULT_LIMITS };
  }
  const resp = (data as FeedResponse | null) ?? { candidates: [], daily_limits: { likes_used: 0, likes_limit: 5, super_used: 0, super_limit: 0 } };

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
    };
  });

  return { items, dailyLimits };
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
  const { filters, userCoords } = options;

  const queryKey = useMemo(
    () => ["discovery", user?.id ?? null, filters, userCoords] as const,
    [user?.id, filters, userCoords],
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchDiscovery(filters, userCoords),
    enabled: !!user,
    staleTime: 0,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Filter locally-swiped IDs so back/forward navigation never resurrects a
  // profile already actioned on this device, even if the server-side insert
  // is still in flight or the cached feed is served first.
  const rawItems: DiscoverProfile[] = data?.items ?? [];
  const items: DiscoverProfile[] = useMemo(() => {
    const swiped = readSwiped(user?.id);
    if (!swiped.size) return rawItems;
    return rawItems.filter((p) => !swiped.has(p.id));
  }, [rawItems, user?.id]);
  const dailyLimits = data?.dailyLimits ?? DEFAULT_LIMITS;
  const loading = !!user && isLoading;

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

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

  return { items, loading, swipe, rewind, reload, dailyLimits };
}
