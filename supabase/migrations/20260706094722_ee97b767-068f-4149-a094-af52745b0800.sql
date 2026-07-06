
-- 1) Passport columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS passport_city text,
  ADD COLUMN IF NOT EXISTS passport_lat double precision,
  ADD COLUMN IF NOT EXISTS passport_lng double precision,
  ADD COLUMN IF NOT EXISTS passport_expires_at timestamptz;

-- 2) set_passport: Plus/Elite only, 24h TTL
CREATE OR REPLACE FUNCTION public.set_passport(
  _city text,
  _lat double precision,
  _lng double precision
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_status text;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  SELECT membership_tier, membership_status, membership_expires_at
    INTO v_tier, v_status, v_exp
  FROM profiles WHERE id = v_uid;

  IF v_tier NOT IN ('plus','elite')
     OR v_status NOT IN ('active','trialing','grace_period')
     OR (v_exp IS NOT NULL AND v_exp < now()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'tier_required');
  END IF;

  IF _lat IS NULL OR _lng IS NULL OR _city IS NULL OR trim(_city) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_input');
  END IF;

  UPDATE profiles
     SET passport_city = trim(_city),
         passport_lat = _lat,
         passport_lng = _lng,
         passport_expires_at = now() + interval '24 hours',
         updated_at = now()
   WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'city', trim(_city),
    'expires_at', (now() + interval '24 hours')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_passport()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  UPDATE profiles
     SET passport_city = NULL,
         passport_lat = NULL,
         passport_lng = NULL,
         passport_expires_at = NULL,
         updated_at = now()
   WHERE id = v_uid;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_passport(text, double precision, double precision) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.clear_passport() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_passport(text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_passport() TO authenticated;

-- 3) get_discovery_feed: prefer passport_lat/lng when passport is active
CREATE OR REPLACE FUNCTION public.get_discovery_feed(
  _filters jsonb DEFAULT '{}'::jsonb,
  _viewer_lat double precision DEFAULT NULL,
  _viewer_lng double precision DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result jsonb;
  v_pass_lat double precision;
  v_pass_lng double precision;
  v_pass_exp timestamptz;
  v_use_lat double precision := _viewer_lat;
  v_use_lng double precision := _viewer_lng;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('candidates', '[]'::jsonb, 'meta', jsonb_build_object('error','unauthenticated'));
  END IF;

  SELECT passport_lat, passport_lng, passport_expires_at
    INTO v_pass_lat, v_pass_lng, v_pass_exp
  FROM profiles WHERE id = v_uid;

  IF v_pass_lat IS NOT NULL AND v_pass_lng IS NOT NULL
     AND v_pass_exp IS NOT NULL AND v_pass_exp > now() THEN
    v_use_lat := v_pass_lat;
    v_use_lng := v_pass_lng;
  END IF;

  WITH liked_me AS (
    SELECT s.swiper_id AS id
    FROM swipes s
    WHERE s.swiped_id = v_uid AND s.direction IN ('right','super')
  ),
  swiped_by_me AS (
    SELECT swiped_id AS id FROM swipes
    WHERE swiper_id = v_uid AND created_at > now() - interval '30 days'
  ),
  matched_ids AS (
    SELECT CASE WHEN user_a_id = v_uid THEN user_b_id ELSE user_a_id END AS id
    FROM matches WHERE user_a_id = v_uid OR user_b_id = v_uid
  ),
  reported_ids AS (
    SELECT reported_id AS id FROM reports WHERE reporter_id = v_uid
    UNION SELECT reporter_id AS id FROM reports WHERE reported_id = v_uid
  ),
  blocked_ids AS (
    SELECT blocked_id AS id FROM blocked_users WHERE blocker_id = v_uid
    UNION SELECT blocker_id AS id FROM blocked_users WHERE blocked_id = v_uid
  ),
  candidates AS (
    SELECT p.id, p.name, p.age, p.city, p.bio, p.latitude, p.longitude,
           p.is_verified, p.gender, p.last_active_at, p.is_incognito,
           p.membership_tier, p.membership_status, p.membership_expires_at,
           p.height_cm, p.looking_for, p.pets, p.smoking, p.drinking, p.workout,
           p.interests, p.visibility_multiplier,
           CASE
             WHEN v_use_lat IS NOT NULL AND v_use_lng IS NOT NULL
                  AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
             THEN 111000 * sqrt(power(p.latitude - v_use_lat, 2) + power(p.longitude - v_use_lng, 2))
             ELSE NULL
           END AS distance_m
    FROM profiles p
    WHERE p.id <> v_uid
      AND COALESCE(p.onboarding_completed, false) = true
      AND COALESCE(p.is_paused, false) = false
      AND (NOT p.is_incognito OR p.id IN (SELECT id FROM liked_me))
      AND p.id NOT IN (SELECT id FROM swiped_by_me)
      AND p.id NOT IN (SELECT id FROM matched_ids)
      AND p.id NOT IN (SELECT id FROM reported_ids)
      AND p.id NOT IN (SELECT id FROM blocked_ids)
  )
  SELECT jsonb_build_object(
    'candidates', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', c.id, 'name', c.name, 'age', c.age, 'city', c.city, 'bio', c.bio,
        'latitude', c.latitude, 'longitude', c.longitude, 'distance_m', c.distance_m,
        'is_verified', c.is_verified, 'gender', c.gender, 'last_active_at', c.last_active_at,
        'membership_tier', CASE
          WHEN c.membership_status IN ('active','trialing','grace_period')
               AND (c.membership_expires_at IS NULL OR c.membership_expires_at > now())
          THEN c.membership_tier ELSE NULL END,
        'height_cm', c.height_cm, 'looking_for', c.looking_for,
        'pets', c.pets, 'smoking', c.smoking, 'drinking', c.drinking, 'workout', c.workout,
        'interests', c.interests
      )
      ORDER BY COALESCE(c.visibility_multiplier, 1.0) DESC,
               COALESCE(c.distance_m, 999999999) ASC,
               COALESCE(c.last_active_at, '1970-01-01'::timestamptz) DESC
    ), '[]'::jsonb),
    'meta', jsonb_build_object(
      'viewer_lat', v_use_lat, 'viewer_lng', v_use_lng,
      'passport_active', (v_pass_exp IS NOT NULL AND v_pass_exp > now())
    )
  ) INTO v_result
  FROM (SELECT * FROM candidates LIMIT _limit OFFSET _offset) c;

  RETURN v_result;
