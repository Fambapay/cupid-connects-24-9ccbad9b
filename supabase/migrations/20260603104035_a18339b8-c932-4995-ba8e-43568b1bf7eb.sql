
-- 1. Columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seed_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_is_seed ON public.profiles(is_seed) WHERE is_seed = true;

-- 2. app_config table
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config_select_admin" ON public.app_config
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "app_config_insert_admin" ON public.app_config
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "app_config_update_admin" ON public.app_config
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

INSERT INTO public.app_config(key, value) VALUES
  ('seeds_auto_disable_threshold', '500'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. RLS profiles: hide inactive seeds from regular discovery
DROP POLICY IF EXISTS profiles_select_others ON public.profiles;
CREATE POLICY profiles_select_others ON public.profiles
  FOR SELECT TO authenticated
  USING (
    onboarding_completed = true
    AND is_paused = false
    AND auth.uid() <> id
    AND (is_seed = false OR seed_active = true)
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profiles.id)
         OR (b.blocker_id = profiles.id AND b.blocked_id = auth.uid())
    )
  );

-- Also adjust profile_photos select policy to hide photos of inactive seeds
DROP POLICY IF EXISTS photos_select_others ON public.profile_photos;
CREATE POLICY photos_select_others ON public.profile_photos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_photos.profile_id
        AND p.onboarding_completed = true
        AND p.is_paused = false
        AND (p.is_seed = false OR p.seed_active = true)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profile_photos.profile_id)
         OR (b.blocker_id = profile_photos.profile_id AND b.blocked_id = auth.uid())
    )
  );

-- 4. Block matches involving seeds
CREATE OR REPLACE FUNCTION public.create_match_on_reciprocal_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  reciprocal_exists boolean;
  involves_seed boolean;
  a uuid;
  b uuid;
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
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $function$;

-- Ensure trigger exists on swipes
DROP TRIGGER IF EXISTS trg_create_match_on_reciprocal_like ON public.swipes;
CREATE TRIGGER trg_create_match_on_reciprocal_like
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.create_match_on_reciprocal_like();

-- 5. Auto-resolve reports targeting seeds
CREATE OR REPLACE FUNCTION public.auto_resolve_seed_reports()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  target_is_seed boolean;
BEGIN
  SELECT is_seed INTO target_is_seed FROM public.profiles WHERE id = NEW.reported_id;
  IF target_is_seed THEN
    NEW.status := 'auto_resolved';
    NEW.reviewed_at := now();
    UPDATE public.profiles
      SET seed_active = false
      WHERE id = NEW.reported_id AND is_seed = true;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_auto_resolve_seed_reports ON public.reports;
CREATE TRIGGER trg_auto_resolve_seed_reports
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_resolve_seed_reports();

-- 6. Auto-disable seeds when real user threshold is reached
CREATE OR REPLACE FUNCTION public.check_seeds_auto_disable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_threshold int;
  v_real_count int;
  v_already_disabled jsonb;
BEGIN
  -- Only react when a non-seed profile completes onboarding
  IF NEW.is_seed = true THEN
    RETURN NEW;
  END IF;
  IF NEW.onboarding_completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.onboarding_completed = true THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_already_disabled FROM public.app_config WHERE key = 'seeds_auto_disabled_at';
  IF v_already_disabled IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT (value)::text::int INTO v_threshold
    FROM public.app_config WHERE key = 'seeds_auto_disable_threshold';
  IF v_threshold IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_real_count
    FROM public.profiles
    WHERE is_seed = false AND onboarding_completed = true;

  IF v_real_count >= v_threshold THEN
    UPDATE public.profiles SET seed_active = false WHERE is_seed = true;
    INSERT INTO public.app_config(key, value)
      VALUES ('seeds_auto_disabled_at', to_jsonb(now()::text))
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    INSERT INTO public.audit_logs(actor_id, actor_email, action, target_kind, meta)
      VALUES (NEW.id, NULL, 'seeds.auto_disabled', 'system',
              jsonb_build_object('real_users', v_real_count, 'threshold', v_threshold));
  END IF;

  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_check_seeds_auto_disable ON public.profiles;
CREATE TRIGGER trg_check_seeds_auto_disable
  AFTER INSERT OR UPDATE OF onboarding_completed ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_seeds_auto_disable();
