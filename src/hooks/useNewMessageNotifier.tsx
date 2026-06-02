import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhoto } from "@/lib/photos";
import { AppleToast } from "@/components/notifications/AppleToast";

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

    const preloadImage = (url: string) => {
      if (!url || typeof window === "undefined") return;
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      img.decode?.().catch(() => {});
    };

    const fetchPeer = async (matchId: string): Promise<PeerInfo | null> => {
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
      preloadImage(photoUrl);
      return info;
    };

    const resolvePeer = async (matchId: string): Promise<PeerInfo | null> => {
      const cached = peerCache.current.get(matchId);
      if (cached) return cached;
      return fetchPeer(matchId);
    };

    // Warm cache: prefetch peer info + decode avatars for all existing
    // matches so the first incoming toast renders the photo instantly.
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);
      if (!matches) return;
      await Promise.all(matches.map((row) => fetchPeer(row.id as string)));
    })();



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

          const body =
            m.content.length > 120 ? `${m.content.slice(0, 120)}…` : m.content;
          toast.custom(
            (t) => (
              <AppleToast
                toastId={t}
                title={peer.name}
                body={body}
                avatar={peer.photo}
                appName="Hunie"
                timeLabel="agora"
                onClick={() => {
                  toast.dismiss(t);
                  navigate({ to: "/chat/$matchId", params: { matchId: m.match_id } });
                }}
                onDismiss={() => toast.dismiss(t)}
              />
            ),
            { duration: 5000 },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, navigate]);
}
