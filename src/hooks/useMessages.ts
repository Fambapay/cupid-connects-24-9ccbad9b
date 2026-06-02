import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhoto } from "@/lib/photos";

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface MatchPeer {
  id: string;
  name: string;
  photo: string;
}

export function useMessages(matchId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peer, setPeer] = useState<MatchPeer | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!user || !matchId) return;
    setLoading(true);
    const { data: match } = await supabase
      .from("matches")
      .select("id,user_a,user_b")
      .eq("id", matchId)
      .maybeSingle();
    if (!match) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const otherId = (match.user_a === user.id ? match.user_b : match.user_a) as string;

    const [{ data: prof }, { data: photo }, { data: msgs }] = await Promise.all([
      supabase.from("profiles").select("name").eq("id", otherId).maybeSingle(),
      supabase
        .from("profile_photos")
        .select("storage_path")
        .eq("profile_id", otherId)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id,match_id,sender_id,content,created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true }),
    ]);

    const photoUrl = photo?.storage_path ? await signPhoto(photo.storage_path as string) : "";
    setPeer({ id: otherId, name: (prof?.name as string) ?? "Alguém", photo: photoUrl });
    setMessages((msgs ?? []) as ChatMessage[]);
    setLoading(false);
  }, [user, matchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription for new messages in this match
  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`messages-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [matchId]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || !user || !matchId) return;
      const { data, error } = await supabase
        .from("messages")
        .insert({ match_id: matchId, sender_id: user.id, content })
        .select()
        .single();
      if (!error && data) {
        setMessages((prev) =>
          prev.some((x) => x.id === (data.id as string)) ? prev : [...prev, data as ChatMessage],
        );
      }
    },
    [user, matchId],
  );

  return { messages, peer, loading, notFound, send, reload: load };
}
