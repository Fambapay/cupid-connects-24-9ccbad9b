import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useUnreadChats() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: unknown; error: unknown }>)("get_unread_chats_count");
    if (error) {
      console.error("get_unread_chats_count failed", error);
      setCount(0);
      return;
    }
    setCount(typeof data === "number" ? data : 0);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`unread-chats-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_reads", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_a=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches", filter: `user_b=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  return count;
}
