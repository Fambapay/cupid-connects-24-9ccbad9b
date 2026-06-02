import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhotos } from "@/lib/photos";

export interface Liker {
  id: string;
  name: string;
  age: number;
  city: string;
  photo: string;
  isSuper: boolean;
}

function computeAge(birthdate: string | null): number {
  if (!birthdate) return 0;
  const d = new Date(birthdate);
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)));
}

export function useLikedMe() {
  const { user } = useAuth();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLikers([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: incoming }, { data: outgoing }] = await Promise.all([
      supabase
        .from("swipes")
        .select("swiper_id,direction,created_at")
        .eq("swiped_id", user.id)
        .in("direction", ["like", "super"])
        .order("created_at", { ascending: false }),
      supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
    ]);

    const alreadyResponded = new Set((outgoing ?? []).map((s) => s.swiped_id as string));
    const pending = (incoming ?? []).filter((s) => !alreadyResponded.has(s.swiper_id as string));

    if (!pending.length) {
      setLikers([]);
      setLoading(false);
      return;
    }

    const ids = pending.map((s) => s.swiper_id as string);
    const [{ data: profiles }, { data: photos }] = await Promise.all([
      supabase.from("profiles").select("id,name,age,birthdate,city").in("id", ids),
      supabase
        .from("profile_photos")
        .select("profile_id,storage_path,position")
        .in("profile_id", ids)
        .order("position", { ascending: true }),
    ]);

    const firstPath: Record<string, string> = {};
    (photos ?? []).forEach((p) => {
      const pid = p.profile_id as string;
      if (!firstPath[pid]) firstPath[pid] = p.storage_path as string;
    });
    const paths = ids.map((id) => firstPath[id]).filter(Boolean);
    const signed = await signPhotos(paths);
    const urlByPath: Record<string, string> = {};
    paths.forEach((p, i) => (urlByPath[p] = signed[i] ?? ""));

    const profById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    setLikers(
      pending
        .map((s) => {
          const id = s.swiper_id as string;
          const p = profById.get(id);
          if (!p) return null;
          return {
            id,
            name: (p.name as string) ?? "Alguém",
            age: (p.age as number) ?? computeAge(p.birthdate as string | null),
            city: (p.city as string) ?? "",
            photo: firstPath[id] ? urlByPath[firstPath[id]] : "",
            isSuper: s.direction === "super",
          } as Liker;
        })
        .filter((x): x is Liker => !!x),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { likers, loading, reload: load };
}
