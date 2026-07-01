ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS device_key text;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_client_id_idx
  ON public.push_subscriptions(user_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_device_key_idx
  ON public.push_subscriptions(user_id, device_key)
  WHERE device_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_client_id_unique
  ON public.push_subscriptions(user_id, client_id)
  WHERE client_id IS NOT NULL;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        user_id,
        COALESCE(
          device_key,
          client_id,
          CASE
            WHEN endpoint LIKE 'https://web.push.apple.com/%'
              THEN 'legacy-apple-web-push:' || COALESCE(NULLIF(user_agent, ''), 'unknown')
            ELSE endpoint
          END
        )
      ORDER BY last_used_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.push_subscriptions
  WHERE COALESCE(p256dh, '') <> ''
    AND COALESCE(auth, '') <> ''
)
DELETE FROM public.push_subscriptions p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('new_match', 'new_message', 'new_like', 'promo')),
  event_id text,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'sent', 'emailed', 'skipped', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.notification_deliveries TO service_role;

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS notification_deliveries_touch_updated_at ON public.notification_deliveries;
CREATE TRIGGER notification_deliveries_touch_updated_at
  BEFORE UPDATE ON public.notification_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS notification_deliveries_user_kind_idx
  ON public.notification_deliveries(user_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS notification_deliveries_event_id_idx
  ON public.notification_deliveries(event_id)
  WHERE event_id IS NOT NULL;