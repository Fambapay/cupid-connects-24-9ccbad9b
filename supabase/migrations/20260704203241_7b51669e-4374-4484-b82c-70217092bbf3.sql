
REVOKE EXECUTE ON FUNCTION public.get_my_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_initiate_conversation(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.use_tier_boost() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.use_pack_boost() FROM PUBLIC, anon;
