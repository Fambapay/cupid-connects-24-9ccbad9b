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

const profileCache = new Map<string, Profile>();

export function useProfile() {
  const { user } = useAuth();
  const cached = user ? profileCache.get(user.id) ?? null : null;
  const [profile, setProfile] = useState<Profile | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    if (!profileCache.has(user.id)) setLoading(true);
    const [{ data }, { data: phoneData }, { data: locData }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,name,age,city,country,bio,is_paused,is_incognito,is_verified,membership_tier,membership_status,membership_expires_at,onboarding_completed,onboarding_step,birthdate,gender,interested_in,interests")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.rpc("get_my_phone"),
      (supabase.rpc as any)("get_my_location"),
    ]);
    const loc = Array.isArray(locData) ? locData[0] : locData;
    const next = data
      ? ({
          ...(data as any),
          phone: (phoneData as unknown as string | null) ?? null,
          latitude: (loc as any)?.latitude ?? null,
          longitude: (loc as any)?.longitude ?? null,
        } as Profile)
      : null;
    if (next) profileCache.set(user.id, next);
    setProfile(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // Hydrate from cache immediately on mount, then refresh in background.
    if (user) {
      const c = profileCache.get(user.id);
      if (c) setProfile(c);
    }
    load();
  }, [load, user]);


  const updateProfile = async (patch: Partial<Profile>) => {
    if (!user) throw new Error("Not authenticated");
    const { phone, ...profilePatch } = patch;

    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", user.id);
      if (error) throw error;
    }

    if (phone !== undefined) {
      const { error } = await supabase
        .from("profile_contact")
        .upsert({ profile_id: user.id, phone });
      if (error) throw error;
    }

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
