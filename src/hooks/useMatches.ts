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

interface RawSummary {
  match_id: string;
  other_id: string;
  name: string;
  photo_path: string | null;
  last_message: string | null;
  last_message_at: string;
  unread: number;
  has_messages: boolean;
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

    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: unknown; error: unknown }>)("get_match_summaries");

    if (error) {
      console.error("get_match_summaries failed", error);
      setMatches([]);
      setLoading(false);
      return;
    }

    const rows = (data as RawSummary[] | null) ?? [];
    if (!rows.length) {
      setMatches([]);
      setLoading(false);
      return;
    }

    const paths = rows.map((r) => r.photo_path).filter(Boolean) as string[];
    const signed = paths.length
      ? await signPhotos(paths, 3600, { width: 160, height: 160, resize: "cover", quality: 70 })
      : [];
    const signedByPath: Record<string, string> = {};
    paths.forEach((p, i) => (signedByPath[p] = signed[i] ?? ""));

    setMatches(
      rows.map((r) => ({
        matchId: r.match_id,
        otherId: r.other_id,
        name: r.name,
        photo: r.photo_path ? signedByPath[r.photo_path] ?? "" : "",
        lastMessage: r.last_message,
        lastMessageAt: r.last_message_at,
        unread: r.unread,
        hasMessages: r.has_messages,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    // Filter realtime to only my matches; messages don't support filtered
    // wildcard inserts here so we listen broadly and let load() de-dupe.
    const ch = supabase
      .channel(`matches-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `user_a=eq.${user.id}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `user_b=eq.${user.id}` },
        () => load(),
      )
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
