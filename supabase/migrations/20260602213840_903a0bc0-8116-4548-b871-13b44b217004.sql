CREATE OR REPLACE FUNCTION public.is_match_member(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = _match_id AND (user_a = _user_id OR user_b = _user_id)
  )
$function$;

GRANT EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_match_member(uuid, uuid) FROM PUBLIC;