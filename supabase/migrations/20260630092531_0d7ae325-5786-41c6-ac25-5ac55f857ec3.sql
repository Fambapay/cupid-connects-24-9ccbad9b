
-- Unified payment history (forward-compatible with Google Play, Apple IAP, M-Pesa, e-Mola, etc.)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN (
    'debito_mpesa','debito_emola','debito_mkesh','debito_card','debito_payfast',
    'google_play','apple_iap','manual'
  )),
  kind text NOT NULL CHECK (kind IN ('subscription','credit_pack','one_time')),
  plan_tier text CHECK (plan_tier IS NULL OR plan_tier IN ('select','plus','elite')),
  pack_id text,
  pack_kind text CHECK (pack_kind IS NULL OR pack_kind IN ('boost','super_like')),
  pack_quantity integer,
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'MZN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  external_transaction_id text,
  external_receipt text,
  renewal_at timestamptz,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own payment transactions"
  ON public.payment_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_payment_tx_user_created ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tx_external ON public.payment_transactions(external_transaction_id);

CREATE TRIGGER trg_payment_tx_touch
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Unified history for the current user (debito + new providers).
CREATE OR REPLACE FUNCTION public.get_my_payment_history(_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  unified AS (
    SELECT
      d.id,
      'debito_' || d.payment_method AS provider,
      CASE WHEN d.kind = 'plan' THEN 'subscription' ELSE 'credit_pack' END AS kind,
      d.plan_tier,
      d.pack_id,
      d.pack_kind,
      d.pack_quantity,
      (d.amount * 100)::int AS amount_minor,
      d.currency,
      d.status,
      d.debito_transaction_id AS external_transaction_id,
      d.created_at,
      d.completed_at
    FROM public.debito_payments d
    WHERE d.user_id = (SELECT uid FROM me)
    UNION ALL
    SELECT
      t.id, t.provider, t.kind, t.plan_tier, t.pack_id, t.pack_kind, t.pack_quantity,
      t.amount_minor, t.currency, t.status, t.external_transaction_id,
      t.created_at, t.completed_at
    FROM public.payment_transactions t
    WHERE t.user_id = (SELECT uid FROM me)
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(o) ORDER BY o.created_at DESC), '[]'::jsonb)
  FROM (SELECT * FROM unified ORDER BY created_at DESC LIMIT _limit) o;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_payment_history(int) TO authenticated;
