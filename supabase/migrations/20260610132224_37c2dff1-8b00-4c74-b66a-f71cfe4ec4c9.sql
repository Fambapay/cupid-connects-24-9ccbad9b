
-- =========================================================================
-- 1. Location privacy: hide precise lat/lng from API consumers
-- =========================================================================

-- Revoke column-level read on lat/lng so the API can no longer return them.
-- Owners read their own location via get_my_location() below.
REVOKE SELECT (latitude, longitude) ON public.profiles FROM authenticated;
REVOKE SELECT (latitude, longitude) ON public.profiles FROM anon;

-- Own location accessor (SECURITY DEFINER so it bypasses the column revoke
-- above for the signed-in user, but only for their own row).
CREATE OR REPLACE FUNCTION public.get_my_location()
RETURNS TABLE(latitude double precision, longitude double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.latitude, p.longitude
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_location() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_location() TO authenticated;

-- Server-side distance computation for a batch of candidate profile ids.
-- Returns rounded km only; never exposes target coordinates.
CREATE OR REPLACE FUNCTION public.compute_distances_km(
  _viewer_lat double precision,
  _viewer_lng double precision,
  _ids uuid[]
)
RETURNS TABLE(id uuid, distance_km integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         CASE
           WHEN _viewer_lat IS NULL OR _viewer_lng IS NULL
                OR p.latitude IS NULL OR p.longitude IS NULL THEN 0
           ELSE round(
             2 * 6371 * asin(sqrt(
               sin(radians((p.latitude - _viewer_lat) / 2)) ^ 2
               + cos(radians(_viewer_lat)) * cos(radians(p.latitude))
               * sin(radians((p.longitude - _viewer_lng) / 2)) ^ 2
             ))
           )::int
         END AS distance_km
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND auth.uid() IS NOT NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.compute_distances_km(double precision, double precision, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_distances_km(double precision, double precision, uuid[]) TO authenticated;

-- =========================================================================
-- 2. Server-enforced swipe credits / rate limits
-- =========================================================================

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
  v_a uuid; v_b uuid;
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

  -- Block when target has blocked viewer or vice-versa
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = v_uid AND blocked_id = _target_id)
       OR (blocker_id = _target_id AND blocked_id = v_uid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'blocked');
  END IF;

  -- Idempotency: if the same swipe already exists, return current match state
  -- without consuming additional credits and without flipping direction.
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

  -- Membership tier / daily limit (free = 5 likes/day; paid = unlimited).
  SELECT membership_tier, membership_status, membership_expires_at
    INTO v_tier, v_status, v_expires
    FROM public.profiles WHERE id = v_uid;
  v_active := v_status = 'active'
              AND (v_expires IS NULL OR v_expires > now())
              AND v_tier IN ('select','plus','elite');
  v_daily_limit := CASE WHEN v_active THEN -1 ELSE 5 END;

  IF _direction IN ('like','super') AND v_daily_limit >= 0 THEN
    SELECT COUNT(*) INTO v_today_likes
      FROM public.swipes
     WHERE swiper_id = v_uid
       AND direction IN ('like','super')
       AND created_at >= (now() at time zone 'UTC')::date;
    IF v_today_likes >= v_daily_limit THEN
      RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
    END IF;
  END IF;

  -- First-impression credit (Elite-only feature; checked when fi_msg present)
  IF v_fi_msg IS NOT NULL THEN
    SELECT first_impression_balance INTO v_fi_bal
      FROM public.user_credits WHERE user_id = v_uid;
    IF COALESCE(v_fi_bal, 0) <= 0 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'insufficient_first_impression');
    END IF;
  ELSIF _direction = 'super' THEN
    SELECT super_like_balance INTO v_super_bal
      FROM public.user_credits WHERE user_id = v_uid;
    IF COALESCE(v_super_bal, 0) <= 0 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'insufficient_super_like');
    END IF;
  END IF;

  -- Insert the swipe (trigger creates the reciprocal match if applicable).
  INSERT INTO public.swipes(swiper_id, swiped_id, direction, first_impression_message)
  VALUES (v_uid, _target_id, _direction, v_fi_msg);

  -- Consume credits AFTER insert succeeds.
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

  -- Check whether a match now exists.
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

-- Lock down direct INSERT/UPDATE on swipes; the RPC above is the only path.
DROP POLICY IF EXISTS "Users can update their own swipes" ON public.swipes;
DROP POLICY IF EXISTS swipes_insert_own ON public.swipes;
CREATE POLICY swipes_insert_denied
  ON public.swipes FOR INSERT TO authenticated
  WITH CHECK (false);

REVOKE INSERT, UPDATE ON public.swipes FROM authenticated;
-- SELECT and DELETE policies remain (swipes_select_involved, swipes_delete_own).
