-- ============================================================
-- Push notifications infrastructure
-- ============================================================

-- Enable pg_net for async HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ----------------------------
-- push_subscriptions
-- ----------------------------
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_subs_user ON public.push_subscriptions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_select_own ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_subs_insert_own ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY push_subs_update_own ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY push_subs_delete_own ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ----------------------------
-- notification_preferences
-- ----------------------------
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  notify_match boolean NOT NULL DEFAULT true,
  notify_message boolean NOT NULL DEFAULT true,
  notify_like boolean NOT NULL DEFAULT true,
  notify_promo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_prefs_select_own ON public.notification_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notif_prefs_insert_own ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY notif_prefs_update_own ON public.notification_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER notif_prefs_touch_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create prefs row when a profile is created
CREATE OR REPLACE FUNCTION public.create_notification_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences(user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER create_notif_prefs_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_prefs();

-- Backfill existing profiles
INSERT INTO public.notification_preferences(user_id)
  SELECT id FROM public.profiles
  ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------
-- Helper: notify_webhook(kind, payload)
-- Reads webhook URL + secret from app_config (so we don't hardcode).
-- ----------------------------
CREATE OR REPLACE FUNCTION public.dispatch_notification(_kind text, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_body jsonb;
BEGIN
  SELECT value::text INTO v_url FROM public.app_config WHERE key = 'notify_webhook_url';
  SELECT value::text INTO v_secret FROM public.app_config WHERE key = 'notify_webhook_secret';
  v_url := trim(both '"' from COALESCE(v_url, ''));
  v_secret := trim(both '"' from COALESCE(v_secret, ''));
  IF v_url = '' OR v_secret = '' THEN
    RETURN;
  END IF;
  v_body := jsonb_build_object('kind', _kind, 'data', _payload);
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret
    ),
    body := v_body
  );
EXCEPTION WHEN OTHERS THEN
  -- never block the trigger on webhook failure
  RAISE WARNING 'dispatch_notification failed: %', SQLERRM;
END $$;

-- ----------------------------
-- Trigger: new match
-- ----------------------------
CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.dispatch_notification(
    'new_match',
    jsonb_build_object(
      'match_id', NEW.id,
      'user_a', NEW.user_a,
      'user_b', NEW.user_b
    )
  );
  RETURN NEW;
END $$;

CREATE TRIGGER notify_match_after_insert
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_match();

-- ----------------------------
-- Trigger: new message
-- ----------------------------
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.dispatch_notification(
    'new_message',
    jsonb_build_object(
      'message_id', NEW.id,
      'match_id', NEW.match_id,
      'sender_id', NEW.sender_id,
      'preview', left(NEW.content, 80)
    )
  );
  RETURN NEW;
END $$;

CREATE TRIGGER notify_message_after_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();

-- ----------------------------
-- Trigger: new like (super-like always notifies; normal like only if reciprocal triggers match anyway)
-- ----------------------------
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction IN ('like', 'super') THEN
    PERFORM public.dispatch_notification(
      'new_like',
      jsonb_build_object(
        'swipe_id', NEW.id,
        'swiper_id', NEW.swiper_id,
        'swiped_id', NEW.swiped_id,
        'is_super', NEW.direction = 'super'
      )
    );
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER notify_like_after_insert
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();
