DROP VIEW IF EXISTS public.offer_funnel CASCADE;

CREATE VIEW public.offer_funnel
WITH (security_invoker = on) AS
SELECT
  o.id AS offer_id,
  o.slug,
  o.trigger,
  o.plan_tier,
  o.first_period_price_minor,
  o.regular_price_minor,
  o.currency,
  COALESCE(imp.shown, 0)          AS impressions_shown,
  COALESCE(imp.dismissed, 0)      AS impressions_dismissed,
  COALESCE(imp.clicked_cta, 0)    AS impressions_clicked_cta,
  COALESCE(red.started, 0)        AS redemptions_started,
  COALESCE(red.paid, 0)           AS redemptions_paid,
  CASE WHEN COALESCE(imp.shown,0) > 0
       THEN ROUND(COALESCE(imp.clicked_cta,0)::numeric / imp.shown::numeric, 4)
       ELSE 0 END                 AS ctr,
  CASE WHEN COALESCE(imp.shown,0) > 0
       THEN ROUND(COALESCE(red.paid,0)::numeric / imp.shown::numeric, 4)
       ELSE 0 END                 AS conversion_rate
FROM public.offers o
LEFT JOIN (
  SELECT offer_id,
    COUNT(*) FILTER (WHERE action = 'shown')       AS shown,
    COUNT(*) FILTER (WHERE action = 'dismissed')   AS dismissed,
    COUNT(*) FILTER (WHERE action = 'clicked_cta') AS clicked_cta
  FROM public.popup_impressions
  GROUP BY offer_id
) imp ON imp.offer_id = o.id
LEFT JOIN (
  SELECT offer_id,
    COUNT(*)                                AS started,
    COUNT(*) FILTER (WHERE status = 'paid') AS paid
  FROM public.offer_redemptions
  GROUP BY offer_id
) red ON red.offer_id = o.id;

REVOKE ALL ON public.offer_funnel FROM PUBLIC;
GRANT SELECT ON public.offer_funnel TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_offer_funnel()
RETURNS SETOF public.offer_funnel
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY SELECT * FROM public.offer_funnel ORDER BY impressions_shown DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_offer_funnel() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_offer_funnel() TO authenticated;