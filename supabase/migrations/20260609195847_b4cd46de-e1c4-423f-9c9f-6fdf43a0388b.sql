DROP TRIGGER IF EXISTS trg_create_match_on_reciprocal_like ON public.swipes;
DROP TRIGGER IF EXISTS notify_like_after_insert ON public.swipes;
DROP TRIGGER IF EXISTS trg_create_match_on_reciprocal_like_after_insert ON public.swipes;
DROP TRIGGER IF EXISTS trg_create_match_on_reciprocal_like_after_update ON public.swipes;
DROP TRIGGER IF EXISTS notify_like_after_insert_or_update_insert ON public.swipes;
DROP TRIGGER IF EXISTS notify_like_after_insert_or_update_update ON public.swipes;

CREATE TRIGGER trg_create_match_on_reciprocal_like_after_insert
AFTER INSERT ON public.swipes
FOR EACH ROW
WHEN (NEW.direction IN ('like', 'super'))
EXECUTE FUNCTION public.create_match_on_reciprocal_like();

CREATE TRIGGER trg_create_match_on_reciprocal_like_after_update
AFTER UPDATE OF direction, first_impression_message ON public.swipes
FOR EACH ROW
WHEN (
  NEW.direction IN ('like', 'super')
  AND (
    NEW.direction IS DISTINCT FROM OLD.direction
    OR NEW.first_impression_message IS DISTINCT FROM OLD.first_impression_message
  )
)
EXECUTE FUNCTION public.create_match_on_reciprocal_like();

CREATE TRIGGER notify_like_after_insert_or_update_insert
AFTER INSERT ON public.swipes
FOR EACH ROW
WHEN (NEW.direction IN ('like', 'super'))
EXECUTE FUNCTION public.notify_on_like();

CREATE TRIGGER notify_like_after_insert_or_update_update
AFTER UPDATE OF direction, first_impression_message ON public.swipes
FOR EACH ROW
WHEN (
  NEW.direction IN ('like', 'super')
  AND (
    NEW.direction IS DISTINCT FROM OLD.direction
    OR NEW.first_impression_message IS DISTINCT FROM OLD.first_impression_message
  )
)
EXECUTE FUNCTION public.notify_on_like();