-- Precisa de DROP porque o tipo de retorno muda (SETOF offers → TABLE)
DROP FUNCTION IF EXISTS public.get_eligible_offer(offer_trigger);

-- 1) Semeia ofertas contextuais (usa valores já existentes no enum offer_trigger)
INSERT INTO public.offers (slug, title, description, trigger, plan_tier, target_tier,
  first_period_price_minor, regular_price_minor, currency, period_months,
  is_discount, active, priority, bullets)
VALUES
  ('out_of_likes_149', 'Sem likes até amanhã?',
   'Passa para Plus e dá likes sem limites já hoje.',
   'out_of_likes', 'plus', 'plus',
   14900, 19900, 'MZN', 1,
   true, true, 30,
   '["Likes ilimitados","5 Super Likes por dia","Ver quem já gostou de ti"]'::jsonb),
  ('likes_teaser_149', 'Alguém já gostou de ti',
   'Vê exactamente quem — e responde primeiro.',
   'likes_teaser', 'plus', 'plus',
   14900, 19900, 'MZN', 1,
   true, true, 40,
   '["Ver todos os que já gostaram","Likes ilimitados","5 Super Likes por dia"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- 2) Preços em Kwanzas para todas as ofertas
INSERT INTO public.offers_pricing (offer_id, currency, first_period_price, regular_price)
SELECT o.id, 'AOA',
  CASE o.slug
    WHEN 'launch_149'       THEN 1490
    WHEN 'lastchance_99'    THEN  990
    WHEN 'match_149'        THEN 1490
    WHEN 'likes_149'        THEN 1490
    WHEN 'winback7_99'      THEN  990
    WHEN 'winback14_99'     THEN  990
    WHEN 'quarterly_499'    THEN 4990
    WHEN 'out_of_likes_149' THEN 1490
    WHEN 'likes_teaser_149' THEN 1490
    ELSE round(o.first_period_price_minor::numeric / 10.0)::int
  END,
  CASE o.slug
    WHEN 'launch_149'       THEN 1990
    WHEN 'lastchance_99'    THEN 1990
    WHEN 'match_149'        THEN 1990
    WHEN 'likes_149'        THEN 1990
    WHEN 'winback7_99'      THEN 1990
    WHEN 'winback14_99'     THEN 1990
    WHEN 'quarterly_499'    THEN 5970
    WHEN 'out_of_likes_149' THEN 1990
    WHEN 'likes_teaser_149' THEN 1990
    ELSE round(o.regular_price_minor::numeric / 10.0)::int
  END
FROM public.offers o
ON CONFLICT (offer_id, currency) DO NOTHING;

-- 3) Recria get_eligible_offer com moeda por país
CREATE FUNCTION public.get_eligible_offer(_trigger offer_trigger)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  description text,
  trigger offer_trigger,
  plan_tier text,
  target_tier text,
  first_period_price_minor integer,
  regular_price_minor integer,
  currency text,
  period_months integer,
  is_discount boolean,
  active boolean,
  priority integer,
  bullets jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now());
  v_country text;
  v_currency text;
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.offer_redemptions
    WHERE user_id = v_uid AND status IN ('reserved','paid')
  ) THEN RETURN; END IF;

  IF public.has_premium_access(v_uid) AND _trigger <> 'always_on' THEN
    RETURN;
  END IF;

  IF _trigger <> 'always_on' THEN
    IF (
      SELECT count(*) FROM public.popup_impressions
      WHERE user_id = v_uid AND action = 'shown'
        AND shown_at >= v_today_start
    ) >= 2 THEN
      RETURN;
    END IF;
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
      _trigger = 'always_on'
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