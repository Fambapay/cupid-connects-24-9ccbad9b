
ALTER TABLE public.debito_payments
  ADD COLUMN IF NOT EXISTS offer_slug text;

CREATE INDEX IF NOT EXISTS idx_debito_payments_offer_slug
  ON public.debito_payments (offer_slug) WHERE offer_slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.winback_candidates(_slug text, _days int)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.profiles p
  WHERE p.membership_status IN ('expired', 'cancelled', 'inactive')
    AND p.membership_expires_at IS NOT NULL
    AND p.membership_expires_at::date = (now() - make_interval(days => _days))::date
    AND NOT EXISTS (
      SELECT 1 FROM public.winback_pushes w
      WHERE w.user_id = p.id AND w.slug = _slug
    );
$$;

REVOKE ALL ON FUNCTION public.winback_candidates(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.winback_candidates(text, int) TO service_role;
