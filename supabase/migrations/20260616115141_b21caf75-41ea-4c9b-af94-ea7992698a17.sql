-- Prevent duplicate debito_payments rows for same provider source_id (race-condition guard)
-- Deduplicate any pre-existing duplicates first (keep oldest row per source_id)
DELETE FROM public.debito_payments a
USING public.debito_payments b
WHERE a.source_id = b.source_id
  AND a.created_at > b.created_at;

ALTER TABLE public.debito_payments
  ADD CONSTRAINT debito_payments_source_id_key UNIQUE (source_id);