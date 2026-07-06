CREATE OR REPLACE FUNCTION public.set_passport(
  _city text,
  _lat double precision,
  _lng double precision
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier text;
  v_status text;
  v_exp timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthenticated');
  END IF;

  SELECT membership_tier, membership_status, membership_expires_at
    INTO v_tier, v_status, v_exp
  FROM profiles WHERE id = v_uid;

  IF v_tier <> 'elite'
     OR v_status NOT IN ('active','trialing','grace_period')
     OR (v_exp IS NOT NULL AND v_exp < now()) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'tier_required');
  END IF;

  IF _lat IS NULL OR _lng IS NULL OR _city IS NULL OR trim(_city) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_input');
  END IF;

  UPDATE profiles
     SET passport_city = trim(_city),
         passport_lat = _lat,
         passport_lng = _lng,
         passport_expires_at = now() + interval '24 hours',
         updated_at = now()
   WHERE id = v_uid;

  RETURN jsonb_build_object(
    'success', true,
    'city', trim(_city),
    'expires_at', (now() + interval '24 hours')
  );
END;
$$;