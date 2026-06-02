import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhotos } from "@/lib/photos";

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
}

function computeAge(birthdate: string | null): number {
  if (!birthdate) return 0;
  const d = new Date(birthdate);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

export function useDiscovery() {
  const { user } = useAuth();
  const [items, setItems] = useState<DiscoverProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: mySwipes }, { data: me }] = await Promise.all([
      supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
      supabase.from("profiles").select("interested_in").eq("id", user.id).maybeSingle(),
    ]);

    const excluded = new Set<string>((mySwipes ?? []).map((s) => s.swiped_id as string));
    excluded.add(user.id);

    let q = supabase
      .from("profiles")
      .select("id,name,age,birthdate,city,country,bio,interests,is_verified,gender")
      .eq("onboarding_completed", true)
      .eq("is_paused", false)
      .limit(50);

    const interestedIn = (me?.interested_in ?? []) as string[];
    if (interestedIn.length) q = q.in("gender", interestedIn);

    const { data: rows } = await q;
    const candidates = (rows ?? []).filter((r) => !excluded.has(r.id));
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
        })),
    );
    setLoading(false);
  }, [user]);

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

