
-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.boost_audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('refill_daily','refill_weekly','consume','consume_failed','refill_skipped')),
  tier text,
  delta int NOT NULL DEFAULT 0,
  balance_after int,
  reason text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boost_audit_log TO authenticated;
GRANT ALL ON public.boost_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.boost_audit_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.boost_audit_log_id_seq TO service_role;

ALTER TABLE public.boost_audit_log ENABLE ROW LEVEL SECURITY;

-- Users see only their own rows; admins see everything.
CREATE POLICY "boost_audit_self_read"
  ON public.boost_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS boost_audit_user_created_idx
  ON public.boost_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS boost_audit_event_created_idx
  ON public.boost_audit_log (event, created_at DESC);

-- 2) Instrumented consume_boost_credit
CREATE OR REPLACE FUNCTION public.consume_boost_credit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_bal int;
  v_exp timestamptz;
  v_tier text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  SELECT membership_tier INTO v_tier FROM public.profiles WHERE id = v_uid;

  IF EXISTS (SELECT 1 FROM public.boosts WHERE profile_id = v_uid AND expires_at > now()) THEN
    SELECT expires_at INTO v_exp FROM public.boosts
      WHERE profile_id = v_uid AND expires_at > now()
      ORDER BY expires_at DESC LIMIT 1;
    INSERT INTO public.boost_audit_log(user_id, event, tier, delta, reason)
      VALUES (v_uid, 'consume_failed', v_tier, 0, 'already_active');
    RETURN jsonb_build_object('success', false, 'reason', 'already_active', 'expires_at', v_exp);
  END IF;

  UPDATE public.user_credits
     SET boost_balance = boost_balance - 1
   WHERE user_id = v_uid AND boost_balance > 0
   RETURNING boost_balance INTO v_bal;

  IF v_bal IS NULL THEN
    INSERT INTO public.boost_audit_log(user_id, event, tier, delta, reason)
      VALUES (v_uid, 'consume_failed', v_tier, 0, 'insufficient_credits');
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;

  v_exp := now() + interval '30 minutes';
  INSERT INTO public.boosts(profile_id, expires_at) VALUES (v_uid, v_exp);

  INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
    VALUES (v_uid, 'consume', v_tier, -1, v_bal,
            jsonb_build_object('expires_at', v_exp));

  RETURN jsonb_build_object('success', true, 'expires_at', v_exp, 'remaining_balance', v_bal);
END $function$;

