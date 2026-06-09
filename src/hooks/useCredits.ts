import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Credits {
  boost_balance: number;
  super_like_balance: number;
}

const EMPTY_CREDITS: Credits = {
  boost_balance: 0,
  super_like_balance: 0,
};

const creditsCache = new Map<string, Credits>();

export function useCredits() {
  const { user } = useAuth();
  const cached = user ? creditsCache.get(user.id) ?? EMPTY_CREDITS : EMPTY_CREDITS;
  const [credits, setCredits] = useState<Credits>(cached);
  const [loading, setLoading] = useState(!user ? false : !creditsCache.has(user.id));

  const load = useCallback(async () => {
    if (!user) {
      setCredits(EMPTY_CREDITS);
      setLoading(false);
      return;
    }
    // Lazy daily/weekly refill for active members — no-op if already refilled today.
    await supabase.rpc("refill_my_credits");
    const { data } = await supabase
      .from("user_credits")
      .select("boost_balance, super_like_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    const next = data ? (data as Credits) : EMPTY_CREDITS;
    creditsCache.set(user.id, next);
    setCredits(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      const c = creditsCache.get(user.id);
      if (c) setCredits(c);
    }
    load();
  }, [load, user]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const reload = () => load();
    const reloadWhenVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("hunie:credits-changed", reload);
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", reloadWhenVisible);
    return () => {
      window.removeEventListener("hunie:credits-changed", reload);
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", reloadWhenVisible);
    };
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user_credits:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Credits | null;
          if (row) setCredits({
            boost_balance: row.boost_balance ?? 0,
            super_like_balance: row.super_like_balance ?? 0,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const syncCredits = useCallback((next: Partial<Credits>) => {
    setCredits((current) => ({
      boost_balance: next.boost_balance ?? current.boost_balance,
      super_like_balance: next.super_like_balance ?? current.super_like_balance,
    }));
  }, []);

  return { credits, loading, reload: load, syncCredits };
}
