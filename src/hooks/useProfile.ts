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
  membership_status?: string;
  membership_expires_at?: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  birthdate: string | null;
  gender: string | null;
  interested_in: string[];
  interests: string[];
  latitude: number | null;
  longitude: number | null;
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
    const [{ data }, { data: phoneData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,age,city,country,bio,is_paused,is_incognito,is_verified,membership_tier,membership_status,membership_expires_at,onboarding_completed,onboarding_step,birthdate,gender,interested_in,interests,latitude,longitude")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_my_phone"),
    ]);
    setProfile(
      data
        ? ({ ...(data as any), phone: (phoneData as unknown as string | null) ?? null } as Profile)
        : null
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id);
    if (error) throw error;
    await load();
    return patch as Profile;
  };

  const deleteAccount = async () => {
    if (!user) throw new Error("Not authenticated");
    const { deleteMyAccount } = await import("@/lib/account.functions");
    await deleteMyAccount();
    await supabase.auth.signOut();
  };

  return { profile, loading, updateProfile, deleteAccount, reload: load };
}
