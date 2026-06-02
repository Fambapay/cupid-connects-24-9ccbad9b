
-- Membership fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'inactive'
    CHECK (membership_status IN ('inactive','active','cancelled','expired')),
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

-- credit_purchases table
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_kind text NOT NULL CHECK (pack_kind IN ('boost','super_like')),
  quantity integer NOT NULL CHECK (quantity > 0),
  amount_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'MZN',
  stripe_session_id text NOT NULL UNIQUE,
  stripe_payment_intent text,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.credit_purchases TO authenticated;
GRANT ALL ON public.credit_purchases TO service_role;

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchases_select_own" ON public.credit_purchases
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- debito_payments table
CREATE TABLE IF NOT EXISTS public.debito_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'plan' CHECK (kind IN ('plan','pack')),
  plan_tier text CHECK (plan_tier IS NULL OR plan_tier IN ('select','plus','elite')),
  pack_id text,
  pack_kind text CHECK (pack_kind IS NULL OR pack_kind IN ('boost','super_like')),
  pack_quantity integer,
  payment_method text NOT NULL
    CHECK (payment_method IN ('mpesa','emola','mkesh','visa_mastercard','payfast')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'MZN',
  phone_hash text,
  phone_last4 text,
  customer_email text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','success','failed','cancelled')),
  debito_payment_id text,
  debito_reference text,
  debito_transaction_id text,
  checkout_url text,
  source_id text NOT NULL DEFAULT gen_random_uuid()::text,
  raw_response jsonb,
  raw_webhook jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT debito_payments_kind_fields_check CHECK (
    (kind = 'plan' AND plan_tier IS NOT NULL)
    OR (kind = 'pack' AND pack_id IS NOT NULL AND pack_kind IS NOT NULL AND pack_quantity > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_debito_payments_user      ON public.debito_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_debito_payments_source_id ON public.debito_payments(source_id);
CREATE INDEX IF NOT EXISTS idx_debito_payments_debito_id ON public.debito_payments(debito_payment_id);
CREATE INDEX IF NOT EXISTS idx_debito_payments_reference ON public.debito_payments(debito_reference);

GRANT ALL ON public.debito_payments TO service_role;
-- Column-level grant: hide sensitive payloads from clients
GRANT SELECT (
  id, user_id, kind, plan_tier, pack_id, pack_kind, pack_quantity,
  payment_method, amount, currency, phone_last4, customer_email,
  status, debito_payment_id, debito_reference, debito_transaction_id,
  checkout_url, source_id, completed_at, created_at, updated_at
) ON public.debito_payments TO authenticated;

ALTER TABLE public.debito_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debito_select_own" ON public.debito_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_debito_payments_updated_at
  BEFORE UPDATE ON public.debito_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RPC: credit_pack_debito (idempotent)
CREATE OR REPLACE FUNCTION public.credit_pack_debito(
  _user_id uuid, _pack_kind text, _quantity integer,
  _amount_minor integer, _currency text,
  _source_id text, _debito_payment_id text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_session_key text := 'debito_' || _source_id;
  already boolean;
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

  RETURN jsonb_build_object('credited', true, 'quantity', _quantity);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_pack_debito(uuid,text,integer,integer,text,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_pack_debito(uuid,text,integer,integer,text,text,text)
  TO service_role;

-- RPC: activate_membership_debito (stack-able)
CREATE OR REPLACE FUNCTION public.activate_membership_debito(
  _user_id uuid, _plan_tier text, _days integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_new_expiry timestamptz;
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
  RETURN jsonb_build_object('activated', true, 'expires_at', v_new_expiry);
END;
$$;

REVOKE ALL ON FUNCTION public.activate_membership_debito(uuid,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_membership_debito(uuid,text,integer)
  TO service_role;
