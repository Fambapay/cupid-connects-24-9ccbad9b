import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Lightweight badge counter for the "Likes" tab.
 * Counts incoming likes/supers that the user hasn't responded to yet.
 * Realtime-aware: refreshes on new swipes/blocks.
 */
export function useLikesCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const [
        { data: incoming },
        { data: outgoing },
        { data: blocksA },
        { data: blocksB },
      ] = await Promise.all([
        supabase
          .from("swipes")
          .select("swiper_id")
          .eq("swiped_id", user.id)
          .in("direction", ["like", "super"]),
        supabase.from("swipes").select("swiped_id").eq("swiper_id", user.id),
        supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
        supabase.from("blocked_users").select("blocker_id").eq("blocked_id", user.id),
      ]);
      if (cancelled) return;
      const responded = new Set((outgoing ?? []).map((s) => s.swiped_id as string));
      const blocked = new Set<string>();
      (blocksA ?? []).forEach((b) => blocked.add(b.blocked_id as string));
      (blocksB ?? []).forEach((b) => blocked.add(b.blocker_id as string));
      const pending = (incoming ?? []).filter(
        (s) => !responded.has(s.swiper_id as string) && !blocked.has(s.swiper_id as string),
      );
      setCount(pending.length);
    };

    load();

    const channel = supabase
      .channel(`likes-count-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "swipes", filter: `swiped_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "swipes", filter: `swiper_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}
