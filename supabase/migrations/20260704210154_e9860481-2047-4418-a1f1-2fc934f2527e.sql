
-- ============================================================
-- 2A) Insert the three new offers (monthly = MZN base, +AOA via offers_pricing)
-- ============================================================
INSERT INTO public.offers
  (slug, title, description, trigger, plan_tier, target_tier,
   first_period_price_minor, regular_price_minor, currency,
   period_months, is_discount, active, priority, bullets)
VALUES
  ('pause_50',
   'Fica com 50% off no próximo mês',
   'Antes de cancelar, mantém o Hunie por metade do preço. Só desta vez.',
   'cancel_flow', 'plus', 'plus',
   17450, 34900, 'MZN',
   1, true, true, 100,
   '["50% off no próximo mês","Mantém Plus intacto","Sem compromisso — cancela quando quiseres"]'::jsonb),

  ('superlike_zero_49',
   'Pack rápido — 5 Super Likes',
   'Zero Super Likes? Volta ao jogo já. Preço promocional só neste momento.',
   'superlike_zero', 'plus', 'plus',
   14900, 19900, 'MZN',
   1, true, true, 60,
   '["5 Super Likes prontos a usar","3x mais matches em média","Sem subscrição — pack único"]'::jsonb),

  ('boost_exhausted_99',
   'Mais 1 Boost — só 99 MT',
   '30 minutos entre os primeiros do teu perfil. Continua a onda enquanto está quente.',
   'boost_exhausted', 'plus', 'plus',
   9900, 9900, 'MZN',
   1, false, true, 55,
   '["1 Boost extra (30 min)","10x mais visualizações","Ativa agora e continua a acumular matches"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- AO pricing
INSERT INTO public.offers_pricing (offer_id, currency, first_period_price, regular_price)
SELECT o.id, 'AOA',
  CASE o.slug
    WHEN 'pause_50'           THEN 130000
    WHEN 'superlike_zero_49'  THEN 150000
    WHEN 'boost_exhausted_99' THEN 75000
  END,
  CASE o.slug
    WHEN 'pause_50'           THEN 260000
    WHEN 'superlike_zero_49'  THEN 200000
    WHEN 'boost_exhausted_99' THEN 75000
  END
FROM public.offers o
WHERE o.slug IN ('pause_50','superlike_zero_49','boost_exhausted_99')
ON CONFLICT (offer_id, currency) DO NOTHING;

-- ============================================================
-- 2B) get_eligible_offer: allow premium for cancel_flow, superlike_zero, boost_exhausted;
-- gate pause_50 by profiles.pause_used
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_eligible_offer(_trigger offer_trigger)
 RETURNS TABLE(id uuid, slug text, title text, description text, trigger offer_trigger, plan_tier text, target_tier text, first_period_price_minor integer, regular_price_minor integer, currency text, period_months integer, is_discount boolean, active boolean, priority integer, bullets jsonb, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now());
  v_country text;
  v_currency text;
  v_pause_used boolean;
  v_premium_ok boolean;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  -- Existing discount reservations block *plan* offers, but not credit-pack style ones.
  IF EXISTS (
    SELECT 1 FROM public.offer_redemptions
    WHERE user_id = v_uid AND status IN ('reserved','paid')
  ) AND _trigger NOT IN ('superlike_zero','boost_exhausted') THEN
    RETURN;
  END IF;

  -- Triggers where premium users are still eligible
  v_premium_ok := _trigger IN ('always_on','cancel_flow','superlike_zero','boost_exhausted');
  IF public.has_premium_access(v_uid) AND NOT v_premium_ok THEN
    RETURN;
  END IF;

  -- Daily impression cap (skip for always_on + credit refills where the user actively triggered it)
  IF _trigger NOT IN ('always_on','superlike_zero','boost_exhausted','cancel_flow') THEN
    IF (
      SELECT count(*) FROM public.popup_impressions
      WHERE user_id = v_uid AND action = 'shown'
        AND shown_at >= v_today_start
    ) >= 2 THEN
      RETURN;
    END IF;
  END IF;

  -- pause_50 is once-per-account
  IF _trigger = 'cancel_flow' THEN
    SELECT COALESCE(pause_used, false) INTO v_pause_used
      FROM public.profiles WHERE id = v_uid;
    IF v_pause_used THEN RETURN; END IF;
  END IF;

  SELECT p.country INTO v_country FROM public.profiles p WHERE p.id = v_uid;
  v_currency := CASE upper(coalesce(v_country, ''))
    WHEN 'AO' THEN 'AOA'
    WHEN 'ANGOLA' THEN 'AOA'
    ELSE 'MZN'
  END;

  RETURN QUERY
  SELECT
    o.id, o.slug, o.title, o.description, o.trigger, o.plan_tier, o.target_tier,
    COALESCE(op.first_period_price, o.first_period_price_minor),
    COALESCE(op.regular_price,      o.regular_price_minor),
    COALESCE(op.currency,           o.currency),
    o.period_months, o.is_discount, o.active, o.priority, o.bullets,
    o.created_at, o.updated_at
  FROM public.offers o
  LEFT JOIN public.offers_pricing op
    ON op.offer_id = o.id AND op.currency = v_currency
  WHERE o.trigger = _trigger
    AND o.active = true
    AND (
      _trigger IN ('always_on','superlike_zero','boost_exhausted','cancel_flow')
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.popup_impressions pi
          WHERE pi.user_id = v_uid AND pi.offer_id = o.id
            AND pi.action = 'shown' AND pi.shown_at >= v_today_start
        )
        AND (
          SELECT count(*) FROM public.popup_impressions pi2
          WHERE pi2.user_id = v_uid AND pi2.offer_id = o.id
            AND pi2.action = 'dismissed'
        ) < 2
      )
    )
  ORDER BY o.priority DESC
  LIMIT 1;
END $function$;

-- ============================================================
-- 2C) redeem_offer: mark pause_used when slug='pause_50'
-- ============================================================
CREATE OR REPLACE FUNCTION public.redeem_offer(_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- Lock pause offer to once-per-account (bypasses privilege trigger via SECURITY DEFINER)
    IF v_offer.slug = 'pause_50' THEN
      UPDATE public.profiles SET pause_used = true, updated_at = now()
       WHERE id = v_uid;
    END IF;
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
END $function$;
