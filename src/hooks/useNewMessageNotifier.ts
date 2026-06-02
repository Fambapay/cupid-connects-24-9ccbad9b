import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhoto } from "@/lib/photos";

type PeerInfo = { name: string; photo: string };

/**
 * Global subscriber: shows a toast when a new message arrives
 * in any of the current user's matches, unless they're already
 * viewing that conversation.
 *
 * Relies on RLS: the realtime channel only delivers messages
 * the user can SELECT (i.e., messages in matches they belong to).
 */
export function useNewMessageNotifier() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);
  const peerCache = useRef<Map<string, PeerInfo>>(new Map());

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    const resolvePeer = async (matchId: string): Promise<PeerInfo | null> => {
      const cached = peerCache.current.get(matchId);
      if (cached) return cached;

      const { data: match } = await supabase
        .from("matches")
        .select("user_a,user_b")
        .eq("id", matchId)
        .maybeSingle();
      if (!match) return null;
      const otherId = (match.user_a === user.id ? match.user_b : match.user_a) as string;

      const [{ data: prof }, { data: photo }] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", otherId).maybeSingle(),
        supabase
          .from("profile_photos")
          .select("storage_path")
          .eq("profile_id", otherId)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      const photoUrl = photo?.storage_path
        ? await signPhoto(photo.storage_path as string)
        : "";
      const info: PeerInfo = { name: (prof?.name as string) ?? "Alguém", photo: photoUrl };
      peerCache.current.set(matchId, info);
      return info;
    };

    const ch = supabase
      .channel(`global-msgs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const m = payload.new as {
            id: string;
            match_id: string;
            sender_id: string;
            content: string;
          };
          if (m.sender_id === user.id) return;

          // Skip toast if user is already in this chat
          if (currentPathRef.current === `/chat/${m.match_id}`) return;

          const peer = await resolvePeer(m.match_id);
          if (!peer) return;

          toast(peer.name, {
            description:
              m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
            action: {
              label: "Abrir",
              onClick: () =>
                navigate({ to: "/chat/$matchId", params: { matchId: m.match_id } }),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, navigate]);
}
