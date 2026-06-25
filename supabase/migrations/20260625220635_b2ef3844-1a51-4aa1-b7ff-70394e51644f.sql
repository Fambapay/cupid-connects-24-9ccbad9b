CREATE OR REPLACE FUNCTION public.get_match_summaries()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  blocks AS (
    SELECT blocked_id AS id FROM public.blocked_users WHERE blocker_id = (SELECT uid FROM me)
    UNION
    SELECT blocker_id FROM public.blocked_users WHERE blocked_id = (SELECT uid FROM me)
  ),
  my_matches AS (
    SELECT m.id, m.user_a, m.user_b, m.last_message_at, m.created_at,
      CASE WHEN m.user_a = (SELECT uid FROM me) THEN m.user_b ELSE m.user_a END AS other_id
    FROM public.matches m
    WHERE m.user_a = (SELECT uid FROM me) OR m.user_b = (SELECT uid FROM me)
  ),
  filtered AS (
    SELECT * FROM my_matches WHERE other_id NOT IN (SELECT id FROM blocks)
  ),
  with_last AS (
    SELECT f.*,
      lm.content AS last_content, lm.created_at AS last_at, lm.sender_id AS last_sender_id,
      COALESCE(mr.last_read_at, '1970-01-01'::timestamptz) AS read_at
    FROM filtered f
    LEFT JOIN LATERAL (
      SELECT content, created_at, sender_id FROM public.messages
      WHERE match_id = f.id ORDER BY created_at DESC LIMIT 1
    ) lm ON true
    LEFT JOIN public.match_reads mr ON mr.match_id = f.id AND mr.user_id = (SELECT uid FROM me)
  ),
  with_unread AS (
    SELECT w.*, (
      SELECT COUNT(*) FROM public.messages msg
      WHERE msg.match_id = w.id
        AND msg.sender_id <> (SELECT uid FROM me)
        AND msg.created_at > w.read_at
    )::int AS unread_count
    FROM with_last w
  ),
  with_profile AS (
    SELECT u.*, p.name AS other_name,
      (SELECT storage_path FROM public.profile_photos ph
        WHERE ph.profile_id = u.other_id ORDER BY position ASC LIMIT 1) AS photo_path
    FROM with_unread u
    LEFT JOIN public.profiles p ON p.id = u.other_id
  ),
  ordered AS (
    SELECT * FROM with_profile
    ORDER BY COALESCE(last_at, last_message_at, created_at) DESC
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'match_id', id,
    'other_id', other_id,
    'name', COALESCE(other_name, 'Alguém'),
    'photo_path', photo_path,
    'last_message', last_content,
    'last_message_at', COALESCE(last_at, last_message_at, created_at),
    'unread', unread_count,
    'has_messages', last_content IS NOT NULL,
    'last_from_me', (last_sender_id = (SELECT uid FROM me)),
    'last_sender_id', last_sender_id
  )), '[]'::jsonb)
  FROM ordered;
$$;