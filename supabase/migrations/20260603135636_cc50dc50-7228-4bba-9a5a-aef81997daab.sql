-- 1) Phone exposure fix: column-level SELECT revoke
REVOKE SELECT (phone) ON public.profiles FROM authenticated;
REVOKE SELECT (phone) ON public.profiles FROM anon;
REVOKE SELECT (phone) ON public.profiles FROM PUBLIC;

-- Re-grant SELECT on safe columns to authenticated
GRANT SELECT (
  id, name, age, city, country, bio,
  is_paused, is_incognito, is_verified,
  membership_tier, membership_status, membership_expires_at,
  onboarding_completed, onboarding_step,
  birthdate, gender, interested_in, interests,
  latitude, longitude,
  seed_active, is_seed, welcome_bonus_granted_at,
  last_active_at, created_at, updated_at
) ON public.profiles TO authenticated;

-- Service role retains full access
GRANT SELECT ON public.profiles TO service_role;

-- Function to read own phone
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

-- 2) Realtime: ensure REPLICA IDENTITY FULL so RLS is enforced on row payloads
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;