
-- 1) Revoke EXECUTE on internal SECURITY DEFINER helpers from end users.
-- These are called by triggers/policies/server code only.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.is_admin(uuid)',
    'public.is_match_member(uuid, uuid)',
    'public.dispatch_notification(text, jsonb)',
    'public.notify_on_like()',
    'public.notify_on_match()',
    'public.notify_on_message()',
    'public.auto_resolve_seed_reports()',
    'public.check_seeds_auto_disable()',
    'public.create_match_on_reciprocal_like()',
    'public.bump_match_activity()',
    'public.touch_updated_at()',
    'public.handle_new_user()',
    'public.create_notification_prefs()',
    'public.grant_credits(uuid, text, integer)',
    'public.credit_pack_debito(uuid, text, integer, integer, text, text, text)',
    'public.activate_membership_debito(uuid, text, integer)',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.get_my_phone()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- 2) Tighten boosts SELECT — only boosts of profiles the user can actually see.
DROP POLICY IF EXISTS boosts_select_active_for_discovery ON public.boosts;

CREATE POLICY boosts_select_visible_profiles ON public.boosts
FOR SELECT TO authenticated
USING (
  expires_at > now()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = boosts.profile_id
      AND p.onboarding_completed = true
      AND p.is_paused = false
      AND (p.is_seed = false OR p.seed_active = true)
      AND p.id <> auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
           OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
      )
  )
);

-- 3) Realtime channel policies for matches and user_credits.
-- Allow subscriptions only when the subscriber is the rightful owner.
CREATE POLICY realtime_matches_member ON realtime.messages
FOR SELECT TO authenticated
USING (
  extension = 'postgres_changes'
  AND topic ~~ 'realtime:public:matches:%'
  AND (
    -- topic format: realtime:public:matches:id=eq.<uuid>  (one match)
    -- or:           realtime:public:matches:user_a=eq.<uuid>  /  user_b=eq.<uuid>
    (topic ~~ 'realtime:public:matches:id=eq.%'
      AND public.is_match_member(
        (substring(topic, 'id=eq\.([0-9a-fA-F-]{36})'))::uuid,
        auth.uid()
      ))
    OR (topic ~~ 'realtime:public:matches:user_a=eq.%'
      AND (substring(topic, 'user_a=eq\.([0-9a-fA-F-]{36})'))::uuid = auth.uid())
    OR (topic ~~ 'realtime:public:matches:user_b=eq.%'
      AND (substring(topic, 'user_b=eq\.([0-9a-fA-F-]{36})'))::uuid = auth.uid())
  )
);

CREATE POLICY realtime_user_credits_owner ON realtime.messages
FOR SELECT TO authenticated
USING (
  extension = 'postgres_changes'
  AND topic ~~ 'realtime:public:user_credits:user_id=eq.%'
  AND (substring(topic, 'user_id=eq\.([0-9a-fA-F-]{36})'))::uuid = auth.uid()
);
