-- 1) user_credits
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY,
  boost_balance integer NOT NULL DEFAULT 0,
  super_like_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT non_negative_credits CHECK (boost_balance >= 0 AND super_like_balance >= 0)
);

GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credits_select_own" ON public.user_credits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) boosts
CREATE TABLE public.boosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_boosts_active ON public.boosts (profile_id, expires_at);

GRANT SELECT, DELETE ON public.boosts TO authenticated;
GRANT ALL ON public.boosts TO service_role;

ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ler boosts ativos (para badge/feed)
CREATE POLICY "boosts_select_active" ON public.boosts
  FOR SELECT TO authenticated USING (expires_at > now());

CREATE POLICY "boosts_delete_own" ON public.boosts
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);

-- 3) Backfill user_credits para utilizadores existentes
INSERT INTO public.user_credits (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 4) Estender handle_new_user para criar linha de créditos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_credits (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $function$;

-- 5) consume_boost_credit
CREATE OR REPLACE FUNCTION public.consume_boost_credit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal int;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.boosts WHERE profile_id = v_uid AND expires_at > now()) THEN
    SELECT expires_at INTO v_exp FROM public.boosts
      WHERE profile_id = v_uid AND expires_at > now()
      ORDER BY expires_at DESC LIMIT 1;
    RETURN jsonb_build_object('success', false, 'reason', 'already_active', 'expires_at', v_exp);
  END IF;

  UPDATE public.user_credits
     SET boost_balance = boost_balance - 1
   WHERE user_id = v_uid AND boost_balance > 0
   RETURNING boost_balance INTO v_bal;

  IF v_bal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;

  v_exp := now() + interval '30 minutes';
  INSERT INTO public.boosts(profile_id, expires_at) VALUES (v_uid, v_exp);
  RETURN jsonb_build_object('success', true, 'expires_at', v_exp, 'remaining_balance', v_bal);
END $$;

GRANT EXECUTE ON FUNCTION public.consume_boost_credit() TO authenticated;

-- 6) consume_super_like_credit
CREATE OR REPLACE FUNCTION public.consume_super_like_credit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_bal int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  UPDATE public.user_credits
     SET super_like_balance = super_like_balance - 1
   WHERE user_id = v_uid AND super_like_balance > 0
   RETURNING super_like_balance INTO v_bal;

  IF v_bal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_credits');
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining_balance', v_bal);
END $$;

GRANT EXECUTE ON FUNCTION public.consume_super_like_credit() TO authenticated;

-- 7) rewind_last_swipe — adaptado à schema (swiper_id=auth.uid(), matches.user_a/user_b)
CREATE OR REPLACE FUNCTION public.rewind_last_swipe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_swipe record;
  v_match boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT id, swiped_id, direction INTO v_swipe
    FROM public.swipes
   WHERE swiper_id = v_uid
   ORDER BY created_at DESC LIMIT 1;

  IF v_swipe.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_swipe_found');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.matches
     WHERE (user_a = v_uid AND user_b = v_swipe.swiped_id)
        OR (user_a = v_swipe.swiped_id AND user_b = v_uid)
  ) INTO v_match;

  IF v_match THEN
    RETURN jsonb_build_object('success', false, 'error', 'match_exists');
  END IF;

  DELETE FROM public.swipes WHERE id = v_swipe.id;
  RETURN jsonb_build_object(
    'success', true,
    'swiped_id', v_swipe.swiped_id,
    'direction', v_swipe.direction
  );
END $$;

GRANT EXECUTE ON FUNCTION public.rewind_last_swipe() TO authenticated;

-- 8) grant_credits (service_role only) — para futura integração de pagamentos
CREATE OR REPLACE FUNCTION public.grant_credits(
  _user_id uuid, _pack_kind text, _quantity int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_credits(user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;
  IF _pack_kind = 'boost' THEN
    UPDATE public.user_credits SET boost_balance = boost_balance + _quantity WHERE user_id = _user_id;
  ELSIF _pack_kind = 'super_like' THEN
    UPDATE public.user_credits SET super_like_balance = super_like_balance + _quantity WHERE user_id = _user_id;
  ELSE
    RAISE EXCEPTION 'invalid_pack_kind';
  END IF;
  RETURN jsonb_build_object('credited', true, 'quantity', _quantity);
END $$;

REVOKE ALL ON FUNCTION public.grant_credits(uuid,text,int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid,text,int) TO service_role;