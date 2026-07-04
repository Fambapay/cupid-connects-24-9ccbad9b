
-- 1) Extend offer_trigger enum with the two missing contextual triggers
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'superlike_zero';
ALTER TYPE public.offer_trigger ADD VALUE IF NOT EXISTS 'boost_exhausted';
