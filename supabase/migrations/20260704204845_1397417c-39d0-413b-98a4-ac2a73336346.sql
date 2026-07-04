CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.google_play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  message_id text UNIQUE,
  package_name text,
  event_type text,
  purchase_token text,
  product_id text,
  subscription_id text,
  notification_type integer,
  raw_payload jsonb NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending_integration',
  processing_error text,
  matched_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.google_play_events TO authenticated;
GRANT ALL ON public.google_play_events TO service_role;

ALTER TABLE public.google_play_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read google play events"
  ON public.google_play_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_google_play_events_purchase_token ON public.google_play_events(purchase_token);
CREATE INDEX idx_google_play_events_status ON public.google_play_events(processing_status, received_at DESC);

CREATE TRIGGER trg_google_play_events_updated_at
  BEFORE UPDATE ON public.google_play_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();