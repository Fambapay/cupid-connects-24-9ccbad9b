ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS fcm_token text,
  ADD COLUMN IF NOT EXISTS platform text;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

CREATE INDEX IF NOT EXISTS push_subscriptions_fcm_token_idx
  ON public.push_subscriptions(fcm_token)
  WHERE fcm_token IS NOT NULL;