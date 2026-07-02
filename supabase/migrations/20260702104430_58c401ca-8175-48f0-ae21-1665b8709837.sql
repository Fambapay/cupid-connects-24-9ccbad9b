CREATE OR REPLACE FUNCTION public.get_who_liked_me()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  _viewer uuid := auth.uid();
  _tier text;
  _status text;
  _expires timestamptz;
  _reveal boolean := false;
  _rows jsonb;
BEGIN
  IF _viewer IS NULL THEN
    RETURN jsonb_build_object('reveal', false, 'likers', '[]'::jsonb);
  END IF;

  SELECT membership_tier, membership_status, membership_expires_at
    INTO _tier, _status, _expires
  FROM public.profiles WHERE id = _viewer;

  IF _tier IN ('plus','elite')
     AND _status = 'active'
     AND (_expires IS NULL OR _expires > now()) THEN
    _reveal := true;
  END IF;

  WITH pending AS (
    SELECT s.swiper_id, s.direction, s.created_at, s.first_impression_message
    FROM public.swipes s
    WHERE s.swiped_id = _viewer
      AND s.direction IN ('like','super')
      AND NOT EXISTS (
        SELECT 1 FROM public.swipes o
        WHERE o.swiper_id = _viewer AND o.swiped_id = s.swiper_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocked_users b
        WHERE (b.blocker_id = _viewer AND b.blocked_id = s.swiper_id)
           OR (b.blocker_id = s.swiper_id AND b.blocked_id = _viewer)
      )
    ORDER BY s.created_at DESC
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', CASE WHEN _reveal THEN p.swiper_id::text
               ELSE 'hidden-' || md5(p.swiper_id::text || _viewer::text) END,
    'name', CASE WHEN _reveal THEN pr.name ELSE NULL END,
    'age', COALESCE(pr.age,
      CASE WHEN pr.birthdate IS NOT NULL
           THEN GREATEST(0, floor(extract(epoch from (now() - pr.birthdate))/(365.25*24*3600))::int)
           ELSE 0 END),
    'city', CASE WHEN _reveal THEN pr.city ELSE NULL END,
    'photo_path', CASE WHEN _reveal THEN (
        SELECT ph.storage_path FROM public.profile_photos ph
        WHERE ph.profile_id = p.swiper_id
        ORDER BY ph.position ASC LIMIT 1
      ) ELSE NULL END,
    'teaser_photo_path', CASE WHEN NOT _reveal THEN (
        SELECT ph.storage_path FROM public.profile_photos ph
        WHERE ph.profile_id = p.swiper_id
        ORDER BY ph.position ASC LIMIT 1
      ) ELSE NULL END,
    'is_super', (p.direction = 'super'),
    'first_impression', p.first_impression_message,
    'created_at', p.created_at
  )), '[]'::jsonb) INTO _rows
  FROM pending p
  LEFT JOIN public.profiles pr ON pr.id = p.swiper_id;

  RETURN jsonb_build_object('reveal', _reveal, 'likers', COALESCE(_rows, '[]'::jsonb));
END;
$function$;