
-- 0) Extend membership_status constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_membership_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_membership_status_check
  CHECK (membership_status = ANY (ARRAY['inactive','active','cancelled','expired','trialing','grace_period']));

-- 1) has_premium_access
CREATE OR REPLACE FUNCTION public.has_premium_access(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid
      AND p.membership_status IN ('trialing','active','grace_period')
      AND (p.membership_expires_at IS NULL OR p.membership_expires_at > now())
  );
$$;
GRANT EXECUTE ON FUNCTION public.has_premium_access(uuid) TO authenticated, service_role;

-- 2) handle_new_user with trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, membership_tier, membership_status, membership_expires_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    'elite','trialing', now() + interval '3 days'
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_credits (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

-- 3) Backfill (bypass user triggers)
ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles
SET membership_tier = 'elite', membership_status = 'trialing',
    membership_expires_at = now() + interval '3 days', updated_at = now()
WHERE (membership_status IS NULL OR membership_status = 'inactive')
  AND (membership_expires_at IS NULL OR membership_expires_at < now())
  AND is_seed = false;
ALTER TABLE public.profiles ENABLE TRIGGER USER;

-- 4) insert_swipe with hard paywall
CREATE OR REPLACE FUNCTION public.insert_swipe(_target_id uuid, _direction text, _first_impression_message text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_super_bal int; v_fi_bal int; v_fi_msg text;
  v_existing record; v_match_id uuid; v_a uuid; v_b uuid;
  v_remaining_super int; v_remaining_fi int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated'); END IF;
  IF v_uid = _target_id THEN RETURN jsonb_build_object('success', false, 'reason', 'self_swipe'); END IF;
  IF _direction NOT IN ('like','pass','super') THEN RETURN jsonb_build_object('success', false, 'reason', 'invalid_direction'); END IF;

  IF NOT public.has_premium_access(v_uid) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'paywall_required');
  END IF;

  v_fi_msg := NULLIF(trim(COALESCE(_first_impression_message, '')), '');
  IF v_fi_msg IS NOT NULL THEN
    v_fi_msg := left(v_fi_msg, 280);
    IF _direction <> 'super' THEN _direction := 'super'; END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.blocked_users WHERE (blocker_id=v_uid AND blocked_id=_target_id) OR (blocker_id=_target_id AND blocked_id=v_uid)) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'blocked');
  END IF;

  SELECT id, direction INTO v_existing FROM public.swipes WHERE swiper_id=v_uid AND swiped_id=_target_id;
  IF v_existing.id IS NOT NULL THEN
    v_a := LEAST(v_uid,_target_id); v_b := GREATEST(v_uid,_target_id);
    SELECT id INTO v_match_id FROM public.matches WHERE user_a=v_a AND user_b=v_b;
    RETURN jsonb_build_object('success',true,'already_swiped',true,'direction',v_existing.direction,'matched',v_match_id IS NOT NULL,'match_id',v_match_id);
  END IF;

  IF v_fi_msg IS NOT NULL THEN
    SELECT first_impression_balance INTO v_fi_bal FROM public.user_credits WHERE user_id=v_uid;
    IF COALESCE(v_fi_bal,0)<=0 THEN RETURN jsonb_build_object('success',false,'reason','insufficient_first_impression'); END IF;
  ELSIF _direction='super' THEN
    SELECT super_like_balance INTO v_super_bal FROM public.user_credits WHERE user_id=v_uid;
    IF COALESCE(v_super_bal,0)<=0 THEN RETURN jsonb_build_object('success',false,'reason','insufficient_super_like'); END IF;
  END IF;

  INSERT INTO public.swipes(swiper_id,swiped_id,direction,first_impression_message)
  VALUES (v_uid,_target_id,_direction::public.swipe_direction,v_fi_msg);

  IF v_fi_msg IS NOT NULL THEN
    UPDATE public.user_credits SET first_impression_balance=first_impression_balance-1, updated_at=now()
    WHERE user_id=v_uid AND first_impression_balance>0 RETURNING first_impression_balance INTO v_remaining_fi;
  ELSIF _direction='super' THEN
    UPDATE public.user_credits SET super_like_balance=super_like_balance-1, updated_at=now()
    WHERE user_id=v_uid AND super_like_balance>0 RETURNING super_like_balance INTO v_remaining_super;
  END IF;

  v_a := LEAST(v_uid,_target_id); v_b := GREATEST(v_uid,_target_id);
  SELECT id INTO v_match_id FROM public.matches WHERE user_a=v_a AND user_b=v_b;
  RETURN jsonb_build_object('success',true,'matched',v_match_id IS NOT NULL,'match_id',v_match_id,
    'remaining_super_likes',v_remaining_super,'remaining_first_impressions',v_remaining_fi);
END $$;

-- 5) Gate messages
DROP POLICY IF EXISTS messages_insert_member ON public.messages;
CREATE POLICY messages_insert_member ON public.messages FOR INSERT
WITH CHECK (auth.uid()=sender_id AND public.is_match_member(match_id,auth.uid()) AND public.has_premium_access(auth.uid()));

