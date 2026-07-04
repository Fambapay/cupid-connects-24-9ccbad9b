
-- ============================================================
-- FASE 1 — Fundação server para o novo modelo de tiers/ofertas
-- Estende o existente (não substitui offers/user_credits/boosts).
-- ============================================================

-- 1. Migrar estados legados de membership_status ------------------------------
UPDATE public.profiles
   SET membership_status = 'free'
 WHERE membership_status = 'locked';

-- 2. Novas colunas no perfil --------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS visibility_multiplier numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS show_day4_recap boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pause_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_fingerprint text;

-- Backfill trial_ends_at para quem ainda está trialing
UPDATE public.profiles
   SET trial_ends_at = COALESCE(trial_ends_at, membership_expires_at)
 WHERE membership_status = 'trialing' AND trial_ends_at IS NULL;

-- Bloquear escrita de campos privilegiados novos por parte do utilizador
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_tier          IS DISTINCT FROM OLD.membership_tier          OR
     NEW.membership_status        IS DISTINCT FROM OLD.membership_status        OR
     NEW.membership_expires_at    IS DISTINCT FROM OLD.membership_expires_at    OR
     NEW.is_verified              IS DISTINCT FROM OLD.is_verified              OR
     NEW.is_seed                  IS DISTINCT FROM OLD.is_seed                  OR
     NEW.seed_active              IS DISTINCT FROM OLD.seed_active              OR
     NEW.welcome_bonus_granted_at IS DISTINCT FROM OLD.welcome_bonus_granted_at OR
     NEW.trial_ends_at            IS DISTINCT FROM OLD.trial_ends_at            OR
     NEW.visibility_multiplier    IS DISTINCT FROM OLD.visibility_multiplier    OR
     NEW.show_day4_recap          IS DISTINCT FROM OLD.show_day4_recap          OR
     NEW.pause_used               IS DISTINCT FROM OLD.pause_used
  THEN
    RAISE EXCEPTION 'Forbidden: cannot modify privileged profile fields';
  END IF;

  RETURN NEW;
END $$;

-- 3. handle_new_user: fixar trial_ends_at ------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name,
    membership_tier, membership_status,
    membership_expires_at, trial_ends_at, visibility_multiplier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    'elite','trialing',
    now() + interval '3 days',
    now() + interval '3 days',
    3.0
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_credits  (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

-- 4. daily_usage --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  likes_used integer NOT NULL DEFAULT 0,
  super_likes_used integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);
GRANT SELECT ON public.daily_usage TO authenticated;
GRANT ALL ON public.daily_usage TO service_role;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_read_own" ON public.daily_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. tier_boost_usage ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tier_boost_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_key)
);
GRANT SELECT ON public.tier_boost_usage TO authenticated;
GRANT ALL ON public.tier_boost_usage TO service_role;
ALTER TABLE public.tier_boost_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tier_boost_usage_read_own" ON public.tier_boost_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. daily_picks --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_picks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pick_date date NOT NULL,
  picked_profile_ids uuid[] NOT NULL,
  PRIMARY KEY (user_id, pick_date)
);
GRANT SELECT ON public.daily_picks TO authenticated;
GRANT ALL ON public.daily_picks TO service_role;
ALTER TABLE public.daily_picks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_picks_read_own" ON public.daily_picks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 7. Estender user_credits e boosts ------------------------------------------
ALTER TABLE public.user_credits
  ADD COLUMN IF NOT EXISTS welcome_boost_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.boosts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'pack'
  -- 'pack' | 'plus_weekly' | 'elite_daily' | 'welcome'
  ;

-- 8. Estender offers com target_tier + tabela offers_pricing ------------------
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS target_tier text NOT NULL DEFAULT 'select';

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_target_tier_check;
ALTER TABLE public.offers
  ADD CONSTRAINT offers_target_tier_check
  CHECK (target_tier IN ('select','plus','elite'));

