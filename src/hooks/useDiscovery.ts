import { useCallback, useEffect, useState } from "react";
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

export function useDiscovery(options: DiscoveryOptions = {}) {
  const { user } = useAuth();
  const { filters, userCoords } = options;
  const [items, setItems] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [
      { data: mySwipes },
      { data: me },
      { data: mySettings },
      { data: blocksA },
      { data: blocksB },
    ] = await Promise.all([
      supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
      supabase
        .from("profiles")
        .select("interested_in, latitude, longitude")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select("age_min, age_max, distance_radius, require_bio, min_photos")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
      supabase.from("blocked_users").select("blocker_id").eq("blocked_id", user.id),
    ]);

    const excluded = new Set<string>((mySwipes ?? []).map((s) => s.swiped_id as string));
    excluded.add(user.id);
    (blocksA ?? []).forEach((b) => excluded.add(b.blocked_id as string));
    (blocksB ?? []).forEach((b) => excluded.add(b.blocker_id as string));

    let q = supabase
      .from("profiles")
      .select(
        "id,name,age,birthdate,city,country,bio,interests,is_verified,gender,latitude,longitude,last_active_at,is_seed",
      )
      .eq("onboarding_completed", true)
      .eq("is_paused", false)
      .order("is_seed", { ascending: true }) // real users first, seeds fill the rest
      .limit(100);

    // Gender: explicit filter overrides profile preference.
    const genderFilter = filters ? mapGenderFilter(filters.gender) : null;
    if (genderFilter) {
      q = q.in("gender", genderFilter);
    } else {
      const interestedIn = (me?.interested_in ?? []) as string[];
      if (interestedIn.length) q = q.in("gender", interestedIn);
    }

    // Resolve age + bio settings: explicit filters win, otherwise saved settings.
    const ageMin = filters?.ageMin ?? mySettings?.age_min ?? 18;
    const ageMax = filters?.ageMax ?? mySettings?.age_max ?? 80;
    const distanceMax = filters?.distance ?? mySettings?.distance_radius ?? 200;
    const requireBio = filters?.hasBio ?? mySettings?.require_bio ?? false;

    if (ageMin > 18) q = q.gte("age", ageMin);
    if (ageMax < 80) q = q.lte("age", ageMax);
    if (filters?.verifiedOnly) q = q.eq("is_verified", true);
    if (requireBio) q = q.not("bio", "is", null).neq("bio", "");

    const { data: rows } = await q;
    let candidates = (rows ?? []).filter((r) => !excluded.has(r.id));

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

    // Online-now filter
    if (filters?.onlineNow) {
      const now = Date.now();
      candidates = candidates.filter((r) => {
        const t = r.last_active_at ? new Date(r.last_active_at as string).getTime() : 0;
        return now - t <= ONLINE_WINDOW_MS;
      });
    }

    if (!candidates.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const candidateOrder = new Map(candidates.map((r, i) => [r.id, i]));
    const { data: activeBoosts } = await supabase
      .from("boosts")
      .select("profile_id,expires_at")
      .in("profile_id", candidates.map((r) => r.id))
      .gt("expires_at", new Date().toISOString());
    const boostedIds = new Set((activeBoosts ?? []).map((b) => b.profile_id as string));
    candidates = [...candidates].sort((a, b) => {
      const boostedA = boostedIds.has(a.id) ? 1 : 0;
      const boostedB = boostedIds.has(b.id) ? 1 : 0;
      if (boostedA !== boostedB) return boostedB - boostedA;
      return (candidateOrder.get(a.id) ?? 0) - (candidateOrder.get(b.id) ?? 0);
    });

    const ids = candidates.map((r) => r.id);
    const { data: photos } = await supabase
      .from("profile_photos")
      .select("profile_id,storage_path,position")
      .in("profile_id", ids)
      .order("position", { ascending: true });

    const paths = (photos ?? []).map((p) => p.storage_path as string);
    // Edge-resize discovery cards (full-bleed, ~390px @ dpr 2 = 780px).
    const signed = await signPhotos(paths, 3600, { width: 800, quality: 72, resize: "cover" });
    const byProfile: Record<string, string[]> = {};
    (photos ?? []).forEach((p, i) => {
      const url = signed[i];
      if (!url) return;
      (byProfile[p.profile_id as string] ??= []).push(url);
    });

    const minPhotos = Math.max(1, mySettings?.min_photos ?? 1);
    const now = Date.now();
    setItems(
      candidates
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
        }),
    );
    setLoading(false);
  }, [user, filters, userCoords]);

  useEffect(() => {
    load();
  }, [load]);

  const swipe = useCallback(
    async (
      targetId: string,
      direction: "like" | "pass" | "super",
    ): Promise<{ matched: boolean; matchId?: string; reason?: string; remainingSuperLikes?: number }> => {
      if (!user) return { matched: false };
      let remainingSuperLikes: number | undefined;

      // For Super Like, verify the user has at least one credit BEFORE
      // attempting the insert (cheap read; consume happens only after a
      // successful insert so a failed swipe never burns a credit).
      if (direction === "super") {
        const { data: balance } = await supabase
          .from("user_credits")
          .select("super_like_balance")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!balance || (balance.super_like_balance ?? 0) <= 0) {
          return { matched: false, reason: "insufficient_credits" };
        }
      }

      const { error: insertError } = await supabase
        .from("swipes")
        .insert({ swiper_id: user.id, swiped_id: targetId, direction });
      if (insertError) {
        console.error("swipe insert failed", insertError);
        return { matched: false, reason: "insert_failed" };
      }

      // Insert succeeded — now atomically consume the credit. If this fails
      // (race with concurrent consume, network blip), the user got one free
      // Super Like; we surface a warning but do not roll back the swipe.
      if (direction === "super") {
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
      return { matched: !!match, matchId: match?.id, remainingSuperLikes };
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
    if (res?.success) {
      await load();
      return { success: true, swipedId: res.swiped_id };
    }
    return { success: false, error: res?.error };
  }, [load]);

  return { items, loading, swipe, rewind, reload: load };
}
