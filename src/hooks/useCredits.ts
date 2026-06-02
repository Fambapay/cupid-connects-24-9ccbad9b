import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Credits {
  boost_balance: number;
  super_like_balance: number;
}

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<Credits>({
    boost_balance: 0,
    super_like_balance: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setCredits({ boost_balance: 0, super_like_balance: 0 });
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("user_credits")
      .select("boost_balance, super_like_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setCredits(data as Credits);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
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

  return { credits, loading, reload: load };
}
