GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_photos TO authenticated;
GRANT SELECT ON public.profile_photos TO anon;
GRANT ALL ON public.profile_photos TO service_role;