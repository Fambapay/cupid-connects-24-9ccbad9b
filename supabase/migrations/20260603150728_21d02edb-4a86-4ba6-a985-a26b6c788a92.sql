CREATE TABLE IF NOT EXISTS public.profile_contact (
  profile_id uuid PRIMARY KEY,
  phone text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contact TO authenticated;
GRANT ALL ON public.profile_contact TO service_role;

ALTER TABLE public.profile_contact ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_contact_select_own ON public.profile_contact;
DROP POLICY IF EXISTS profile_contact_insert_own ON public.profile_contact;
DROP POLICY IF EXISTS profile_contact_update_own ON public.profile_contact;
DROP POLICY IF EXISTS profile_contact_delete_own ON public.profile_contact;

CREATE POLICY profile_contact_select_own
ON public.profile_contact
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

CREATE POLICY profile_contact_insert_own
ON public.profile_contact
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_contact_update_own
ON public.profile_contact
FOR UPDATE
TO authenticated
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY profile_contact_delete_own
ON public.profile_contact
FOR DELETE
TO authenticated
USING (auth.uid() = profile_id);

DROP TRIGGER IF EXISTS touch_profile_contact_updated_at ON public.profile_contact;
CREATE TRIGGER touch_profile_contact_updated_at
BEFORE UPDATE ON public.profile_contact
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.profile_contact (profile_id, phone, updated_at)
SELECT id, phone, now()
FROM public.profiles
WHERE phone IS NOT NULL
ON CONFLICT (profile_id) DO UPDATE
SET phone = EXCLUDED.phone,
    updated_at = now();

CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profile_contact WHERE profile_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;