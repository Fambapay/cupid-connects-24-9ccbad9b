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
  v_today date := (now() at time zone 'UTC')::date;
  v_super_refilled boolean := false;
  v_boost_refilled boolean := false;
  v_last_super date;
  v_last_boost date;
  v_bal_after int;
  v_delta int;
  v_bal_before int;
  v_super_cap int := 30;
  v_boost_daily_cap int := 7;
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

  -- Daily super-like: ACUMULA. Se faltou N dias, soma N * daily (cap em v_super_cap).
  IF v_daily_super > 0 AND (v_last_super IS NULL OR v_last_super < v_today) THEN
    DECLARE
      v_days_missed int := LEAST(
        v_super_cap,
        CASE
          WHEN v_last_super IS NULL THEN 1
          ELSE GREATEST(1, (v_today - v_last_super))
        END
      );
    BEGIN
      UPDATE public.user_credits
         SET super_like_balance = LEAST(super_like_balance + (v_daily_super * v_days_missed), v_super_cap),
             last_super_refill_date = v_today,
             updated_at = now()
       WHERE user_id = _user_id;
      v_super_refilled := true;
    END;
  END IF;

  -- Daily boost (Elite): ACUMULA até v_boost_daily_cap.
  IF v_daily_boost > 0 AND (v_last_boost IS NULL OR v_last_boost < v_today) THEN
    DECLARE
      v_days_missed int := LEAST(
        v_boost_daily_cap,
        CASE
          WHEN v_last_boost IS NULL THEN 1
          ELSE GREATEST(1, (v_today - v_last_boost))
        END
      );
    BEGIN
      UPDATE public.user_credits
         SET boost_balance = LEAST(boost_balance + (v_daily_boost * v_days_missed), v_boost_daily_cap),
             last_boost_refill_date = v_today,
             updated_at = now()
       WHERE user_id = _user_id
       RETURNING boost_balance INTO v_bal_after;
      v_delta := COALESCE(v_bal_after, 0) - COALESCE(v_bal_before, 0);
      INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
        VALUES (_user_id, 'refill_daily', v_tier, v_delta, v_bal_after,
                jsonb_build_object('expected', v_daily_boost, 'days_missed', v_days_missed,
                                   'before', v_bal_before, 'capped_at', v_boost_daily_cap));
      v_boost_refilled := true;
      v_bal_before := v_bal_after;
    END;
  END IF;

  -- Weekly boost (Plus): mantém comportamento aditivo com cap 4.
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