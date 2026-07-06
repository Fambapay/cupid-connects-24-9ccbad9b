CREATE OR REPLACE FUNCTION public.get_who_liked_me()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_is_premium boolean;
  v_reveal boolean;
  v_count int;
  v_likers jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'reveal', false, 'count', 0, 'likers', '[]'::jsonb);
  END IF;

  SELECT membership_tier INTO v_tier FROM public.profiles WHERE id = v_uid;
  v_is_premium := public.has_premium_access(v_uid);
  v_reveal := v_is_premium AND v_tier IN ('plus','elite');

  SELECT COUNT(*) INTO v_count
  FROM public.swipes s
  JOIN public.profiles p ON p.id = s.swiper_id
  WHERE s.swiped_id = v_uid
    AND s.direction IN ('like','super')
    AND p.is_paused = false
    AND p.onboarding_completed = true
    AND COALESCE(p.is_seed, false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public.swipes r
      WHERE r.swiper_id = v_uid AND r.swiped_id = s.swiper_id
    );

  IF v_reveal THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'age', EXTRACT(YEAR FROM age(p.birthdate))::int,
      'city', p.city,
      'photo_path', (SELECT storage_path FROM public.profile_photos
                     WHERE profile_id = p.id ORDER BY position ASC LIMIT 1),
      'teaser_photo_path', NULL,
      'is_super', (s.direction = 'super'),
      'first_impression', s.first_impression_message
    ) ORDER BY s.created_at DESC), '[]'::jsonb)
      INTO v_likers
    FROM public.swipes s
    JOIN public.profiles p ON p.id = s.swiper_id
    WHERE s.swiped_id = v_uid
      AND s.direction IN ('like','super')
      AND p.is_paused = false
      AND p.onboarding_completed = true
      AND COALESCE(p.is_seed, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.swipes r
        WHERE r.swiper_id = v_uid AND r.swiped_id = s.swiper_id
      );
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', NULL,
      'age', NULL,
      'city', NULL,
      'photo_path', NULL,
      'teaser_photo_path', (SELECT storage_path FROM public.profile_photos
                            WHERE profile_id = p.id ORDER BY position ASC LIMIT 1),
      'is_super', (s.direction = 'super'),
      'first_impression', NULL
    ) ORDER BY s.created_at DESC), '[]'::jsonb)
      INTO v_likers
    FROM public.swipes s
    JOIN public.profiles p ON p.id = s.swiper_id
    WHERE s.swiped_id = v_uid
      AND s.direction IN ('like','super')
      AND p.is_paused = false
      AND p.onboarding_completed = true
      AND COALESCE(p.is_seed, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.swipes r
        WHERE r.swiper_id = v_uid AND r.swiped_id = s.swiper_id
      );
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'reveal', v_reveal,
    'count', v_count,
    'likers', v_likers
  );
END $function$;