
-- 1. Add first_impression_message column to swipes
ALTER TABLE public.swipes
  ADD COLUMN IF NOT EXISTS first_impression_message TEXT;

ALTER TABLE public.swipes
  DROP CONSTRAINT IF EXISTS swipes_first_impression_len;

ALTER TABLE public.swipes
  ADD CONSTRAINT swipes_first_impression_len
  CHECK (first_impression_message IS NULL OR char_length(first_impression_message) BETWEEN 1 AND 280);

-- 2. Replace trigger function so a reciprocal like that involves a stored
--    first impression also seeds the chat with the original message.
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

  -- Never create matches involving seed profiles
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

    -- Seed the chat with any first impression message stored on either swipe.
    -- Prefer the original (older) swipe so the sender is the one who actually wrote it.
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

    IF v_fi_msg IS NOT NULL AND v_match_id IS NOT NULL THEN
      INSERT INTO public.messages(match_id, sender_id, content, created_at)
      VALUES (v_match_id, v_fi_sender, v_fi_msg, v_fi_created)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $function$;
