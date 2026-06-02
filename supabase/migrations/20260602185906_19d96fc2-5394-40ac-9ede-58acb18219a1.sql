
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_match_on_reciprocal_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_match_activity() FROM PUBLIC, anon, authenticated;
