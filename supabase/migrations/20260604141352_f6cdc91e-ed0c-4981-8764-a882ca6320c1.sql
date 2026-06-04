
-- 1) Track refill timestamps on user_credits
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS last_super_refill_date date,
  ADD COLUMN IF NOT EXISTS last_boost_refill_date date;

-- 2) Lazy refill function: tops up daily super likes and grants daily/weekly boosts
--    based on membership tier. Only the user themselves (or service_role) can trigger.
CREATE OR REPLACE FUNCTION public.refill_membership_credits(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
  -- Auth check: caller must be the user or service_role
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

  -- Tier entitlements
  CASE v_tier
    WHEN 'select' THEN v_daily_super := 1;
    WHEN 'plus'   THEN v_daily_super := 5; v_weekly_boost := 1;
    WHEN 'elite'  THEN v_daily_super := 10; v_daily_boost := 1;
    ELSE NULL;
  END CASE;

  -- Ensure row exists
  INSERT INTO public.user_credits(user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;

  SELECT last_super_refill_date, last_boost_refill_date
    INTO v_last_super, v_last_boost
  FROM public.user_credits WHERE user_id = _user_id;

  -- Daily super-like refill: top up balance to AT LEAST daily amount
  -- (stockpiled purchased credits are preserved via GREATEST).
  IF v_daily_super > 0 AND (v_last_super IS NULL OR v_last_super < v_today) THEN
    UPDATE public.user_credits
       SET super_like_balance = GREATEST(super_like_balance, v_daily_super),
           last_super_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id;
    v_super_refilled := true;
  END IF;

  -- Daily boost (Elite): top up to at least 1/day
  IF v_daily_boost > 0 AND (v_last_boost IS NULL OR v_last_boost < v_today) THEN
    UPDATE public.user_credits
       SET boost_balance = GREATEST(boost_balance, v_daily_boost),
           last_boost_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id;
    v_boost_refilled := true;
  END IF;

  -- Weekly boost (Plus): grant 1 every 7 days (additive, capped at 4 to avoid hoarding)
  IF v_weekly_boost > 0 AND (v_last_boost IS NULL OR v_last_boost <= v_today - 7) THEN
    UPDATE public.user_credits
       SET boost_balance = LEAST(boost_balance + v_weekly_boost, 4),
           last_boost_refill_date = v_today,
           updated_at = now()
     WHERE user_id = _user_id;
    v_boost_refilled := true;
  END IF;

  RETURN jsonb_build_object(
    'refilled', v_super_refilled OR v_boost_refilled,
    'tier', v_tier,
    'super_refilled', v_super_refilled,
    'boost_refilled', v_boost_refilled
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.refill_membership_credits(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refill_membership_credits(uuid) TO service_role;

-- 3) Client-callable wrapper for the current user (called on app load by useCredits)
CREATE OR REPLACE FUNCTION public.refill_my_credits()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('refilled', false, 'reason', 'not_authenticated');
  END IF;
  RETURN public.refill_membership_credits(v_uid);
END $$;

GRANT EXECUTE ON FUNCTION public.refill_my_credits() TO authenticated;

-- 4) Bulk refill (used by daily pg_cron)
CREATE OR REPLACE FUNCTION public.refill_all_active_memberships()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0; r record;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
    WHERE membership_status = 'active'
      AND membership_tier IN ('select','plus','elite')
      AND (membership_expires_at IS NULL OR membership_expires_at > now())
  LOOP
    PERFORM public.refill_membership_credits(r.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

REVOKE EXECUTE ON FUNCTION public.refill_all_active_memberships() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refill_all_active_memberships() TO service_role;

-- 5) Update activate_membership_debito:
--    - grant a fresh Select boost on EVERY Select activation (not just first ever)
--    - immediately refill tier-appropriate daily/weekly credits on activation
CREATE OR REPLACE FUNCTION public.activate_membership_debito(_user_id uuid, _plan_tier text, _days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_expiry timestamptz;
  v_grant_welcome boolean := false;
  v_grant_select_boost boolean := false;
BEGIN
  IF _days <= 0 THEN RAISE EXCEPTION 'Invalid days'; END IF;

  UPDATE public.profiles SET
    membership_status = 'active',
    membership_tier = _plan_tier,
    membership_expires_at = GREATEST(COALESCE(membership_expires_at, now()), now())
                            + (_days || ' days')::interval,
    is_verified = true,
    updated_at = now()
  WHERE id = _user_id
  RETURNING membership_expires_at INTO v_new_expiry;

  IF v_new_expiry IS NULL THEN
    RETURN jsonb_build_object('activated', false, 'reason', 'profile_not_found');
  END IF;

  INSERT INTO public.user_credits(user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;

  -- One-time welcome boost (only first ever activation/pack purchase)
  SELECT welcome_bonus_granted_at IS NULL INTO v_grant_welcome
  FROM public.profiles WHERE id = _user_id;

  IF v_grant_welcome THEN
    UPDATE public.user_credits SET boost_balance = boost_balance + 1, updated_at = now()
    WHERE user_id = _user_id;
    UPDATE public.profiles SET welcome_bonus_granted_at = now() WHERE id = _user_id;
  END IF;

  -- "1 Boost grátis na ativação" for Select — granted on EVERY Select activation/renewal
  -- (skipped if we already granted the welcome boost above to avoid double-grant on first ever)
  IF _plan_tier = 'select' AND NOT v_grant_welcome THEN
    UPDATE public.user_credits SET boost_balance = boost_balance + 1, updated_at = now()
    WHERE user_id = _user_id;
    v_grant_select_boost := true;
  END IF;

  -- Refill tier-appropriate daily/weekly credits immediately
  PERFORM public.refill_membership_credits(_user_id);

  RETURN jsonb_build_object(
    'activated', true,
    'expires_at', v_new_expiry,
    'welcome_bonus', v_grant_welcome,
    'select_renewal_boost', v_grant_select_boost
  );
END $$;
