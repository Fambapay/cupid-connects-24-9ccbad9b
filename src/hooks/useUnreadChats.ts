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
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
    const matchIds = (matches ?? []).map((m) => m.id as string);
    if (!matchIds.length) {
      setCount(0);
      return;
    }
    const [{ data: reads }, { data: msgs }] = await Promise.all([
      supabase
        .from("match_reads")
        .select("match_id,last_read_at")
        .eq("user_id", user.id)
        .in("match_id", matchIds),
      supabase
        .from("messages")
        .select("match_id,created_at,sender_id")
        .in("match_id", matchIds)
        .neq("sender_id", user.id),
    ]);
    const readBy: Record<string, string> = {};
    (reads ?? []).forEach((r) => (readBy[r.match_id as string] = r.last_read_at as string));
    const unreadMatches = new Set<string>();
    (msgs ?? []).forEach((m) => {
      const mid = m.match_id as string;
      const r = readBy[mid];
      if (!r || new Date(m.created_at as string) > new Date(r)) {
        unreadMatches.add(mid);
      }
    });
    setCount(unreadMatches.size);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`unread-chats-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_reads", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  return count;
}