-- 3) Instrumented refill_membership_credits — only the boost branches log;
--    super-like branch keeps its existing behavior.
CREATE OR REPLACE FUNCTION public.refill_membership_credits(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_tier text;
  v_status text;
  v_expires timestamptz;
  v_active boolean;
  v_daily_super int := 0;
  v_daily_boost int := 0;
  v_weekly_boost int := 0;
  v_today date := (now() at time zone 'UTC')::date;
  v_super_refilled boolean := false;
  v_boost_refilled boolean := false;
  v_last_super date;
  v_last_boost date;
  v_bal_after int;
  v_delta int;
  v_bal_before int;
BEGIN
  IF auth.uid() IS DISTINCT FROM _user_id AND auth.role() <> 'service_role' THEN
    RETURN jsonb_build_object('refilled', false, 'reason', 'forbidden');
  END IF;

  SELECT membership_tier, membership_status, membership_expires_at
    INTO v_tier, v_status, v_expires
  FROM public.profiles WHERE id = _user_id;

  v_active := v_status = 'active'
              AND (v_expires IS NULL OR v_expires > now())
              AND v_tier IS NOT NULL
              AND v_tier <> 'free';

  IF NOT v_active THEN
    RETURN jsonb_build_object('refilled', false, 'reason', 'not_active_member');
  END IF;

  CASE v_tier
    WHEN 'select' THEN v_daily_super := 1;
    WHEN 'plus'   THEN v_daily_super := 5; v_weekly_boost := 1;
    WHEN 'elite'  THEN v_daily_super := 10; v_daily_boost := 1;
    ELSE NULL;
  END CASE;

  INSERT INTO public.user_credits(user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;

  SELECT last_super_refill_date, last_boost_refill_date, boost_balance
    INTO v_last_super, v_last_boost, v_bal_before
  FROM public.user_credits WHERE user_id = _user_id;

  -- Daily super-like refill (unchanged behavior)
  IF v_daily_super > 0 AND (v_last_super IS NULL OR v_last_super < v_today) THEN
    UPDATE public.user_credits
       SET super_like_balance = GREATEST(super_like_balance, v_daily_super),
           last_super_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id;
    v_super_refilled := true;
  END IF;

  -- Daily boost (Elite)
  IF v_daily_boost > 0 AND (v_last_boost IS NULL OR v_last_boost < v_today) THEN
    UPDATE public.user_credits
       SET boost_balance = GREATEST(boost_balance, v_daily_boost),
           last_boost_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id
     RETURNING boost_balance INTO v_bal_after;
    v_delta := COALESCE(v_bal_after, 0) - COALESCE(v_bal_before, 0);
    INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
      VALUES (_user_id, 'refill_daily', v_tier, v_delta, v_bal_after,
              jsonb_build_object('expected', v_daily_boost, 'before', v_bal_before));
    v_boost_refilled := true;
    v_bal_before := v_bal_after;
  END IF;

  -- Weekly boost (Plus)
  IF v_weekly_boost > 0 AND (v_last_boost IS NULL OR v_last_boost <= v_today - 7) THEN
    UPDATE public.user_credits
       SET boost_balance = LEAST(boost_balance + v_weekly_boost, 4),
           last_boost_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id
     RETURNING boost_balance INTO v_bal_after;
    v_delta := COALESCE(v_bal_after, 0) - COALESCE(v_bal_before, 0);
    INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
      VALUES (_user_id, 'refill_weekly', v_tier, v_delta, v_bal_after,
              jsonb_build_object('expected', v_weekly_boost, 'before', v_bal_before, 'capped_at', 4));
    v_boost_refilled := true;
  END IF;

  RETURN jsonb_build_object(
    'refilled', v_super_refilled OR v_boost_refilled,
    'tier', v_tier,
    'super_refilled', v_super_refilled,
    'boost_refilled', v_boost_refilled
  );
END $function$;

-- 4) Discrepancy detection — flags users whose boost activity diverges
--    from what their tier entitles. Admin-only via SECURITY DEFINER + check.
CREATE OR REPLACE FUNCTION public.boost_entitlement_discrepancies(_days int DEFAULT 7)
RETURNS TABLE (
  user_id uuid,
  tier text,
  expected_refills int,
  actual_refills int,
  consumes int,
  discrepancy int,
  kind text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH active AS (
    SELECT p.id, p.membership_tier
    FROM public.profiles p
    WHERE p.membership_status = 'active'
      AND p.membership_tier IN ('plus','elite')
      AND (p.membership_expires_at IS NULL OR p.membership_expires_at > now())
  ),
  agg AS (
    SELECT a.id AS uid,
           a.membership_tier AS t,
           CASE a.membership_tier
             WHEN 'elite' THEN _days
             WHEN 'plus'  THEN GREATEST(1, _days / 7)
             ELSE 0
           END AS expected,
           COALESCE((
             SELECT COUNT(*) FROM public.boost_audit_log l
             WHERE l.user_id = a.id
               AND l.event IN ('refill_daily','refill_weekly')
               AND l.created_at >= now() - (_days || ' days')::interval
               AND l.delta > 0
           ), 0)::int AS actual,
           COALESCE((
             SELECT COUNT(*) FROM public.boost_audit_log l
             WHERE l.user_id = a.id
               AND l.event = 'consume'
               AND l.created_at >= now() - (_days || ' days')::interval
           ), 0)::int AS used
    FROM active a
  )
  SELECT uid, t, expected, actual, used,
         (expected - actual) AS discrepancy,
         CASE
           WHEN actual < expected THEN 'under_refilled'
           WHEN actual > expected THEN 'over_refilled'
           ELSE 'ok'
         END AS kind
  FROM agg
  WHERE expected <> actual
  ORDER BY (expected - actual) DESC;
END $function$;

GRANT EXECUTE ON FUNCTION public.boost_entitlement_discrepancies(int) TO authenticated;
