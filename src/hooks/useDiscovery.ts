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
  distance: number;
}

export interface DiscoveryOptions {
  filters?: DiscoveryFilters;
  userCoords?: { lat: number; lng: number } | null;
}

function computeAge(birthdate: string | null): number {
  if (!birthdate) return 0;
  const d = new Date(birthdate);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

/** Haversine distance in km between two lat/lng pairs. */
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

/** Map FiltersSheet gender values → DB gender values. */
function mapGenderFilter(g: DiscoveryFilters["gender"]): string[] | null {
  switch (g) {
    case "feminino":
      return ["feminino"];
    case "masculino":
      return ["masculino"];
    case "nao_binario":
      return ["nao_binario", "outro"];
    case "todos":
    default:
      return null;
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
      { data: blocksA },
      { data: blocksB },
    ] = await Promise.all([
      supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
      supabase
        .from("profiles")
        .select("interested_in, latitude, longitude")
        .eq("id", user.id)
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
        "id,name,age,birthdate,city,country,bio,interests,is_verified,gender,latitude,longitude",
      )
      .eq("onboarding_completed", true)
      .eq("is_paused", false)
      .limit(100);

    // Gender: explicit filter overrides profile preference.
    const genderFilter = filters ? mapGenderFilter(filters.gender) : null;
    if (genderFilter) {
      q = q.in("gender", genderFilter);
    } else {
      const interestedIn = (me?.interested_in ?? []) as string[];
      if (interestedIn.length) q = q.in("gender", interestedIn);
    }

    // Age range (column `age` is denormalised in profiles).
    if (filters) {
      if (filters.ageMin > 18) q = q.gte("age", filters.ageMin);
      if (filters.ageMax < 80) q = q.lte("age", filters.ageMax);
      if (filters.verifiedOnly) q = q.eq("is_verified", true);
      if (filters.hasBio) q = q.not("bio", "is", null).neq("bio", "");
    }

    const { data: rows } = await q;
    let candidates = (rows ?? []).filter((r) => !excluded.has(r.id));

    // Distance filter (client-side haversine; requires both user + candidate coords).
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
      filters && myCoords
        ? withDistance.filter((r) => r._distance <= filters.distance)
        : withDistance;

    if (!candidates.length) {
      setItems([]);
      setLoading(false);
      return;
    }

    const ids = candidates.map((r) => r.id);
    const { data: photos } = await supabase
      .from("profile_photos")
      .select("profile_id,storage_path,position")
      .in("profile_id", ids)
      .order("position", { ascending: true });

    const paths = (photos ?? []).map((p) => p.storage_path as string);
    const signed = await signPhotos(paths);
    const byProfile: Record<string, string[]> = {};
    (photos ?? []).forEach((p, i) => {
      const url = signed[i];
      if (!url) return;
      (byProfile[p.profile_id as string] ??= []).push(url);
    });

    setItems(
      candidates
        .filter((r) => (byProfile[r.id]?.length ?? 0) > 0)
        .map((r) => ({
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
          isOnline: false,
          distance: (r as { _distance?: number })._distance ?? 0,
        })),
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
    ): Promise<{ matched: boolean; matchId?: string; reason?: string }> => {
      if (!user) return { matched: false };

      if (direction === "super") {
        const { data } = await supabase.rpc("consume_super_like_credit");
        const res = data as { success: boolean; reason?: string } | null;
        if (!res?.success) {
          return { matched: false, reason: res?.reason ?? "insufficient_credits" };
        }
      }

      await supabase
        .from("swipes")
        .insert({ swiper_id: user.id, swiped_id: targetId, direction });
      if (direction === "pass") return { matched: false };
      const a = user.id < targetId ? user.id : targetId;
      const b = user.id < targetId ? targetId : user.id;
      const { data: match } = await supabase
        .from("matches")
        .select("id")
        .eq("user_a", a)
        .eq("user_b", b)
        .maybeSingle();
      return { matched: !!match, matchId: match?.id };
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
