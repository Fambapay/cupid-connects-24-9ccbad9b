
CREATE TABLE public.checkout_currency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES public.debito_payments(id) ON DELETE SET NULL,
  checkout_country text NOT NULL,
  profile_country text,
  host text,
  cf_ipcountry text,
  currency text NOT NULL,
  payment_method text NOT NULL,
  amount numeric NOT NULL,
  mismatch boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.checkout_currency_events TO authenticated;
GRANT ALL ON public.checkout_currency_events TO service_role;

ALTER TABLE public.checkout_currency_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read currency events"
ON public.checkout_currency_events FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_cce_user ON public.checkout_currency_events(user_id, created_at DESC);
CREATE INDEX idx_cce_mismatch ON public.checkout_currency_events(mismatch, created_at DESC) WHERE mismatch = true;
