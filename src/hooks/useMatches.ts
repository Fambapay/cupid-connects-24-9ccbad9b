import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhotos } from "@/lib/photos";

export interface MatchSummary {
  matchId: string;
  otherId: string;
  name: string;
  photo: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
  hasMessages: boolean;
}

export function useMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: rows }, { data: blocksA }, { data: blocksB }] = await Promise.all([
      supabase
        .from("matches")
        .select("id,user_a,user_b,last_message_at,created_at")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false }),
      supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id),
      supabase.from("blocked_users").select("blocker_id").eq("blocked_id", user.id),
    ]);

    const blocked = new Set<string>();
    (blocksA ?? []).forEach((b) => blocked.add(b.blocked_id as string));
    (blocksB ?? []).forEach((b) => blocked.add(b.blocker_id as string));

    const list = (rows ?? []).filter((m) => {
      const otherId = (m.user_a === user.id ? m.user_b : m.user_a) as string;
      return !blocked.has(otherId);
    });
    if (!list.length) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const otherIds = list.map((m) => (m.user_a === user.id ? m.user_b : m.user_a) as string);

    const matchIds = list.map((m) => m.id as string);
    const [{ data: profiles }, { data: photos }, { data: lastMsgs }, { data: reads }, { data: unreadMsgs }] = await Promise.all([
      supabase.from("profiles").select("id,name").in("id", otherIds),
      supabase
        .from("profile_photos")
        .select("profile_id,storage_path,position")
        .in("profile_id", otherIds)
        .order("position", { ascending: true }),
      supabase
        .from("messages")
        .select("match_id,content,created_at,sender_id")
        .in("match_id", matchIds)
        .order("created_at", { ascending: false }),
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

    const firstPhotoByProfile: Record<string, string> = {};
    (photos ?? []).forEach((p) => {
      const pid = p.profile_id as string;
      if (!firstPhotoByProfile[pid]) firstPhotoByProfile[pid] = p.storage_path as string;
    });
    const paths = otherIds.map((id) => firstPhotoByProfile[id]).filter(Boolean);
    const signed = await signPhotos(paths, 3600, { width: 160, height: 160, resize: "cover", quality: 70 });
    const signedByPath: Record<string, string> = {};
    paths.forEach((p, i) => (signedByPath[p] = signed[i] ?? ""));

    const nameById: Record<string, string> = {};
    (profiles ?? []).forEach((p) => (nameById[p.id as string] = (p.name as string) ?? ""));

    const lastByMatch: Record<string, { content: string; at: string }> = {};
    (lastMsgs ?? []).forEach((m) => {
      const mid = m.match_id as string;
      if (!lastByMatch[mid]) {
        lastByMatch[mid] = { content: m.content as string, at: m.created_at as string };
      }
    });

    const readByMatch: Record<string, string> = {};
    (reads ?? []).forEach((r) => (readByMatch[r.match_id as string] = r.last_read_at as string));

    const unreadByMatch: Record<string, number> = {};
    (unreadMsgs ?? []).forEach((m) => {
      const mid = m.match_id as string;
      const readAt = readByMatch[mid];
      if (!readAt || new Date(m.created_at as string) > new Date(readAt)) {
        unreadByMatch[mid] = (unreadByMatch[mid] ?? 0) + 1;
      }
    });


    setMatches(
      list.map((m) => {
        const otherId = (m.user_a === user.id ? m.user_b : m.user_a) as string;
        const path = firstPhotoByProfile[otherId];
        const last = lastByMatch[m.id as string];
        return {
          matchId: m.id as string,
          otherId,
          name: nameById[otherId] ?? "Alguém",
          photo: path ? signedByPath[path] : "",
          lastMessage: last?.content ?? null,
          lastMessageAt: last?.at ?? (m.last_message_at as string),
          unread: unreadByMatch[m.id as string] ?? 0,
          hasMessages: !!last,
        };
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`matches-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  return { matches, loading, reload: load };
}
