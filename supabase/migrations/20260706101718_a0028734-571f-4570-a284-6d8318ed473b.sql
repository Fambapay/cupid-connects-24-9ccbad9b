
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
    WHERE s.swiped_id = v_uid AND s.direction IN ('like','super')
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
           COALESCE(
             (SELECT array_agg(pp.storage_path ORDER BY pp.position)
              FROM profile_photos pp WHERE pp.profile_id = p.id),
             ARRAY[]::text[]
           ) AS photos,
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
        'interests', c.interests,
        'photos', c.photos
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
