
-- Block privilege escalation on profiles UPDATE.
-- Only service_role (webhooks, admin server fns) may change billing/verification fields.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses (used by debito-webhook, admin functions)
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.membership_tier        IS DISTINCT FROM OLD.membership_tier        OR
     NEW.membership_status      IS DISTINCT FROM OLD.membership_status      OR
     NEW.membership_expires_at  IS DISTINCT FROM OLD.membership_expires_at  OR
     NEW.is_verified            IS DISTINCT FROM OLD.is_verified            OR
     NEW.is_seed                IS DISTINCT FROM OLD.is_seed                OR
     NEW.seed_active            IS DISTINCT FROM OLD.seed_active            OR
     NEW.welcome_bonus_granted_at IS DISTINCT FROM OLD.welcome_bonus_granted_at
  THEN
    RAISE EXCEPTION 'Forbidden: cannot modify privileged profile fields';
  END IF;

  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_prevent_priv_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_priv_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_escalation();
