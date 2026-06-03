-- 1) Set search_path on email queue functions (and re-grant correctly)
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2) Revoke EXECUTE from PUBLIC/anon/authenticated on internal-only functions
-- Trigger-only functions (run as table owner via trigger fire)
REVOKE EXECUTE ON FUNCTION public.auto_resolve_seed_reports()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_match_activity()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_seeds_auto_disable()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_match_on_reciprocal_like()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification_prefs()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_like()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_match()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_message()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_notification(text, jsonb)  FROM PUBLIC, anon, authenticated;

-- Service-role-only business functions (webhooks/admin)
REVOKE EXECUTE ON FUNCTION public.activate_membership_debito(uuid, text, integer)                              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_pack_debito(uuid, text, integer, integer, text, text, text)           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_credits(uuid, text, integer)                                           FROM PUBLIC, anon, authenticated;

-- Email queue functions: only service role
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint)                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)        FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.enqueue_email(text, jsonb)                    TO service_role;
GRANT  EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer)      TO service_role;
GRANT  EXECUTE ON FUNCTION public.delete_email(text, bigint)                    TO service_role;
GRANT  EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb)        TO service_role;

-- 3) User-callable functions: revoke from PUBLIC/anon, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.consume_boost_credit()      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_super_like_credit() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rewind_last_swipe()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_last_active()         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.consume_boost_credit()      TO authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_super_like_credit() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.rewind_last_swipe()         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.touch_last_active()         TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid)              TO authenticated;