CREATE TABLE IF NOT EXISTS public.offers_pricing (
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  currency text NOT NULL,
  first_period_price integer NOT NULL,
  regular_price integer NOT NULL,
  PRIMARY KEY (offer_id, currency)
);
GRANT SELECT ON public.offers_pricing TO authenticated;
GRANT ALL ON public.offers_pricing TO service_role;
ALTER TABLE public.offers_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_pricing_read" ON public.offers_pricing
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers_pricing_admin_all" ON public.offers_pricing
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 9. Extender enum offer_trigger ---------------------------------------------
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'day4_recap';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'locked_match';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'blurred_message';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'likes_teaser';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'out_of_likes';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'winback_day_60';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'winback_day_90';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'cancel_flow';

-- 10. RLS de mensagens: Free pode responder mas não iniciar ------------------
DROP POLICY IF EXISTS "messages_insert_member" ON public.messages;
CREATE POLICY "messages_insert_member" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_match_member(match_id, auth.uid())
    AND (
      public.has_premium_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.match_id = public.messages.match_id
          AND m.sender_id <> auth.uid()
      )
    )
  );

-- 11. Helper: can_initiate_conversation --------------------------------------
CREATE OR REPLACE FUNCTION public.can_initiate_conversation(_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_match_member(_match_id, auth.uid())
    AND (
      public.has_premium_access(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.match_id = _match_id
          AND m.sender_id <> auth.uid()
      )
    )
$$;

-- 12. Novo insert_swipe: Free ganha 10 likes/dia; super só com pack ---------
CREATE OR REPLACE FUNCTION public.insert_swipe(
  _target_id uuid,
  _direction text,
  _first_impression_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'UTC')::date;
  v_super_bal int; v_fi_bal int; v_fi_msg text;
  v_existing record; v_match_id uuid; v_a uuid; v_b uuid;
  v_remaining_super int; v_remaining_fi int;
  v_target_is_seed boolean;
  v_tier text; v_status text;
  v_is_premium boolean;
  v_free_limit int := 10;
  v_used_today int;
  v_updated int;
  v_likes_remaining int;
  v_daily_super_cap int;
  v_super_used_today int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;
  IF v_uid = _target_id THEN RETURN jsonb_build_object('success', false, 'reason', 'self_swipe'); END IF;
  IF _direction NOT IN ('like','pass','super') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_direction');
  END IF;

  SELECT COALESCE(is_seed, false) INTO v_target_is_seed FROM public.profiles WHERE id = _target_id;
  IF v_target_is_seed THEN RETURN jsonb_build_object('success', false, 'reason', 'invalid_target'); END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id=v_uid AND blocked_id=_target_id) OR (blocker_id=_target_id AND blocked_id=v_uid)
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'blocked');
  END IF;

  SELECT membership_tier, membership_status INTO v_tier, v_status FROM public.profiles WHERE id = v_uid;
  v_is_premium := public.has_premium_access(v_uid);

  v_fi_msg := NULLIF(trim(COALESCE(_first_impression_message, '')), '');
  IF v_fi_msg IS NOT NULL THEN
    v_fi_msg := left(v_fi_msg, 280);
    IF _direction <> 'super' THEN _direction := 'super'; END IF;
  END IF;

  -- Duplicado?
  SELECT id, direction INTO v_existing FROM public.swipes WHERE swiper_id=v_uid AND swiped_id=_target_id;
  IF v_existing.id IS NOT NULL THEN
    v_a := LEAST(v_uid,_target_id); v_b := GREATEST(v_uid,_target_id);
    SELECT id INTO v_match_id FROM public.matches WHERE user_a=v_a AND user_b=v_b;
    RETURN jsonb_build_object('success', true, 'already_swiped', true,
      'direction', v_existing.direction, 'matched', v_match_id IS NOT NULL, 'match_id', v_match_id);
  END IF;

  -- Cap diário de likes (Free): 10/dia. Reserva atómica antes de inserir.
  IF _direction IN ('like','super') AND NOT v_is_premium THEN
    INSERT INTO public.daily_usage(user_id, usage_date, likes_used)
    VALUES (v_uid, v_today, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

    UPDATE public.daily_usage
       SET likes_used = likes_used + 1
     WHERE user_id = v_uid AND usage_date = v_today AND likes_used < v_free_limit
     RETURNING likes_used INTO v_used_today;

    IF v_used_today IS NULL THEN
      RETURN jsonb_build_object('success', false, 'reason', 'daily_like_limit_reached',
        'likes_limit', v_free_limit);
    END IF;
    v_likes_remaining := GREATEST(0, v_free_limit - v_used_today);
  END IF;

  -- Super Like: Free precisa de pack; pagos gastam da quota ou do pack
  IF v_fi_msg IS NOT NULL THEN
    SELECT first_impression_balance INTO v_fi_bal FROM public.user_credits WHERE user_id=v_uid;
    IF COALESCE(v_fi_bal,0) <= 0 THEN
      RETURN jsonb_build_object('success', false, 'reason', 'insufficient_first_impression');
    END IF;
  ELSIF _direction = 'super' THEN
    IF v_is_premium THEN
      v_daily_super_cap := CASE v_tier
        WHEN 'select' THEN 1 WHEN 'plus' THEN 5 WHEN 'elite' THEN 10 ELSE 0
      END;

      INSERT INTO public.daily_usage(user_id, usage_date, super_likes_used)
      VALUES (v_uid, v_today, 0)
      ON CONFLICT (user_id, usage_date) DO NOTHING;

      UPDATE public.daily_usage
         SET super_likes_used = super_likes_used + 1
       WHERE user_id = v_uid AND usage_date = v_today AND super_likes_used < v_daily_super_cap
       RETURNING super_likes_used INTO v_super_used_today;

      IF v_super_used_today IS NULL THEN
        -- caiu para pack
        SELECT super_like_balance INTO v_super_bal FROM public.user_credits WHERE user_id=v_uid;
        IF COALESCE(v_super_bal,0) <= 0 THEN
          RETURN jsonb_build_object('success', false, 'reason', 'insufficient_super_like');
        END IF;
      END IF;
    ELSE
      SELECT super_like_balance INTO v_super_bal FROM public.user_credits WHERE user_id=v_uid;
      IF COALESCE(v_super_bal,0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'insufficient_super_like');
      END IF;
    END IF;
  END IF;

  INSERT INTO public.swipes(swiper_id, swiped_id, direction, first_impression_message)
  VALUES (v_uid, _target_id, _direction::public.swipe_direction, v_fi_msg);

  IF v_fi_msg IS NOT NULL THEN
    UPDATE public.user_credits SET first_impression_balance = first_impression_balance - 1, updated_at = now()
     WHERE user_id = v_uid AND first_impression_balance > 0
     RETURNING first_impression_balance INTO v_remaining_fi;
  ELSIF _direction = 'super' AND (v_super_used_today IS NULL OR NOT v_is_premium) THEN
    UPDATE public.user_credits SET super_like_balance = super_like_balance - 1, updated_at = now()
     WHERE user_id = v_uid AND super_like_balance > 0
     RETURNING super_like_balance INTO v_remaining_super;
  END IF;

  v_a := LEAST(v_uid, _target_id); v_b := GREATEST(v_uid, _target_id);
  SELECT id INTO v_match_id FROM public.matches WHERE user_a=v_a AND user_b=v_b;

  RETURN jsonb_build_object(
    'success', true,
    'matched', v_match_id IS NOT NULL,
    'match_id', v_match_id,
    'remaining_super_likes', v_remaining_super,
    'remaining_first_impressions', v_remaining_fi,
    'likes_remaining_today', v_likes_remaining
  );
END $$;

-- 13. get_my_access: fonte única do acesso do utilizador ---------------------
CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_p record;
  v_c record;
  v_today date := (now() at time zone 'UTC')::date;
  v_week text := to_char(now() at time zone 'UTC', 'IYYY"-W"IW');
  v_likes_used int := 0;
  v_super_used int := 0;
  v_free_limit int := 10;
  v_is_premium boolean;
  v_daily_super_cap int := 0;
  v_boost_available boolean := false;
  v_period_key text;
  v_can_initiate_any boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false);
  END IF;

  SELECT membership_tier, membership_status, membership_expires_at,
         trial_ends_at, show_day4_recap, pause_used, country
    INTO v_p FROM public.profiles WHERE id = v_uid;

  v_is_premium := public.has_premium_access(v_uid);

  SELECT likes_used, super_likes_used INTO v_likes_used, v_super_used
    FROM public.daily_usage WHERE user_id = v_uid AND usage_date = v_today;
  v_likes_used := COALESCE(v_likes_used, 0);
  v_super_used := COALESCE(v_super_used, 0);

  SELECT boost_balance, super_like_balance, first_impression_balance, welcome_boost_used
    INTO v_c FROM public.user_credits WHERE user_id = v_uid;

  IF v_is_premium THEN
    v_daily_super_cap := CASE v_p.membership_tier
      WHEN 'select' THEN 1 WHEN 'plus' THEN 5 WHEN 'elite' THEN 10 ELSE 0
    END;

    IF v_p.membership_tier = 'elite' THEN
      v_period_key := v_today::text;
      v_boost_available := NOT EXISTS (
        SELECT 1 FROM public.tier_boost_usage
        WHERE user_id = v_uid AND period_key = v_period_key
      );
    ELSIF v_p.membership_tier = 'plus' THEN
      v_period_key := v_week;
      v_boost_available := NOT EXISTS (
        SELECT 1 FROM public.tier_boost_usage
        WHERE user_id = v_uid AND period_key = v_period_key
      );
    END IF;
  END IF;

  v_can_initiate_any := v_is_premium;

  RETURN jsonb_build_object(
    'authenticated', true,
    'tier', v_p.membership_tier,
    'status', v_p.membership_status,
    'is_premium', v_is_premium,
    'is_trialing', v_p.membership_status = 'trialing',
    'trial_ends_at', v_p.trial_ends_at,
    'membership_expires_at', v_p.membership_expires_at,
    'show_day4_recap', COALESCE(v_p.show_day4_recap, false),
    'pause_used', COALESCE(v_p.pause_used, false),
    'currency', CASE WHEN v_p.country ILIKE 'ao%' THEN 'AOA' ELSE 'MZN' END,
    'likes_used_today', v_likes_used,
    'likes_limit_today', CASE WHEN v_is_premium THEN -1 ELSE v_free_limit END,
    'likes_remaining_today', CASE
      WHEN v_is_premium THEN -1
      ELSE GREATEST(0, v_free_limit - v_likes_used)
    END,
    'super_likes_used_today', v_super_used,
    'super_likes_limit_today', v_daily_super_cap,
    'super_likes_remaining_today', GREATEST(0, v_daily_super_cap - v_super_used),
    'can_initiate_conversation_default', v_can_initiate_any,
    'consumables', jsonb_build_object(
      'boosts', COALESCE(v_c.boost_balance, 0),
      'super_likes', COALESCE(v_c.super_like_balance, 0),
      'first_impressions', COALESCE(v_c.first_impression_balance, 0),
      'welcome_boost_used', COALESCE(v_c.welcome_boost_used, false)
    ),
    'boost_available_now', v_boost_available,
    'boost_period_key', v_period_key
  );
