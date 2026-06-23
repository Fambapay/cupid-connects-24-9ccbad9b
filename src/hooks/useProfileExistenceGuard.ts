import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { invalidateOnboardingCache } from "@/lib/authGuard";

/**
 * While logged in, watch our own profile row. If it's deleted (admin wipe,
 * account removal, etc.) sign the user out and send them to /auth/login so
 * they don't get stuck on a screen referencing a profile that no longer exists.
 */
export function useProfileExistenceGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let currentUserId: string | null = null;

    let cleanupFocus: (() => void) | null = null;

    async function kick() {
      if (cancelled) return;
      invalidateOnboardingCache();
      try {
        await supabase.auth.signOut();
      } catch {
        /* noop */
      }
      navigate({ to: "/auth/login" });
    }

    async function verifyExists(userId: string) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && !data) {
        void kick();
      }
    }

    function teardown() {
      if (channel) {
        void supabase.removeChannel(channel);
        channel = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (cleanupFocus) {
        cleanupFocus();
        cleanupFocus = null;
      }
      currentUserId = null;
    }

    function setup(userId: string) {
      if (currentUserId === userId) return;
      teardown();
      currentUserId = userId;

      channel = supabase
        .channel(`profile-self-${userId}`)
        .on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
          () => void kick(),
        )
        .subscribe();

      // Belt-and-suspenders: re-check on tab focus and every 60s in case
      // realtime is unavailable.
      const onFocus = () => void verifyExists(userId);
      window.addEventListener("focus", onFocus);
      cleanupFocus = () => window.removeEventListener("focus", onFocus);
      pollTimer = setInterval(() => void verifyExists(userId), 60_000);

      void verifyExists(userId);
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) setup(data.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) setup(session.user.id);
      else teardown();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      teardown();
    };
  }, [navigate]);
}
