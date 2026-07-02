
-- ================================================================
-- OFFERS: catálogo de ofertas promocionais
-- ================================================================

DO $$ BEGIN
  CREATE TYPE public.offer_trigger AS ENUM (
    'trial_day_2',
    'trial_last_24h',
    'post_first_match',
    'likes_received',
    'winback_day_7',
    'winback_day_14',
    'always_on'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  trigger public.offer_trigger NOT NULL,
  plan_tier text NOT NULL DEFAULT 'plus',
  first_period_price_minor integer NOT NULL, -- em minor units MZN (149 MZN = 14900)
  regular_price_minor integer NOT NULL,
  currency text NOT NULL DEFAULT 'MZN',
  period_months integer NOT NULL DEFAULT 1,
  is_discount boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_read_active" ON public.offers
  FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "offers_admin_all" ON public.offers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER offers_touch_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================================================================
-- OFFER_REDEMPTIONS: UM desconto por conta, para sempre
-- ================================================================

CREATE TABLE IF NOT EXISTS public.offer_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id),
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','paid','released')),
  payment_ref jsonb,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  released_at timestamptz,
  CONSTRAINT offer_redemptions_one_per_user UNIQUE (user_id)
);

GRANT SELECT ON public.offer_redemptions TO authenticated;
GRANT ALL ON public.offer_redemptions TO service_role;

ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemptions_read_own" ON public.offer_redemptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "redemptions_admin_read" ON public.offer_redemptions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ================================================================
-- POPUP_IMPRESSIONS: analytics + frequency cap
-- ================================================================

CREATE TABLE IF NOT EXISTS public.popup_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  shown_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL DEFAULT 'shown' CHECK (action IN ('shown','dismissed','clicked_cta'))
);

CREATE INDEX IF NOT EXISTS idx_popup_impressions_user_day
  ON public.popup_impressions (user_id, shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_popup_impressions_user_offer
  ON public.popup_impressions (user_id, offer_id, action);

GRANT SELECT, INSERT ON public.popup_impressions TO authenticated;
GRANT ALL ON public.popup_impressions TO service_role;

ALTER TABLE public.popup_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impressions_read_own" ON public.popup_impressions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "impressions_insert_own" ON public.popup_impressions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "impressions_admin_read" ON public.popup_impressions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ================================================================
-- WINBACK_PUSHES: idempotência dos pushes de recuperação
-- ================================================================

CREATE TABLE IF NOT EXISTS public.winback_pushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT winback_pushes_unique UNIQUE (user_id, slug)
);

GRANT SELECT ON public.winback_pushes TO authenticated;
GRANT ALL ON public.winback_pushes TO service_role;

ALTER TABLE public.winback_pushes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "winback_read_own" ON public.winback_pushes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ================================================================
-- RPC: get_eligible_offer(_trigger)
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_eligible_offer(_trigger public.offer_trigger)
RETURNS SETOF public.offers
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now());
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Já resgatou um desconto (paid ou reserved recente) → sem mais ofertas de desconto
  IF EXISTS (
    SELECT 1 FROM public.offer_redemptions
    WHERE user_id = v_uid
      AND status IN ('reserved','paid')
  ) THEN
    RETURN;
  END IF;

  -- Já é premium ativo/trial/grace → não mostrar ofertas
  IF public.has_premium_access(v_uid) AND _trigger <> 'always_on' THEN
    RETURN;
  END IF;

  -- Cap: máximo 2 pop-ups comerciais mostrados hoje (excepto always_on)
  IF _trigger <> 'always_on' THEN
    IF (
      SELECT count(*) FROM public.popup_impressions
      WHERE user_id = v_uid
        AND action = 'shown'
        AND shown_at >= v_today_start
    ) >= 2 THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT o.*
  FROM public.offers o
  WHERE o.trigger = _trigger
    AND o.active = true
    AND (
      _trigger = 'always_on'
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.popup_impressions pi
          WHERE pi.user_id = v_uid
            AND pi.offer_id = o.id
            AND pi.action = 'shown'
            AND pi.shown_at >= v_today_start
        )
        AND (
          SELECT count(*) FROM public.popup_impressions pi2
          WHERE pi2.user_id = v_uid
            AND pi2.offer_id = o.id
            AND pi2.action = 'dismissed'
        ) < 2
      )
    )
  ORDER BY o.priority DESC
  LIMIT 1;
