
CREATE OR REPLACE FUNCTION public.credit_pack_debito(_user_id uuid, _pack_kind text, _quantity integer, _amount_minor integer, _currency text, _source_id text, _debito_payment_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_key text := 'debito_' || _source_id;
  already boolean;
  v_grant_bonus boolean := false;
  v_tier text;
  v_bal_after int;
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

  SELECT membership_tier INTO v_tier FROM profiles WHERE id = _user_id;

  IF _pack_kind = 'boost' THEN
    UPDATE user_credits SET boost_balance = boost_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id
    RETURNING boost_balance INTO v_bal_after;

    INSERT INTO boost_audit_log(user_id, event, tier, delta, balance_after, meta)
    VALUES (_user_id, 'purchase', v_tier, _quantity, v_bal_after,
            jsonb_build_object(
              'source', 'debito',
              'source_id', _source_id,
              'debito_payment_id', _debito_payment_id,
              'amount_minor', _amount_minor,
              'currency', COALESCE(_currency,'MZN')
            ));
  ELSE
    UPDATE user_credits SET super_like_balance = super_like_balance + _quantity, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  -- One-time welcome Boost: only if not yet granted
  SELECT welcome_bonus_granted_at IS NULL INTO v_grant_bonus
  FROM profiles WHERE id = _user_id;

  IF v_grant_bonus THEN
    UPDATE user_credits SET boost_balance = boost_balance + 1, updated_at = now()
    WHERE user_id = _user_id
    RETURNING boost_balance INTO v_bal_after;
    UPDATE profiles SET welcome_bonus_granted_at = now() WHERE id = _user_id;

    INSERT INTO boost_audit_log(user_id, event, tier, delta, balance_after, meta)
    VALUES (_user_id, 'welcome_bonus', v_tier, 1, v_bal_after,
            jsonb_build_object('source', 'debito_first_purchase', 'source_id', _source_id));
  END IF;

  RETURN jsonb_build_object(
    'credited', true,
    'quantity', _quantity,
    'welcome_bonus', v_grant_bonus
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_credits(_user_id uuid, _pack_kind text, _quantity integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tier text;
  v_bal_after int;
BEGIN
  INSERT INTO public.user_credits(user_id) VALUES (_user_id) ON CONFLICT DO NOTHING;
  IF _pack_kind = 'boost' THEN
    UPDATE public.user_credits SET boost_balance = boost_balance + _quantity WHERE user_id = _user_id
    RETURNING boost_balance INTO v_bal_after;

    SELECT membership_tier INTO v_tier FROM public.profiles WHERE id = _user_id;
    INSERT INTO public.boost_audit_log(user_id, event, tier, delta, balance_after, meta)
    VALUES (_user_id, 'grant', v_tier, _quantity, v_bal_after,
            jsonb_build_object('source', 'grant_credits'));
  ELSIF _pack_kind = 'super_like' THEN
    UPDATE public.user_credits SET super_like_balance = super_like_balance + _quantity WHERE user_id = _user_id;
  ELSE
    RAISE EXCEPTION 'invalid_pack_kind';
  END IF;
  RETURN jsonb_build_object('credited', true, 'quantity', _quantity);
END $function$;
