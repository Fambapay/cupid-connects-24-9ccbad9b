ALTER TABLE public.debito_payments
  ADD COLUMN IF NOT EXISTS billing_period text,
  ADD COLUMN IF NOT EXISTS plan_days integer;

ALTER TABLE public.debito_payments
  DROP CONSTRAINT IF EXISTS debito_payments_billing_period_check;

ALTER TABLE public.debito_payments
  ADD CONSTRAINT debito_payments_billing_period_check
  CHECK (billing_period IS NULL OR billing_period IN ('monthly','annual'));