END;
$$;

-- 4) credit_pack_debito: accept 'first_impression' pack kind
CREATE OR REPLACE FUNCTION public.credit_pack_debito(
  _user_id uuid, _pack_kind text, _quantity integer,
  _amount_minor integer, _currency text,
  _source_id text, _debito_payment_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_key text := 'debito_' || _source_id;
  already boolean;
  v_grant_bonus boolean := false;
  v_tier text;
  v_bal_after int;
BEGIN
  IF _pack_kind NOT IN ('boost','super_like','first_impression') THEN
    RAISE EXCEPTION 'Invalid pack_kind';
  END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT EXISTS(SELECT 1 FROM credit_purchases WHERE stripe_session_id = v_session_key) INTO already;
  IF already THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_processed');
  END IF;

  INSERT INTO credit_purchases(user_id, pack_kind, quantity, amount_minor, currency,
                               stripe_session_id, stripe_payment_intent, status)
  VALUES (_user_id, _pack_kind, _quantity, _amount_minor, COALESCE(_currency,'MZN'),
          v_session_key, _debito_payment_id, 'paid');

  INSERT INTO user_credits(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  SELECT membership_tier INTO v_tier FROM profiles WHERE id = _user_id;

  IF _pack_kind = 'boost' THEN
    UPDATE user_credits SET boost_balance = boost_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id
    RETURNING boost_balance INTO v_bal_after;

    INSERT INTO boost_audit_log(user_id, event, tier, delta, balance_after, meta)
    VALUES (_user_id, 'purchase', v_tier, _quantity, v_bal_after,
            jsonb_build_object('source','debito','source_id',_source_id,
                               'debito_payment_id',_debito_payment_id,
                               'amount_minor',_amount_minor,
                               'currency',COALESCE(_currency,'MZN')));
  ELSIF _pack_kind = 'super_like' THEN
    UPDATE user_credits SET super_like_balance = super_like_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    UPDATE user_credits SET first_impression_balance = first_impression_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  -- welcome bonus best-effort (unchanged)
  BEGIN
    SELECT welcome_bonus_granted_at IS NULL INTO v_grant_bonus
    FROM profiles WHERE id = _user_id;
    IF v_grant_bonus THEN
      UPDATE user_credits SET boost_balance = boost_balance + 1, updated_at = now()
      WHERE user_id = _user_id
      RETURNING boost_balance INTO v_bal_after;
      UPDATE profiles SET welcome_bonus_granted_at = now() WHERE id = _user_id;
      INSERT INTO boost_audit_log(user_id, event, tier, delta, balance_after, meta)
      VALUES (_user_id, 'welcome_bonus', v_tier, 1, v_bal_after,
              jsonb_build_object('source','debito_first_purchase','source_id',_source_id));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'credit_pack_debito: welcome_bonus skipped for % (%): %', _user_id, _source_id, SQLERRM;
    v_grant_bonus := false;
  END;

  RETURN jsonb_build_object('credited', true, 'quantity', _quantity, 'welcome_bonus', v_grant_bonus);
END;
$$;

-- Also update grant_credits helper for admin/manual grants
CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _pack_kind text, _quantity integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_bal_after int; v_tier text;
BEGIN
  IF _pack_kind NOT IN ('boost','super_like','first_impression') THEN
    RAISE EXCEPTION 'invalid_pack_kind';
  END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'invalid_quantity'; END IF;

  INSERT INTO user_credits(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT membership_tier INTO v_tier FROM profiles WHERE id = _user_id;

  IF _pack_kind = 'boost' THEN
    UPDATE user_credits SET boost_balance = boost_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id RETURNING boost_balance INTO v_bal_after;
    INSERT INTO boost_audit_log(user_id, event, tier, delta, balance_after, meta)
    VALUES (_user_id, 'grant', v_tier, _quantity, v_bal_after,
            jsonb_build_object('source','grant_credits'));
  ELSIF _pack_kind = 'super_like' THEN
    UPDATE user_credits SET super_like_balance = super_like_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    UPDATE user_credits SET first_impression_balance = first_impression_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN jsonb_build_object('granted', true, 'quantity', _quantity);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_pack_debito(uuid, text, integer, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_credits(uuid, text, integer) FROM PUBLIC, anon, authenticated;
