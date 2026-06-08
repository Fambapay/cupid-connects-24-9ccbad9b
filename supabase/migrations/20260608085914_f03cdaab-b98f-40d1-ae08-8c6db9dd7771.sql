GRANT EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM PUBLIC;