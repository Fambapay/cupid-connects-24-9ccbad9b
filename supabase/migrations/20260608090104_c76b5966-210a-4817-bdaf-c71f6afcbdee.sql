REVOKE EXECUTE ON FUNCTION public.refill_my_credits() FROM anon;
REVOKE EXECUTE ON FUNCTION public.refill_my_credits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refill_my_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refill_my_credits() TO service_role;