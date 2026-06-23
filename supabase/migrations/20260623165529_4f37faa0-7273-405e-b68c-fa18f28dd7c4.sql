-- 1) Revoke anon/public EXECUTE on SECURITY DEFINER fns that require auth.uid()
REVOKE EXECUTE ON FUNCTION public.get_discovery_feed(jsonb, double precision, double precision, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_match_summaries() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_chats_count() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_discovery_feed(jsonb, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_match_summaries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_chats_count() TO authenticated;

-- 2) Pin search_path on email queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;