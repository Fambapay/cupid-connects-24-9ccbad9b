CREATE OR REPLACE FUNCTION public.activate_membership_debito(_user_id uuid, _plan_tier text, _days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    is_verified = true,
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
$function$;