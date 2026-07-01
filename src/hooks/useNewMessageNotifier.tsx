import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { signPhoto } from "@/lib/photos";
import { AppleToast } from "@/components/notifications/AppleToast";
import { LikeRevealToast } from "@/components/notifications/LikeRevealToast";
import {
  scheduleLocalNotification,
} from "@/lib/native/localNotifications";

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

    let notificationsEnabled = true;
    const checkSettings = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("notifications_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      notificationsEnabled = (data?.notifications_enabled ?? true) as boolean;
    };
    checkSettings();
    // Live-react to settings changes
    const settingsCh = supabase
      .channel(`settings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${user.id}` },
        (p) => {
          const row = (p.new ?? p.old) as { notifications_enabled?: boolean } | null;
          if (row && typeof row.notifications_enabled === "boolean") {
            notificationsEnabled = row.notifications_enabled;
          }
        },
      )
      .subscribe();

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
        ? await signPhoto(photo.storage_path as string, 3600, { width: 96, height: 96, resize: "cover", quality: 70 })
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



    // Fetch own tier for like-reveal gating (mirrors push payload logic)
    let isPremium = false;
    supabase
      .from("profiles")
      .select("membership_tier")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const tier = (data?.membership_tier as string | undefined) ?? "free";
        isPremium = tier !== "free";
      });

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
          if (!notificationsEnabled) return;

          // Skip toast if user is already in this chat
          if (currentPathRef.current === `/chat/${m.match_id}`) return;

          const peer = await resolvePeer(m.match_id);
          if (!peer) return;

          const body =
            m.content.length > 120 ? `${m.content.slice(0, 120)}…` : m.content;

          void scheduleLocalNotification({
            id: m.id.split('-').map(s => parseInt(s, 16)).reduce((a, b) => a + b, 0) % 2147483647,
            title: peer.name,
            body,
            extra: { type: 'message', matchId: m.match_id },
          });

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

    // New match toast — fire instantly, fill in peer info as it arrives
    const matchesCh = supabase
      .channel(`global-matches-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        async (payload) => {
          if (!notificationsEnabled) return;
          const row = payload.new as { id: string; user_a: string; user_b: string };
          if (row.user_a !== user.id && row.user_b !== user.id) return;
          if (currentPathRef.current === "/matches") return;

          const cached = peerCache.current.get(row.id);
          const peerPromise = cached ? Promise.resolve(cached) : resolvePeer(row.id);
          const bodyTemplate = (name: string) => `Tu e ${name} deram like. Manda já uma mensagem!`;

          const notifId = row.id.split('-').map(s => parseInt(s, 16)).reduce((a, b) => a + b, 0) % 2147483647;
          void scheduleLocalNotification({
            id: notifId,
            title: 'Novo match 💘',
            body: cached ? bodyTemplate(cached.name) : 'Deram like um no outro. Manda já uma mensagem!',
            extra: { type: 'match', matchId: row.id },
          });

          toast.custom(
            (t) => (
              <AppleToast
                toastId={t}
                title="Novo match 💘"
                body={cached ? bodyTemplate(cached.name) : "Deram like um no outro. Manda já uma mensagem!"}
                avatar={cached?.photo}
                avatarPromise={peerPromise.then((p) => p?.photo)}
                bodyTemplate={bodyTemplate}
                namePromise={peerPromise.then((p) => p?.name)}
                appName="Hunie"
                timeLabel="agora"
                onClick={() => {
                  toast.dismiss(t);
                  navigate({ to: "/matches" });
                }}
                onDismiss={() => toast.dismiss(t)}
              />
            ),
            { duration: 5000 },
          );
        },
      )
      .subscribe();

    // New like toast (only received likes/super likes, not passes)
    const likesCh = supabase
      .channel(`global-likes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "swipes",
          filter: `swiped_id=eq.${user.id}`,
        },
        async (payload) => {
          if (!notificationsEnabled) return;
          const s = payload.new as {
            id: string;
            swiper_id: string;
            direction: "like" | "pass" | "super";
          };
          if (s.direction === "pass") return;
          if (currentPathRef.current === "/discover") return;

          const isSuper = s.direction === "super";

          // Free users: no photo, no name — blurred silhouette + CTA to Select
          if (!isPremium) {
            void scheduleLocalNotification({
              id: s.id.split('-').map(x => parseInt(x, 16)).reduce((a, b) => a + b, 0) % 2147483647,
              title: isSuper ? "Super Like ⭐" : "Novo like 👀",
              body: "Alguém mostrou interesse no teu perfil. Revela quem foi.",
              extra: { type: 'like' },
            });

            toast.custom(
              (t) => (
                <LikeRevealToast
                  toastId={t}
                  isSuper={isSuper}
                  onReveal={() => {
                    toast.dismiss(t);
                    navigate({ to: "/membership" });
                  }}
                  onDismiss={() => toast.dismiss(t)}
                />
              ),
              { duration: 6000 },
            );
            return;
          }

          // Premium: full reveal with photo + name
          const [{ data: prof }, { data: photo }] = await Promise.all([
            supabase.from("profiles").select("name").eq("id", s.swiper_id).maybeSingle(),
            supabase
              .from("profile_photos")
              .select("storage_path")
              .eq("profile_id", s.swiper_id)
              .order("position", { ascending: true })
              .limit(1)
              .maybeSingle(),
          ]);
          const revealName = (prof?.name as string) || "Alguém";
          const avatar = photo?.storage_path
            ? await signPhoto(photo.storage_path as string, 3600, {
                width: 96,
                height: 96,
                resize: "cover",
                quality: 70,
              })
            : "";

          void scheduleLocalNotification({
            id: s.id.split('-').map(x => parseInt(x, 16)).reduce((a, b) => a + b, 0) % 2147483647,
            title: isSuper ? "Super Like ⭐" : "Novo like 👀",
            body: `${revealName} mostrou interesse no teu perfil.`,
            extra: { type: 'like', swiperId: s.swiper_id },
          });

          toast.custom(
            (t) => (
              <AppleToast
                toastId={t}
                title={isSuper ? "Super Like ⭐" : "Novo like 👀"}
                body={`${revealName} mostrou interesse no teu perfil.`}
                avatar={avatar}
                appName="Hunie"
                timeLabel="agora"
                onClick={() => {
                  toast.dismiss(t);
                  navigate({ to: "/matches" });
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
      supabase.removeChannel(settingsCh);
      supabase.removeChannel(matchesCh);
      supabase.removeChannel(likesCh);
    };
  }, [user, navigate]);
}
