
CREATE OR REPLACE FUNCTION public.get_discovery_feed(
  _filters jsonb DEFAULT '{}'::jsonb,
  _viewer_lat double precision DEFAULT NULL,
  _viewer_lng double precision DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  v_me record;
  v_settings record;
  v_active boolean;
  v_age_min int;
  v_age_max int;
  v_distance_max int;
  v_distance_filter_active boolean;
  v_require_bio boolean;
  v_verified_only boolean;
  v_online_now boolean;
  v_min_photos int;
  v_gender_filter text[];
  v_interested_in text[];
  v_height_min int;
  v_height_max int;
  v_likes_used int := 0;
  v_super_used int := 0;
  v_daily_likes int := 0;
  v_daily_super int := 0;
  v_candidates jsonb;
  v_viewer_lat double precision;
  v_viewer_lng double precision;
  v_my_interests text[];
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('candidates', '[]'::jsonb,
      'daily_limits', jsonb_build_object(
        'likes_used',0,'likes_limit',0,'super_used',0,'super_limit',0));
  END IF;

  SELECT interested_in, membership_tier, membership_status, membership_expires_at,
         latitude, longitude, interests
    INTO v_me FROM public.profiles WHERE id = v_uid;

  v_viewer_lat := COALESCE(_viewer_lat, v_me.latitude);
  v_viewer_lng := COALESCE(_viewer_lng, v_me.longitude);

  IF v_viewer_lat IS NULL OR v_viewer_lng IS NULL THEN
    RETURN jsonb_build_object(
      'candidates', '[]'::jsonb,
      'needs_location', true,
      'daily_limits', jsonb_build_object(
        'likes_used', 0, 'likes_limit', 0, 'super_used', 0, 'super_limit', 0));
  END IF;

  v_gender_filter := CASE _filters->>'gender'
    WHEN 'feminino' THEN ARRAY['woman','transwoman']
    WHEN 'masculino' THEN ARRAY['man','transman']
    WHEN 'nao_binario' THEN ARRAY['nonbinary','genderfluid','agender','other']
    ELSE NULL
  END;
  v_interested_in := COALESCE(v_me.interested_in, ARRAY[]::text[]);

  -- Require the user to have chosen who they want to see, otherwise the feed
  -- would silently include every gender. No fallback — force explicit choice.
  IF v_gender_filter IS NULL AND array_length(v_interested_in, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'candidates', '[]'::jsonb,
      'needs_preference', true,
      'daily_limits', jsonb_build_object(
        'likes_used', 0, 'likes_limit', 0, 'super_used', 0, 'super_limit', 0));
  END IF;

  SELECT age_min, age_max, distance_radius, require_bio, min_photos
    INTO v_settings FROM public.user_settings WHERE user_id = v_uid;

  v_active := COALESCE(v_me.membership_status,'inactive') IN ('active','trialing')
              AND (v_me.membership_expires_at IS NULL OR v_me.membership_expires_at > now())
              AND v_me.membership_tier IN ('select','plus','elite');

  IF v_active THEN
    v_daily_likes := -1;
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

  v_age_min := COALESCE((_filters->>'ageMin')::int, v_settings.age_min, 18);
  v_age_max := COALESCE((_filters->>'ageMax')::int, v_settings.age_max, 80);
  v_distance_max := COALESCE((_filters->>'distance')::int, v_settings.distance_radius);
  v_distance_filter_active := v_distance_max IS NOT NULL;
  v_require_bio := COALESCE((_filters->>'hasBio')::boolean, v_settings.require_bio, false);
  v_verified_only := COALESCE((_filters->>'verifiedOnly')::boolean, false);
  v_online_now := COALESCE((_filters->>'onlineNow')::boolean, false);
  v_min_photos := GREATEST(1, COALESCE(v_settings.min_photos, 1));

  IF v_active THEN
    v_height_min := NULLIF((_filters->>'heightMin')::int, 0);
    v_height_max := NULLIF((_filters->>'heightMax')::int, 0);
  ELSE
    v_height_min := NULL;
    v_height_max := NULL;
  END IF;

  v_my_interests := COALESCE(v_me.interests, ARRAY[]::text[]);

  WITH excluded AS (
    SELECT swiped_id AS id FROM public.swipes
      WHERE swiper_id = v_uid
        AND (direction IN ('like','super') OR created_at >= now() - interval '60 days')
    UNION SELECT blocked_id FROM public.blocked_users WHERE blocker_id = v_uid
    UNION SELECT blocker_id FROM public.blocked_users WHERE blocked_id = v_uid
    UNION SELECT reported_id FROM public.reports WHERE reporter_id = v_uid
    UNION SELECT v_uid
  ),
  liked_me AS (
    SELECT swiper_id AS id FROM public.swipes
    WHERE swiped_id = v_uid AND direction IN ('like','super')
  ),
  base AS (
    SELECT p.id, p.name, p.birthdate, p.city, p.country, p.bio, p.interests,
           p.is_verified, p.gender, p.last_active_at, p.is_incognito,
           p.height_cm,
           p.looking_for, p.pets, p.smoking, p.drinking, p.workout,
           p.membership_tier, p.membership_status, p.membership_expires_at,
           round(2 * 6371 * asin(sqrt(
             sin(radians((p.latitude - v_viewer_lat)/2))^2 +
             cos(radians(v_viewer_lat))*cos(radians(p.latitude))*
             sin(radians((p.longitude - v_viewer_lng)/2))^2)))::int AS distance_km,
           EXTRACT(YEAR FROM age(p.birthdate))::int AS age_calc
    FROM public.profiles p
    WHERE p.onboarding_completed = true
      AND p.is_paused = false
      AND COALESCE(p.is_seed, false) = false
      AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
      AND p.id NOT IN (SELECT id FROM excluded)
      AND (NOT p.is_incognito OR p.id IN (SELECT id FROM liked_me))
      AND (v_gender_filter IS NOT NULL OR array_length(v_interested_in,1) IS NULL OR p.gender = ANY(v_interested_in))
      AND (v_gender_filter IS NULL OR p.gender = ANY(v_gender_filter))
      AND (NOT v_verified_only OR p.is_verified = true)
      AND (NOT v_require_bio OR (p.bio IS NOT NULL AND p.bio <> ''))
      AND (NOT v_online_now OR p.last_active_at > now() - interval '90 seconds')
      AND p.birthdate IS NOT NULL
      AND EXTRACT(YEAR FROM age(p.birthdate))::int BETWEEN v_age_min AND v_age_max
      AND (v_height_min IS NULL OR (p.height_cm IS NOT NULL AND p.height_cm >= v_height_min))
      AND (v_height_max IS NULL OR (p.height_cm IS NOT NULL AND p.height_cm <= v_height_max))
  ),
  with_distance AS (
    SELECT * FROM base
    WHERE NOT v_distance_filter_active OR distance_km <= v_distance_max
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
  scored AS (
    SELECT f.*,
      -- Composite quality score. Boost dominates; then tier; then shared interests
      -- and recency of activity. Ordered DESC with random() tie-break for variety.
      (
        CASE WHEN EXISTS (
          SELECT 1 FROM public.boosts bo WHERE bo.profile_id = f.id AND bo.expires_at > now()
        ) THEN 100000 ELSE 0 END
        + CASE
            WHEN f.membership_status = 'active' AND (f.membership_expires_at IS NULL OR f.membership_expires_at > now())
                 AND f.membership_tier = 'elite' THEN 20000
            WHEN f.membership_status = 'active' AND (f.membership_expires_at IS NULL OR f.membership_expires_at > now())
                 AND f.membership_tier = 'plus' THEN 10000
            ELSE 0
          END
        + CASE
            WHEN f.last_active_at > now() - interval '15 minutes' THEN 3000
            WHEN f.last_active_at > now() - interval '24 hours'   THEN 1500
            WHEN f.last_active_at > now() - interval '7 days'     THEN 500
            ELSE 0
          END
        + COALESCE(cardinality(
            ARRAY(SELECT unnest(f.interests) INTERSECT SELECT unnest(v_my_interests))
          ), 0) * 200
      ) AS score
    FROM filtered f
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'age', age_calc, 'city', city, 'country', country,
    'bio', bio, 'interests', interests, 'is_verified', is_verified, 'gender', gender,
    'last_active_at', last_active_at, 'distance_km', COALESCE(distance_km, 0),
    'height_cm', height_cm,
    'looking_for', looking_for, 'pets', pets, 'smoking', smoking, 'drinking', drinking, 'workout', workout,
    'photos', photos
  ) ORDER BY score DESC, rand_key), '[]'::jsonb)
    INTO v_candidates
  FROM (
    SELECT *, random() AS rand_key
    FROM scored
    ORDER BY score DESC, random()
    OFFSET GREATEST(0, _offset)
    LIMIT _limit
  ) sub;

  RETURN jsonb_build_object(
    'candidates', v_candidates,
    'needs_location', false,
    'needs_preference', false,
    'daily_limits', jsonb_build_object(
      'likes_used', v_likes_used,
      'likes_limit', v_daily_likes,
      'super_used', v_super_used,
      'super_limit', v_daily_super
    )
  );
END $function$;
