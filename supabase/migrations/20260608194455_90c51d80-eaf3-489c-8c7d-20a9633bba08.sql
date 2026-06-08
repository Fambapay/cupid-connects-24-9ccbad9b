DO $$
DECLARE
  v_user record;
  v_seed record;
  v_a uuid;
  v_b uuid;
BEGIN
  FOR v_user IN
    SELECT p.id, p.gender, p.interested_in
    FROM public.profiles p
    WHERE p.is_seed IS NOT TRUE
      AND p.onboarding_completed = true
  LOOP
    FOR v_seed IN
      SELECT s.id
      FROM public.profiles s
      WHERE s.is_seed = true
        AND s.seed_active = true
        AND s.id <> v_user.id
        AND (
          v_user.interested_in IS NULL
          OR array_length(v_user.interested_in,1) IS NULL
          OR s.gender = ANY(v_user.interested_in)
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.matches m
          WHERE (m.user_a = LEAST(v_user.id, s.id) AND m.user_b = GREATEST(v_user.id, s.id))
        )
      ORDER BY random()
      LIMIT 8
    LOOP
      v_a := LEAST(v_user.id, v_seed.id);
      v_b := GREATEST(v_user.id, v_seed.id);

      INSERT INTO public.swipes (swiper_id, swiped_id, direction)
      VALUES (v_user.id, v_seed.id, 'like')
      ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

      INSERT INTO public.swipes (swiper_id, swiped_id, direction)
      VALUES (v_seed.id, v_user.id, 'like')
      ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

      INSERT INTO public.matches (user_a, user_b, created_at, last_message_at)
      VALUES (v_a, v_b, now() - (random() * interval '36 hours'), now() - (random() * interval '36 hours'))
      ON CONFLICT (user_a, user_b) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;