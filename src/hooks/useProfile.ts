import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Profile {
  id: string;
  name: string | null;
  age: number | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  phone: string | null;
  is_paused: boolean;
  is_incognito: boolean;
  is_verified: boolean;
  membership_tier: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  birthdate: string | null;
  gender: string | null;
  interested_in: string[];
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) throw new Error("Not authenticated");
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data as Profile);
    return data;
  };

  const deleteAccount = async () => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase.from("profiles").delete().eq("id", user.id);
    if (error) throw error;
    await supabase.auth.signOut();
  };

  return { profile, loading, updateProfile, deleteAccount, reload: load };
}
