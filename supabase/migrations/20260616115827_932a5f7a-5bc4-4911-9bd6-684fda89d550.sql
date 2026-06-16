-- Revoke client visibility of customer_email (PII not needed on the client)
REVOKE SELECT ON public.debito_payments FROM authenticated;
GRANT SELECT (
  id, user_id, kind, plan_tier, pack_id, pack_kind, pack_quantity,
  payment_method, amount, currency, phone_last4,
  status, debito_payment_id, debito_reference, debito_transaction_id,
  checkout_url, source_id, completed_at, created_at, updated_at
) ON public.debito_payments TO authenticated;