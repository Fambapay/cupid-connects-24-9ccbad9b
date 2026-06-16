CREATE OR REPLACE FUNCTION public.get_discovery_feed(
  _filters jsonb DEFAULT '{}'::jsonb,
  _viewer_lat double precision DEFAULT NULL,
  _viewer_lng double precision DEFAULT NULL,
  _limit int DEFAULT 100
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_me record;
  v_settings record;
  v_active boolean;
  v_age_min int;
  v_age_max int;
  v_distance_max int;
  v_require_bio boolean;
  v_verified_only boolean;
  v_online_now boolean;
  v_min_photos int;
  v_gender_filter text[];
  v_interested_in text[];
  v_likes_used int := 0;
  v_super_used int := 0;
  v_daily_likes int := 5;        -- free default
  v_daily_super int := 0;
  v_candidates jsonb;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('candidates', '[]'::jsonb,
      'daily_limits', jsonb_build_object(
        'likes_used',0,'likes_limit',0,'super_used',0,'super_limit',0));
  END IF;

  SELECT interested_in, membership_tier, membership_status, membership_expires_at
    INTO v_me FROM public.profiles WHERE id = v_uid;

  SELECT age_min, age_max, distance_radius, require_bio, min_photos
    INTO v_settings FROM public.user_settings WHERE user_id = v_uid;

  v_active := COALESCE(v_me.membership_status,'inactive') = 'active'
              AND (v_me.membership_expires_at IS NULL OR v_me.membership_expires_at > now())
              AND v_me.membership_tier IN ('select','plus','elite');

  -- daily limits per tier
  IF v_active THEN
    v_daily_likes := -1; -- unlimited
    CASE v_me.membership_tier
      WHEN 'select' THEN v_daily_super := 1;
      WHEN 'plus'   THEN v_daily_super := 5;
      WHEN 'elite'  THEN v_daily_super := 10;
      ELSE v_daily_super := 0;
    END CASE;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE direction IN ('like','super')),
    COUNT(*) FILTER (WHERE direction = 'super')
    INTO v_likes_used, v_super_used
  FROM public.swipes
  WHERE swiper_id = v_uid AND created_at >= v_today_start;

  -- filter inputs
  v_age_min := COALESCE((_filters->>'ageMin')::int, v_settings.age_min, 18);
  v_age_max := COALESCE((_filters->>'ageMax')::int, v_settings.age_max, 80);
  v_distance_max := COALESCE((_filters->>'distance')::int, v_settings.distance_radius, 200);
  v_require_bio := COALESCE((_filters->>'hasBio')::boolean, v_settings.require_bio, false);
  v_verified_only := COALESCE((_filters->>'verifiedOnly')::boolean, false);
  v_online_now := COALESCE((_filters->>'onlineNow')::boolean, false);
  v_min_photos := GREATEST(1, COALESCE(v_settings.min_photos, 1));

  v_gender_filter := CASE _filters->>'gender'
    WHEN 'feminino' THEN ARRAY['woman','transwoman']
    WHEN 'masculino' THEN ARRAY['man','transman']
    WHEN 'nao_binario' THEN ARRAY['nonbinary','genderfluid','agender','other']
    ELSE NULL
  END;
  v_interested_in := COALESCE(v_me.interested_in, ARRAY[]::text[]);

  WITH excluded AS (
    SELECT swiped_id AS id FROM public.swipes WHERE swiper_id = v_uid
    UNION SELECT blocked_id FROM public.blocked_users WHERE blocker_id = v_uid
    UNION SELECT blocker_id FROM public.blocked_users WHERE blocked_id = v_uid
    UNION SELECT v_uid
  ),
  liked_me AS (
    SELECT swiper_id AS id FROM public.swipes
    WHERE swiped_id = v_uid AND direction IN ('like','super')
  ),
  base AS (
    SELECT p.id, p.name, p.birthdate, p.city, p.country, p.bio, p.interests,
           p.is_verified, p.gender, p.last_active_at, p.is_seed, p.is_incognito,
           p.membership_tier, p.membership_status, p.membership_expires_at,
           CASE WHEN _viewer_lat IS NULL OR _viewer_lng IS NULL
                     OR p.latitude IS NULL OR p.longitude IS NULL THEN NULL
                ELSE round(2 * 6371 * asin(sqrt(
                  sin(radians((p.latitude - _viewer_lat)/2))^2 +
                  cos(radians(_viewer_lat))*cos(radians(p.latitude))*
                  sin(radians((p.longitude - _viewer_lng)/2))^2)))::int
           END AS distance_km,
           EXTRACT(YEAR FROM age(p.birthdate))::int AS age_calc
    FROM public.profiles p
    WHERE p.onboarding_completed = true
      AND p.is_paused = false
      AND p.id NOT IN (SELECT id FROM excluded)
      AND (NOT p.is_incognito OR p.id IN (SELECT id FROM liked_me))
      AND (v_gender_filter IS NOT NULL OR array_length(v_interested_in,1) IS NULL OR p.gender = ANY(v_interested_in))
      AND (v_gender_filter IS NULL OR p.gender = ANY(v_gender_filter))
      AND (NOT v_verified_only OR p.is_verified = true)
      AND (NOT v_require_bio OR (p.bio IS NOT NULL AND p.bio <> ''))
      AND (NOT v_online_now OR p.last_active_at > now() - interval '90 seconds')
      AND (p.birthdate IS NULL OR EXTRACT(YEAR FROM age(p.birthdate))::int BETWEEN v_age_min AND v_age_max)
  ),
  with_distance AS (
    SELECT * FROM base
    WHERE (_viewer_lat IS NULL OR _viewer_lng IS NULL OR v_distance_max >= 200 OR distance_km IS NULL OR distance_km <= v_distance_max)
  ),
  with_photos AS (
    SELECT b.*,
      COALESCE((
        SELECT jsonb_agg(ph.storage_path ORDER BY ph.position)
        FROM public.profile_photos ph WHERE ph.profile_id = b.id
      ), '[]'::jsonb) AS photos
    FROM with_distance b
  ),
  filtered AS (
    SELECT * FROM with_photos
    WHERE jsonb_array_length(photos) >= v_min_photos
  ),
  ranked AS (
    SELECT f.*,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.boosts bo WHERE bo.profile_id = f.id AND bo.expires_at > now()) THEN 3
        WHEN f.membership_status = 'active' AND (f.membership_expires_at IS NULL OR f.membership_expires_at > now())
             AND f.membership_tier = 'elite' THEN 2
        WHEN f.membership_status = 'active' AND (f.membership_expires_at IS NULL OR f.membership_expires_at > now())
             AND f.membership_tier = 'plus' THEN 1
        ELSE 0
      END AS rank
    FROM filtered f
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'age', age_calc, 'city', city, 'country', country,
    'bio', bio, 'interests', interests, 'is_verified', is_verified, 'gender', gender,
    'last_active_at', last_active_at, 'distance_km', COALESCE(distance_km, 0),
    'photos', photos
  ) ORDER BY is_seed ASC, rank DESC), '[]'::jsonb)
    INTO v_candidates
  FROM (SELECT * FROM ranked ORDER BY is_seed ASC, rank DESC LIMIT _limit) sub;

  v_result := jsonb_build_object(
    'candidates', v_candidates,
    'daily_limits', jsonb_build_object(
      'likes_used', v_likes_used,
      'likes_limit', v_daily_likes,
      'super_used', v_super_used,
      'super_limit', v_daily_super
    )
  );
  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION public.get_discovery_feed(jsonb, double precision, double precision, int) TO authenticated;