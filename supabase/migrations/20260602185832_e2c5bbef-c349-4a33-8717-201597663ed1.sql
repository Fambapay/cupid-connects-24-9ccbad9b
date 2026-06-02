
-- ============= SWIPES =============
CREATE TYPE public.swipe_direction AS ENUM ('like','pass','super');

CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid NOT NULL,
  swiped_id uuid NOT NULL,
  direction public.swipe_direction NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (swiper_id, swiped_id),
  CHECK (swiper_id <> swiped_id)
);
CREATE INDEX idx_swipes_swiped ON public.swipes(swiped_id, direction);
CREATE INDEX idx_swipes_swiper ON public.swipes(swiper_id);

GRANT SELECT, INSERT, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

-- Users see swipes they sent OR received (needed for "who liked me")
CREATE POLICY swipes_select_involved ON public.swipes
  FOR SELECT TO authenticated
  USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY swipes_insert_own ON public.swipes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY swipes_delete_own ON public.swipes
  FOR DELETE TO authenticated
  USING (auth.uid() = swiper_id);

-- ============= MATCHES =============
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL,
  user_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
CREATE INDEX idx_matches_user_a ON public.matches(user_a);
CREATE INDEX idx_matches_user_b ON public.matches(user_b);

GRANT SELECT, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY matches_select_own ON public.matches
  FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY matches_delete_own ON public.matches
  FOR DELETE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ============= MESSAGES =============
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_match ON public.messages(match_id, created_at);

GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_match_member(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = _match_id AND (user_a = _user_id OR user_b = _user_id)
  )
$$;

CREATE POLICY messages_select_member ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_match_member(match_id, auth.uid()));

CREATE POLICY messages_insert_member ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_match_member(match_id, auth.uid())
  );

-- ============= MATCH TRIGGER =============
CREATE OR REPLACE FUNCTION public.create_match_on_reciprocal_like()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reciprocal_exists boolean;
  a uuid;
  b uuid;
BEGIN
  IF NEW.direction = 'pass' THEN
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
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER swipes_create_match
AFTER INSERT ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.create_match_on_reciprocal_like();

-- Bump last_message_at on each message
CREATE OR REPLACE FUNCTION public.bump_match_activity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.matches SET last_message_at = NEW.created_at WHERE id = NEW.match_id;
  RETURN NEW;
END $$;

CREATE TRIGGER messages_bump_match
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_match_activity();

-- ============= REALTIME =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- ============= PROFILE / PHOTOS VISIBILITY =============
-- Allow authenticated users to discover other completed profiles
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_select_others ON public.profiles
  FOR SELECT TO authenticated
  USING (
    onboarding_completed = true
    AND is_paused = false
    AND auth.uid() <> id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profiles.id)
         OR (b.blocker_id = profiles.id AND b.blocked_id = auth.uid())
    )
  );

CREATE POLICY photos_select_others ON public.profile_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_photos.profile_id
        AND p.onboarding_completed = true
        AND p.is_paused = false
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profile_photos.profile_id)
         OR (b.blocker_id = profile_photos.profile_id AND b.blocked_id = auth.uid())
    )
  );

-- ============= STORAGE: allow authenticated to read profile photos =============
CREATE POLICY "Authenticated can read profile photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-photos');
