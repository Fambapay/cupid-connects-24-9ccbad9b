DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  UPDATE public.profiles
     SET membership_tier = 'elite',
         membership_status = 'trialing',
         membership_expires_at = now() + interval '3 days',
         updated_at = now()
   WHERE COALESCE(is_seed, false) = false;
END $$;