END $$;

GRANT EXECUTE ON FUNCTION public.get_eligible_offer(public.offer_trigger) TO authenticated;

-- ================================================================
-- RPC: redeem_offer(_offer_id) — reserva o desconto no checkout
-- ================================================================

CREATE OR REPLACE FUNCTION public.redeem_offer(_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_offer public.offers%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_offer FROM public.offers WHERE id = _offer_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'offer_not_found');
  END IF;

  IF v_offer.is_discount THEN
    BEGIN
      INSERT INTO public.offer_redemptions (user_id, offer_id, slug, status)
      VALUES (v_uid, _offer_id, v_offer.slug, 'reserved');
    EXCEPTION WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'error', 'already_redeemed');
    END;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'slug', v_offer.slug,
    'plan_tier', v_offer.plan_tier,
    'amount_minor', v_offer.first_period_price_minor,
    'regular_price_minor', v_offer.regular_price_minor,
    'currency', v_offer.currency,
    'period_months', v_offer.period_months
  );
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_offer(uuid) TO authenticated;

-- ================================================================
-- RPC: mark_offer_paid — chamada pelo webhook de pagamento
-- ================================================================

CREATE OR REPLACE FUNCTION public.mark_offer_paid(_user_id uuid, _slug text, _payment_ref jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.offer_redemptions
     SET status = 'paid',
         paid_at = now(),
         payment_ref = COALESCE(_payment_ref, payment_ref)
   WHERE user_id = _user_id AND slug = _slug AND status = 'reserved';
END $$;

REVOKE ALL ON FUNCTION public.mark_offer_paid(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_offer_paid(uuid, text, jsonb) TO service_role;

-- ================================================================
-- RPC: release_offer_redemption — pagamento falhou/expirou
-- ================================================================

CREATE OR REPLACE FUNCTION public.release_offer_redemption(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.offer_redemptions
   WHERE user_id = _user_id AND status = 'reserved';
END $$;

REVOKE ALL ON FUNCTION public.release_offer_redemption(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_offer_redemption(uuid) TO service_role;

-- ================================================================
-- RPC: log_popup_impression
-- ================================================================

CREATE OR REPLACE FUNCTION public.log_popup_impression(_offer_id uuid, _action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  IF _action NOT IN ('shown','dismissed','clicked_cta') THEN RETURN; END IF;
  INSERT INTO public.popup_impressions (user_id, offer_id, action)
  VALUES (v_uid, _offer_id, _action);
END $$;

GRANT EXECUTE ON FUNCTION public.log_popup_impression(uuid, text) TO authenticated;

-- ================================================================
-- RPC: mark_winback_sent
-- ================================================================

CREATE OR REPLACE FUNCTION public.mark_winback_sent(_user_id uuid, _slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.winback_pushes (user_id, slug) VALUES (_user_id, _slug);
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
END $$;

REVOKE ALL ON FUNCTION public.mark_winback_sent(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_winback_sent(uuid, text) TO service_role;

-- ================================================================
-- RPC: get_match_messages — corpo mascarado para users locked
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_match_messages(_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_premium boolean;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF NOT public.is_match_member(_match_id, v_uid) THEN
    RETURN '[]'::jsonb;
  END IF;

  v_has_premium := public.has_premium_access(v_uid);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'match_id', m.match_id,
    'sender_id', m.sender_id,
    'content', CASE WHEN v_has_premium OR m.sender_id = v_uid THEN m.content ELSE NULL END,
    'has_content', true,
    'is_locked', NOT v_has_premium AND m.sender_id <> v_uid,
    'is_first_impression', m.is_first_impression,
    'created_at', m.created_at
  ) ORDER BY m.created_at ASC), '[]'::jsonb)
  INTO v_result
  FROM public.messages m
  WHERE m.match_id = _match_id;

  RETURN v_result;
END $$;

GRANT EXECUTE ON FUNCTION public.get_match_messages(uuid) TO authenticated;

-- Preview mascarada para a lista de conversas
CREATE OR REPLACE FUNCTION public.get_message_preview(_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_premium boolean;
  v_msg record;
BEGIN
  IF v_uid IS NULL OR NOT public.is_match_member(_match_id, v_uid) THEN
    RETURN NULL;
  END IF;
  v_has_premium := public.has_premium_access(v_uid);
  SELECT id, sender_id, content, created_at INTO v_msg
    FROM public.messages
   WHERE match_id = _match_id
   ORDER BY created_at DESC LIMIT 1;
  IF v_msg.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'id', v_msg.id,
    'sender_id', v_msg.sender_id,
    'content', CASE WHEN v_has_premium OR v_msg.sender_id = v_uid THEN v_msg.content ELSE NULL END,
    'is_locked', NOT v_has_premium AND v_msg.sender_id <> v_uid,
    'created_at', v_msg.created_at
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_message_preview(uuid) TO authenticated;

-- ================================================================
-- VIEW: offer_funnel (só admins)
-- ================================================================

CREATE OR REPLACE VIEW public.offer_funnel
WITH (security_invoker = on) AS
SELECT
  o.slug,
  o.title,
  o.trigger,
  COUNT(pi.id) FILTER (WHERE pi.action = 'shown')       AS shown,
  COUNT(pi.id) FILTER (WHERE pi.action = 'clicked_cta') AS clicked,
  COUNT(DISTINCT r.user_id)                              AS redeemed,
  COUNT(DISTINCT r.user_id) FILTER (WHERE r.status = 'paid') AS paid
FROM public.offers o
LEFT JOIN public.popup_impressions pi ON pi.offer_id = o.id
LEFT JOIN public.offer_redemptions r ON r.offer_id = o.id
GROUP BY o.slug, o.title, o.trigger, o.priority
ORDER BY o.priority DESC;

GRANT SELECT ON public.offer_funnel TO authenticated;

-- ================================================================
-- SEED: catálogo inicial de ofertas
-- ================================================================

INSERT INTO public.offers (slug, title, description, trigger, plan_tier, first_period_price_minor, regular_price_minor, currency, period_months, is_discount, priority, bullets) VALUES
  ('launch_149',    'Oferta de lançamento', 'Premium por 149 MZN no 1º mês. Só durante o teu trial.',              'trial_day_2',      'plus', 14900, 19900, 'MZN', 1, true,  10, '["Likes ilimitados","Vê quem gostou de ti","Conversa sem limites"]'::jsonb),
  ('match_149',     'Não percas isto',      'Conversas como esta não esperam. Premium por 149 MZN no 1º mês.',    'post_first_match', 'plus', 14900, 19900, 'MZN', 1, true,  20, '["Likes ilimitados","Vê quem gostou de ti","Conversa sem limites"]'::jsonb),
  ('likes_149',     'Gostaram de ti',       'Vê sempre quem gostou de ti. Premium por 149 MZN no 1º mês.',        'likes_received',   'plus', 14900, 19900, 'MZN', 1, true,  20, '["Vê quem gostou de ti","Likes ilimitados","Conversa sem limites"]'::jsonb),
  ('lastchance_99', 'Última oportunidade',  'Premium por 99 MZN no 1º mês. Só até o teu trial terminar.',         'trial_last_24h',   'plus',  9900, 19900, 'MZN', 1, true, 100, '["Likes ilimitados","Vê quem gostou de ti","Conversa sem limites"]'::jsonb),
  ('winback7_99',   'Volta ao Hunie',       'As tuas conversas estão à tua espera. 99 MZN no 1º mês.',            'winback_day_7',    'plus',  9900, 19900, 'MZN', 1, true,  50, '["Retoma conversas paradas","Vê quem gostou de ti","Likes ilimitados"]'::jsonb),
  ('winback14_99',  'Última chamada',       'Esta é a última oferta que vais receber. 99 MZN no 1º mês.',         'winback_day_14',   'plus',  9900, 19900, 'MZN', 1, true,  50, '["Retoma conversas paradas","Vê quem gostou de ti","Likes ilimitados"]'::jsonb),
  ('quarterly_499', 'Plano trimestral',     '3 meses por 499 MZN (poupas 98 MZN).',                               'always_on',        'plus', 49900, 59700, 'MZN', 3, false,  0, '["3 meses de Premium","Poupas 98 MZN","Renova a cada trimestre"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;
