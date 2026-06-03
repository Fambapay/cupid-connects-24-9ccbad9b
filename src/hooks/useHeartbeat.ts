import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Bump `profiles.last_active_at` for the current user every ~45s while the
 * tab is focused. Drives the "Ativa há X min" indicator everywhere.
 */
export function useHeartbeat() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const beat = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) return;
      await supabase.rpc("touch_last_active");
    };

    beat();
    const id = window.setInterval(beat, 45_000);
    const onVis = () => { if (!document.hidden) beat(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);
}
