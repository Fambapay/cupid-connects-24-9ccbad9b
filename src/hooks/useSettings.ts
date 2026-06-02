import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserSettings {
  user_id: string;
  distance_radius: number;
  age_min: number;
  age_max: number;
  notifications_enabled: boolean;
  min_photos: number;
  require_bio: boolean;
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setSettings(data as UserSettings | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updateSettings = async (patch: Partial<UserSettings>) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("user_settings")
      .update(patch)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) throw error;
    setSettings(data as UserSettings);
    return data;
  };

  return { settings, loading, updateSettings, reload: load };
}