-- 6) transition_expired_memberships
CREATE OR REPLACE FUNCTION public.transition_expired_memberships()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_to_grace int:=0; v_to_expired int:=0;
BEGIN
  WITH upd AS (
    UPDATE public.profiles SET membership_status='grace_period',
      membership_expires_at=now()+interval '2 days', updated_at=now()
    WHERE membership_status IN ('active','trialing')
      AND membership_expires_at IS NOT NULL AND membership_expires_at<=now()
    RETURNING id
  ) SELECT count(*) INTO v_to_grace FROM upd;

  WITH upd AS (
    UPDATE public.profiles SET membership_status='expired', membership_tier='free', updated_at=now()
    WHERE membership_status='grace_period'
      AND membership_expires_at IS NOT NULL AND membership_expires_at<=now()
    RETURNING id
  ) SELECT count(*) INTO v_to_expired FROM upd;

  RETURN jsonb_build_object('to_grace',v_to_grace,'to_expired',v_to_expired);
END $$;
GRANT EXECUTE ON FUNCTION public.transition_expired_memberships() TO service_role;

-- 7) Referral tables
CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own referral code" ON public.referral_codes;
CREATE POLICY "own referral code" ON public.referral_codes FOR SELECT USING (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  onboarding_completed_at timestamptz,
  bonus_granted_at timestamptz,
  days_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_id);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own referrals" ON public.referrals;
CREATE POLICY "own referrals" ON public.referrals FOR SELECT USING (auth.uid()=referrer_id OR auth.uid()=referred_id);

-- 8) Referral RPCs
CREATE OR REPLACE FUNCTION public.generate_referral_code(_uid uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_code text; v_existing text; v_try int:=0;
BEGIN
  SELECT code INTO v_existing FROM public.referral_codes WHERE user_id=_uid;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  LOOP
    v_try := v_try+1;
    v_code := upper(substring(md5(random()::text||_uid::text||clock_timestamp()::text) from 1 for 7));
    BEGIN
      INSERT INTO public.referral_codes(user_id,code) VALUES (_uid,v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN IF v_try>8 THEN RAISE; END IF;
    END;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.generate_referral_code(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  RETURN public.generate_referral_code(v_uid);
END $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_my_referral_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_referrer uuid; v_norm text := upper(trim(_code));
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('success',false,'reason','not_authenticated'); END IF;
  IF v_norm IS NULL OR v_norm='' THEN RETURN jsonb_build_object('success',false,'reason','invalid_code'); END IF;
  SELECT user_id INTO v_referrer FROM public.referral_codes WHERE code=v_norm;
  IF v_referrer IS NULL THEN RETURN jsonb_build_object('success',false,'reason','code_not_found'); END IF;
  IF v_referrer=v_uid THEN RETURN jsonb_build_object('success',false,'reason','self_referral'); END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id=v_uid) THEN
    RETURN jsonb_build_object('success',false,'reason','already_referred');
  END IF;
  INSERT INTO public.referrals(referrer_id,referred_id,code) VALUES (v_referrer,v_uid,v_norm);
  RETURN jsonb_build_object('success',true,'referrer_id',v_referrer);
END $$;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_referral_onboarding_complete()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  UPDATE public.referrals SET onboarding_completed_at=COALESCE(onboarding_completed_at,now())
   WHERE referred_id=v_uid;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_referral_onboarding_complete() TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_referral_bonus(_referred_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref record; v_count int; v_bonus int:=7; v_max int:=5;
BEGIN
  SELECT * INTO v_ref FROM public.referrals WHERE referred_id=_referred_id AND bonus_granted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('granted',false,'reason','no_pending_referral'); END IF;
  SELECT count(*) INTO v_count FROM public.referrals WHERE referrer_id=v_ref.referrer_id AND bonus_granted_at IS NOT NULL AND days_awarded>0;
  IF v_count >= v_max THEN
    UPDATE public.referrals SET bonus_granted_at=now(), days_awarded=0 WHERE id=v_ref.id;
    RETURN jsonb_build_object('granted',false,'reason','cap_reached');
  END IF;
  UPDATE public.profiles
     SET membership_expires_at=GREATEST(COALESCE(membership_expires_at,now()),now())+(v_bonus||' days')::interval,
         updated_at=now()
   WHERE id=v_ref.referrer_id;
  UPDATE public.referrals SET bonus_granted_at=now(), days_awarded=v_bonus WHERE id=v_ref.id;
  RETURN jsonb_build_object('granted',true,'days',v_bonus,'referrer_id',v_ref.referrer_id);
END $$;
GRANT EXECUTE ON FUNCTION public.grant_referral_bonus(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_referral_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text; v_completed int; v_pending int; v_days int;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object(); END IF;
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id=v_uid;
  SELECT
    count(*) FILTER (WHERE bonus_granted_at IS NOT NULL AND days_awarded>0),
    count(*) FILTER (WHERE bonus_granted_at IS NULL),
    COALESCE(sum(days_awarded),0)
  INTO v_completed, v_pending, v_days FROM public.referrals WHERE referrer_id=v_uid;
  RETURN jsonb_build_object('code',v_code,'completed',v_completed,'pending',v_pending,
    'days_earned',v_days,'max_referrals',5,'days_per_referral',7);
END $$;
GRANT EXECUTE ON FUNCTION public.get_my_referral_summary() TO authenticated;
