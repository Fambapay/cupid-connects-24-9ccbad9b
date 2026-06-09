
-- First Impression: own credit category, Elite-only, 10/month fixed (not purchasable).
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS first_impression_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_fi_refill_month date;

-- Consume 1 FI credit (regardless of match outcome).
CREATE OR REPLACE FUNCTION public.consume_first_impression_credit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  INSERT INTO public.user_credits(user_id) VALUES (v_uid) ON CONFLICT DO NOTHING;

  UPDATE public.user_credits
     SET first_impression_balance = first_impression_balance - 1,
         updated_at = now()
   WHERE user_id = v_uid AND first_impression_balance > 0
   RETURNING first_impression_balance INTO v_bal;

  IF v_bal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining_balance', v_bal);
END $$;

-- Monthly First Impression refill for Elite (10/month, fixed reset, not accumulative).
CREATE OR REPLACE FUNCTION public.refill_membership_credits(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier text;
  v_status text;
  v_expires timestamptz;
  v_active boolean;
  v_daily_super int := 0;
  v_daily_boost int := 0;
  v_weekly_boost int := 0;
  v_monthly_fi int := 0;
  v_today date := (now() at time zone 'UTC')::date;
  v_month_start date := date_trunc('month', (now() at time zone 'UTC'))::date;
  v_super_refilled boolean := false;
  v_boost_refilled boolean := false;
  v_fi_refilled boolean := false;
  v_last_super date;
  v_last_boost date;
  v_last_fi_month date;
  v_bal_after int;
  v_delta int;
  v_bal_before int;
  v_add int;
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
    WHEN 'elite'  THEN v_daily_super := 10; v_daily_boost := 1; v_monthly_fi := 10;
    ELSE NULL;
  END CASE;

  INSERT INTO public.user_credits(user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;

  SELECT last_super_refill_date, last_boost_refill_date, last_fi_refill_month, boost_balance
    INTO v_last_super, v_last_boost, v_last_fi_month, v_bal_before
  FROM public.user_credits WHERE user_id = _user_id;

  IF v_daily_super > 0 AND (v_last_super IS NULL OR v_last_super < v_today) THEN
    UPDATE public.user_credits
       SET super_like_balance = GREATEST(super_like_balance, v_daily_super),
           last_super_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id;
    v_super_refilled := true;
  END IF;

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

  IF v_weekly_boost > 0 AND (v_last_boost IS NULL OR v_last_boost <= v_today - 7) THEN
    v_add := LEAST(v_weekly_boost, GREATEST(0, 4 - COALESCE(v_bal_before, 0)));
    UPDATE public.user_credits
       SET boost_balance = boost_balance + v_add,
           last_boost_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id
     RETURNING boost_balance INTO v_bal_after;
    v_delta := COALESCE(v_bal_after, 0) - COALESCE(v_bal_before, 0);
    INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
      VALUES (_user_id, 'refill_weekly', v_tier, v_delta, v_bal_after,
              jsonb_build_object('expected', v_weekly_boost, 'before', v_bal_before,
                                 'cap_applies_to', 'refill_only', 'cap', 4, 'added', v_add));
    v_boost_refilled := true;
  END IF;

  -- First Impression: monthly hard reset to v_monthly_fi (no accumulation; not purchasable).
  IF v_monthly_fi > 0 AND (v_last_fi_month IS NULL OR v_last_fi_month < v_month_start) THEN
    UPDATE public.user_credits
       SET first_impression_balance = v_monthly_fi,
           last_fi_refill_month = v_month_start,
           updated_at = now()
     WHERE user_id = _user_id;
    v_fi_refilled := true;
  END IF;

  RETURN jsonb_build_object(
    'refilled', v_super_refilled OR v_boost_refilled OR v_fi_refilled,
    'tier', v_tier,
    'super_refilled', v_super_refilled,
    'boost_refilled', v_boost_refilled,
    'fi_refilled', v_fi_refilled
  );
END $function$;
