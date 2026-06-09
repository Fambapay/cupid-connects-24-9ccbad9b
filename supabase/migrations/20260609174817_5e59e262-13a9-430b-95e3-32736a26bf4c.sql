
DELETE FROM public.messages WHERE match_id IN (
  SELECT m.id FROM public.matches m
  LEFT JOIN public.profiles pa ON pa.id = m.user_a
  LEFT JOIN public.profiles pb ON pb.id = m.user_b
  WHERE pa.id IS NULL OR pb.id IS NULL
);
DELETE FROM public.match_reads WHERE match_id IN (
  SELECT m.id FROM public.matches m
  LEFT JOIN public.profiles pa ON pa.id = m.user_a
  LEFT JOIN public.profiles pb ON pb.id = m.user_b
  WHERE pa.id IS NULL OR pb.id IS NULL
);
DELETE FROM public.matches m
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.user_a)
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = m.user_b);

DELETE FROM public.swipes s
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.swiper_id)
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.swiped_id);

CREATE OR REPLACE FUNCTION public.cleanup_profile_relations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.messages WHERE match_id IN (
    SELECT id FROM public.matches WHERE user_a = OLD.id OR user_b = OLD.id
  );
  DELETE FROM public.match_reads WHERE match_id IN (
    SELECT id FROM public.matches WHERE user_a = OLD.id OR user_b = OLD.id
  ) OR user_id = OLD.id;
  DELETE FROM public.matches WHERE user_a = OLD.id OR user_b = OLD.id;
  DELETE FROM public.swipes WHERE swiper_id = OLD.id OR swiped_id = OLD.id;
  DELETE FROM public.blocked_users WHERE blocker_id = OLD.id OR blocked_id = OLD.id;
  DELETE FROM public.reports WHERE reporter_id = OLD.id OR reported_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_profile_relations ON public.profiles;
CREATE TRIGGER trg_cleanup_profile_relations
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.cleanup_profile_relations();
