ALTER TABLE public.boost_audit_log DROP CONSTRAINT IF EXISTS boost_audit_log_event_check;
ALTER TABLE public.boost_audit_log ADD CONSTRAINT boost_audit_log_event_check
  CHECK (event = ANY (ARRAY[
    'refill_daily','refill_weekly','consume','consume_failed','refill_skipped',
    'purchase','welcome_bonus','grant'
  ]));