END $$;

-- 14. use_tier_boost: consome direito semanal (Plus) / diário (Elite) --------
CREATE OR REPLACE FUNCTION public.use_tier_boost()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_period_key text;
  v_today date := (now() at time zone 'UTC')::date;
  v_source text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;

  IF NOT public.has_premium_access(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_premium');
  END IF;

  SELECT membership_tier INTO v_tier FROM public.profiles WHERE id = v_uid;

  IF v_tier = 'elite' THEN
    v_period_key := v_today::text;
    v_source := 'elite_daily';
  ELSIF v_tier = 'plus' THEN
    v_period_key := to_char(now() at time zone 'UTC', 'IYYY"-W"IW');
    v_source := 'plus_weekly';
  ELSE
    RETURN jsonb_build_object('success', false, 'reason', 'tier_no_boost');
  END IF;

  BEGIN
    INSERT INTO public.tier_boost_usage(user_id, period_key) VALUES (v_uid, v_period_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_used');
  END;

  INSERT INTO public.boosts(profile_id, expires_at, source)
  VALUES (v_uid, now() + interval '30 minutes', v_source);

  RETURN jsonb_build_object('success', true, 'source', v_source,
    'expires_at', now() + interval '30 minutes');
END $$;

-- 15. use_pack_boost: consome 1 boost do inventário --------------------------
CREATE OR REPLACE FUNCTION public.use_pack_boost()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal int;
  v_tier text;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;

  UPDATE public.user_credits
     SET boost_balance = boost_balance - 1, updated_at = now()
   WHERE user_id = v_uid AND boost_balance > 0
   RETURNING boost_balance INTO v_bal;

  IF v_bal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;

  INSERT INTO public.boosts(profile_id, expires_at, source)
  VALUES (v_uid, now() + interval '30 minutes', 'pack');

  SELECT membership_tier INTO v_tier FROM public.profiles WHERE id = v_uid;
  INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
  VALUES (v_uid, 'consume', v_tier, -1, v_bal, jsonb_build_object('source','pack'));

  RETURN jsonb_build_object('success', true, 'remaining_balance', v_bal,
    'expires_at', now() + interval '30 minutes');
END $$;

-- 16. get_who_liked_me: Plus/Elite ganha lista; Free/Select só contagem -----
CREATE OR REPLACE FUNCTION public.get_who_liked_me()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_is_premium boolean;
  v_count int;
  v_profiles jsonb;
  v_can_see boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('authenticated', false, 'count', 0, 'profiles', '[]'::jsonb);
  END IF;

  SELECT membership_tier INTO v_tier FROM public.profiles WHERE id = v_uid;
  v_is_premium := public.has_premium_access(v_uid);
  -- "Ver quem gostou" só a partir de Plus (ou em trial Elite)
  v_can_see := v_is_premium AND v_tier IN ('plus','elite');

  SELECT COUNT(*) INTO v_count
  FROM public.swipes s
  WHERE s.swiped_id = v_uid
    AND s.direction IN ('like','super')
    AND NOT EXISTS (
      SELECT 1 FROM public.swipes r
      WHERE r.swiper_id = v_uid AND r.swiped_id = s.swiper_id
    );

  IF v_can_see THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'age', EXTRACT(YEAR FROM age(p.birthdate))::int,
      'city', p.city,
      'photo', (SELECT storage_path FROM public.profile_photos
                WHERE profile_id = p.id ORDER BY position ASC LIMIT 1),
      'liked_at', s.created_at,
      'direction', s.direction
    ) ORDER BY s.created_at DESC), '[]'::jsonb)
      INTO v_profiles
    FROM public.swipes s
    JOIN public.profiles p ON p.id = s.swiper_id
    WHERE s.swiped_id = v_uid
      AND s.direction IN ('like','super')
      AND p.is_paused = false
      AND p.onboarding_completed = true
      AND NOT EXISTS (
        SELECT 1 FROM public.swipes r
        WHERE r.swiper_id = v_uid AND r.swiped_id = s.swiper_id
      );
  ELSE
    v_profiles := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'authenticated', true,
    'can_see', v_can_see,
    'count', v_count,
    'profiles', v_profiles
  );
END $$;

-- 17. Grants nas RPCs ---------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_my_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_initiate_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_tier_boost() TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_pack_boost() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_who_liked_me() TO authenticated;
