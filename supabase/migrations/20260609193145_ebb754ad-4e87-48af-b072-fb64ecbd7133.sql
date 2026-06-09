-- Drop duplicate trigger that caused the first impression message to be inserted twice
DROP TRIGGER IF EXISTS swipes_create_match ON public.swipes;

-- Make the seeded first-impression message insert idempotent (no relying on a unique constraint)
CREATE OR REPLACE FUNCTION public.create_match_on_reciprocal_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reciprocal_exists boolean;
  involves_seed boolean;
  a uuid;
  b uuid;
  v_match_id uuid;
  v_fi_msg text;
  v_fi_sender uuid;
  v_fi_created timestamptz;
BEGIN
  IF NEW.direction = 'pass' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE (id = NEW.swiper_id OR id = NEW.swiped_id)
      AND is_seed = true
  ) INTO involves_seed;

  IF involves_seed THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND direction IN ('like','super')
  ) INTO reciprocal_exists;

  IF reciprocal_exists THEN
    IF NEW.swiper_id < NEW.swiped_id THEN
      a := NEW.swiper_id; b := NEW.swiped_id;
    ELSE
      a := NEW.swiped_id; b := NEW.swiper_id;
    END IF;
    INSERT INTO public.matches(user_a, user_b)
    VALUES (a, b)
    ON CONFLICT (user_a, user_b) DO UPDATE SET user_a = EXCLUDED.user_a
    RETURNING id INTO v_match_id;

    SELECT first_impression_message, swiper_id, created_at
      INTO v_fi_msg, v_fi_sender, v_fi_created
    FROM public.swipes
    WHERE first_impression_message IS NOT NULL
      AND (
        (swiper_id = NEW.swiper_id AND swiped_id = NEW.swiped_id)
        OR (swiper_id = NEW.swiped_id AND swiped_id = NEW.swiper_id)
      )
    ORDER BY created_at ASC
    LIMIT 1;

    -- Idempotent: only seed once per match, even if this trigger fires twice
    -- or the function is called again on a re-inserted swipe.
    IF v_fi_msg IS NOT NULL AND v_match_id IS NOT NULL THEN
      INSERT INTO public.messages(match_id, sender_id, content, created_at)
      SELECT v_match_id, v_fi_sender, v_fi_msg, v_fi_created
      WHERE NOT EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.match_id = v_match_id
          AND m.sender_id = v_fi_sender
          AND m.content = v_fi_msg
      );
    END IF;
  END IF;
  RETURN NEW;
END $function$;