CREATE OR REPLACE FUNCTION public.insert_swipe(
  _target_id uuid,
  _direction text,
  _first_impression_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_status text;
  v_expires timestamptz;
  v_active boolean;
  v_daily_limit int;
  v_today_likes int;
  v_super_bal int;
  v_fi_bal int;
  v_fi_msg text;
  v_existing record;
  v_match_id uuid;
  v_a uuid;
  v_b uuid;
  v_remaining_super int;
  v_remaining_fi int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF v_uid = _target_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'self_swipe');
  END IF;

  IF _direction NOT IN ('like', 'pass', 'super') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_direction');
  END IF;

  v_fi_msg := NULLIF(trim(COALESCE(_first_impression_message, '')), '');
  IF v_fi_msg IS NOT NULL THEN
    v_fi_msg := left(v_fi_msg, 280);
    IF _direction <> 'super' THEN
      _direction := 'super';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.blocked_users
    WHERE (blocker_id = v_uid AND blocked_id = _target_id)
       OR (blocker_id = _target_id AND blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'blocked');
  END IF;

  SELECT id, direction INTO v_existing
  FROM public.swipes
  WHERE swiper_id = v_uid AND swiped_id = _target_id;

  IF v_existing.id IS NOT NULL THEN
    v_a := LEAST(v_uid, _target_id);
    v_b := GREATEST(v_uid, _target_id);
    SELECT id INTO v_match_id FROM public.matches WHERE user_a = v_a AND user_b = v_b;
    RETURN jsonb_build_object(
      'success', true,
      'already_swiped', true,
      'direction', v_existing.direction,
      'matched', v_match_id IS NOT NULL,
      'match_id', v_match_id
    );
  END IF;

  SELECT membership_tier, membership_status, membership_expires_at
  INTO v_tier, v_status, v_expires
  FROM public.profiles
  WHERE id = v_uid;

  v_active := v_status = 'active'
              AND (v_expires IS NULL OR v_expires > now())
              AND v_tier IN ('select','plus','elite');
  v_daily_limit := CASE WHEN v_active THEN -1 ELSE 5 END;

  IF _direction IN ('like','super') AND v_daily_limit >= 0 THEN
    SELECT COUNT(*) INTO v_today_likes
    FROM public.swipes
    WHERE swiper_id = v_uid
      AND direction IN ('like','super')
      AND created_at >= (date_trunc('day', now() at time zone 'UTC') at time zone 'UTC');

    IF v_today_likes >= v_daily_limit THEN
      RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
    END IF;
  END IF;

  IF v_fi_msg IS NOT NULL THEN
    SELECT first_impression_balance INTO v_fi_bal
    FROM public.user_credits
    WHERE user_id = v_uid;

    IF COALESCE(v_fi_bal, 0) <= 0 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'insufficient_first_impression');
    END IF;
  ELSIF _direction = 'super' THEN
    SELECT super_like_balance INTO v_super_bal
    FROM public.user_credits
    WHERE user_id = v_uid;

    IF COALESCE(v_super_bal, 0) <= 0 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'insufficient_super_like');
    END IF;
  END IF;

  INSERT INTO public.swipes(swiper_id, swiped_id, direction, first_impression_message)
  VALUES (v_uid, _target_id, _direction::public.swipe_direction, v_fi_msg);

  IF v_fi_msg IS NOT NULL THEN
    UPDATE public.user_credits
    SET first_impression_balance = first_impression_balance - 1,
        updated_at = now()
    WHERE user_id = v_uid AND first_impression_balance > 0
    RETURNING first_impression_balance INTO v_remaining_fi;
  ELSIF _direction = 'super' THEN
    UPDATE public.user_credits
    SET super_like_balance = super_like_balance - 1,
        updated_at = now()
    WHERE user_id = v_uid AND super_like_balance > 0
    RETURNING super_like_balance INTO v_remaining_super;
  END IF;

  v_a := LEAST(v_uid, _target_id);
  v_b := GREATEST(v_uid, _target_id);
  SELECT id INTO v_match_id FROM public.matches WHERE user_a = v_a AND user_b = v_b;

  RETURN jsonb_build_object(
    'success', true,
    'matched', v_match_id IS NOT NULL,
    'match_id', v_match_id,
    'remaining_super_likes', v_remaining_super,
    'remaining_first_impressions', v_remaining_fi
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.insert_swipe(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_swipe(uuid, text, text) TO authenticated;