import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhoto } from "@/lib/photos";

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  /** Nulo quando o utilizador não tem premium e a mensagem não é sua. */
  content: string | null;
  is_locked?: boolean;
  created_at: string;
}

export interface MatchPeer {
  id: string;
  name: string;
  photo: string;
  lastActiveAt: string | null;
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

    const [{ data: prof }, { data: photo }, { data: msgsJson }] = await Promise.all([
      supabase.from("profiles").select("name,last_active_at").eq("id", otherId).maybeSingle(),
      supabase
        .from("profile_photos")
        .select("storage_path")
        .eq("profile_id", otherId)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle(),
      // Corpo mascarado server-side para users sem premium (privacy hard-guard).
      supabase.rpc("get_match_messages", { _match_id: matchId }),
    ]);
    const msgs = (Array.isArray(msgsJson) ? msgsJson : []) as unknown as ChatMessage[];

    const photoUrl = photo?.storage_path
      ? await signPhoto(photo.storage_path as string, 3600, { width: 96, height: 96, resize: "cover", quality: 70 })
      : "";
    setPeer({
      id: otherId,
      name: (prof?.name as string) ?? "Alguém",
      photo: photoUrl,
      lastActiveAt: (prof?.last_active_at as string | null) ?? null,
    });
    setMessages(msgs);
    setLoading(false);
  }, [user, matchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: quando entra uma mensagem nova, refazemos o fetch via RPC para garantir
  // que users sem premium recebem o corpo mascarado (nunca confiar em payload.new.content).
  useEffect(() => {
    if (!matchId) return;
    const ch = supabase
      .channel(`messages-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
        async () => {
          const { data } = await supabase.rpc("get_match_messages", { _match_id: matchId });
          if (Array.isArray(data)) {
            setMessages(data as unknown as ChatMessage[]);
          }
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
      // Optimistic insert so the sender sees the bubble immediately
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        match_id: matchId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      const { data, error } = await supabase
        .from("messages")
        .insert({ match_id: matchId, sender_id: user.id, content })
        .select()
        .single();

      if (error || !data) {
        console.error("[messages.send] failed:", error);
        // Roll back optimistic bubble
        setMessages((prev) => prev.filter((x) => x.id !== tempId));
        const { toast } = await import("sonner");
        // RLS bloqueia Free de iniciar conversa; mostra CTA em vez de erro cru.
        const msg = (error?.message ?? "").toLowerCase();
        const isPaywallBlock =
          error?.code === "42501" ||
          msg.includes("row-level security") ||
          msg.includes("row level security") ||
          msg.includes("violates");
        if (isPaywallBlock) {
          toast.error("Desbloqueia a conversa", {
            description: "Precisas de um plano para iniciar. Vê os planos.",
            action: {
              label: "Ver planos",
              onClick: () => {
                window.location.assign("/membership?required=1");
              },
            },
          });
        } else {
          toast.error("Não foi possível enviar", {
            description: error?.message ?? "Tenta novamente.",
          });
        }
        return;
      }

      // Replace optimistic with the real row
      setMessages((prev) => {
        if (prev.some((x) => x.id === (data.id as string))) {
          return prev.filter((x) => x.id !== tempId);
        }
        return prev.map((x) => (x.id === tempId ? (data as ChatMessage) : x));
      });
    },
    [user, matchId],
  );

  return { messages, peer, loading, notFound, send, reload: load };
}
