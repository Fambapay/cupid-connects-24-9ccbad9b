-- Activity tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS welcome_bonus_granted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at
  ON public.profiles (last_active_at DESC NULLS LAST);

-- Heartbeat RPC: any authenticated user bumps their own last_active_at.
CREATE OR REPLACE FUNCTION public.touch_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_active_at = now() WHERE id = auth.uid();
END $$;

-- Replace credit_pack_debito so it also issues the one-time welcome Boost.
CREATE OR REPLACE FUNCTION public.credit_pack_debito(
  _user_id uuid, _pack_kind text, _quantity integer,
  _amount_minor integer, _currency text,
  _source_id text, _debito_payment_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_key text := 'debito_' || _source_id;
  already boolean;
  v_grant_bonus boolean := false;
BEGIN
  IF _pack_kind NOT IN ('boost','super_like') THEN RAISE EXCEPTION 'Invalid pack_kind'; END IF;
  IF _quantity <= 0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;

  SELECT EXISTS(SELECT 1 FROM credit_purchases WHERE stripe_session_id = v_session_key) INTO already;
  IF already THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_processed');
  END IF;

  INSERT INTO credit_purchases(user_id, pack_kind, quantity, amount_minor, currency,
                               stripe_session_id, stripe_payment_intent, status)
  VALUES (_user_id, _pack_kind, _quantity, _amount_minor, COALESCE(_currency,'MZN'),
          v_session_key, _debito_payment_id, 'paid');

  INSERT INTO user_credits(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;

  IF _pack_kind = 'boost' THEN
    UPDATE user_credits SET boost_balance = boost_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    UPDATE user_credits SET super_like_balance = super_like_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  -- One-time welcome Boost: only if not yet granted
  SELECT welcome_bonus_granted_at IS NULL INTO v_grant_bonus
  FROM profiles WHERE id = _user_id;

  IF v_grant_bonus THEN
    UPDATE user_credits SET boost_balance = boost_balance + 1, updated_at = now()
    WHERE user_id = _user_id;
    UPDATE profiles SET welcome_bonus_granted_at = now() WHERE id = _user_id;
  END IF;

  RETURN jsonb_build_object(
    'credited', true,
    'quantity', _quantity,
    'welcome_bonus', v_grant_bonus
  );
END;
$$;

-- Same idea for membership activation (welcome Boost on first paid plan).
CREATE OR REPLACE FUNCTION public.activate_membership_debito(
  _user_id uuid, _plan_tier text, _days integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_expiry timestamptz;
  v_grant_bonus boolean := false;
BEGIN
  IF _days <= 0 THEN RAISE EXCEPTION 'Invalid days'; END IF;

  UPDATE public.profiles SET
    membership_status = 'active',
    membership_tier = _plan_tier,
    membership_expires_at = GREATEST(COALESCE(membership_expires_at, now()), now())
                            + (_days || ' days')::interval,
    updated_at = now()
  WHERE id = _user_id
  RETURNING membership_expires_at INTO v_new_expiry;

  IF v_new_expiry IS NULL THEN
    RETURN jsonb_build_object('activated', false, 'reason', 'profile_not_found');
  END IF;

  SELECT welcome_bonus_granted_at IS NULL INTO v_grant_bonus
  FROM profiles WHERE id = _user_id;

  IF v_grant_bonus THEN
    INSERT INTO user_credits(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_credits SET boost_balance = boost_balance + 1, updated_at = now()
    WHERE user_id = _user_id;
    UPDATE profiles SET welcome_bonus_granted_at = now() WHERE id = _user_id;
  END IF;

  RETURN jsonb_build_object(
    'activated', true,
    'expires_at', v_new_expiry,
    'welcome_bonus', v_grant_bonus
  );
END;
$$;
