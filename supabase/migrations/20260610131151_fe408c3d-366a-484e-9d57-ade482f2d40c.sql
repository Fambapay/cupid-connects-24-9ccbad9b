
-- 1) Remove boosts and debito_payments from realtime publication (if present)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='boosts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.boosts';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='debito_payments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.debito_payments';
  END IF;
END $$;

-- 2) Add restrictive UPDATE policy on verification-selfies (deny by default)
DROP POLICY IF EXISTS "verification_selfies_no_update" ON storage.objects;
CREATE POLICY "verification_selfies_no_update"
ON storage.objects
FOR UPDATE
TO authenticated, anon
USING (bucket_id <> 'verification-selfies')
WITH CHECK (bucket_id <> 'verification-selfies');

-- 3) Replace admin_emails select policy: use is_admin(auth.uid()) not JWT email
DROP POLICY IF EXISTS admin_emails_select_self ON public.admin_emails;
CREATE POLICY admin_emails_select_admin
ON public.admin_emails
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4) Revoke EXECUTE from public/anon/authenticated on internal SECURITY DEFINER functions
-- Trigger functions and internal helpers — must not be callable as RPC
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_profile_relations() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_match_on_reciprocal_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_match_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_like() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_match() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_notification_prefs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_resolve_seed_reports() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_seeds_auto_disable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispatch_notification(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refill_membership_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refill_all_active_memberships() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_pack_debito(uuid, text, integer, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_membership_debito(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_credits(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- Admin-only function: only callable by service_role; is_admin check inside but no need to expose
REVOKE ALL ON FUNCTION public.boost_entitlement_discrepancies(integer) FROM PUBLIC, anon;

-- is_admin and get_my_phone are stable helpers used by policies; keep callable by authenticated
-- (they self-scope, but revoke from anon)
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_phone() FROM PUBLIC, anon;

-- is_match_member used in RLS policies; revoke from anon
REVOKE ALL ON FUNCTION public.is_match_member(uuid, uuid) FROM PUBLIC, anon;

-- User-facing RPCs: keep EXECUTE for authenticated, revoke from anon
REVOKE ALL ON FUNCTION public.refill_my_credits() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_super_like_credit() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_boost_credit() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_first_impression_credit() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rewind_last_swipe() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.touch_last_active() FROM PUBLIC, anon;
