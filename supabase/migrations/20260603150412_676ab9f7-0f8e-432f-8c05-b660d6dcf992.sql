-- Enable RLS on realtime.messages (broadcast/postgres_changes authorization)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior permissive policies we may have created
DROP POLICY IF EXISTS "realtime_authenticated_read" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_messages_select" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_messages_match_members" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_messages_typing_members" ON realtime.messages;

-- Allow postgres_changes on public.messages only for the match's members.
-- Topic format used by supabase-js: "realtime:public:messages:match_id=eq.<uuid>"
CREATE POLICY "realtime_messages_match_members"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- postgres_changes channels for the messages table
  (
    extension = 'postgres_changes'
    AND (
      topic LIKE 'realtime:public:messages:match_id=eq.%'
      AND public.is_match_member(
        substring(topic from 'match_id=eq\.([0-9a-fA-F-]{36})')::uuid,
        auth.uid()
      )
    )
  )
  OR
  -- Typing broadcast channel: "typing-<matchId>"
  (
    extension = 'broadcast'
    AND topic LIKE 'typing-%'
    AND public.is_match_member(
      substring(topic from 'typing-([0-9a-fA-F-]{36})')::uuid,
      auth.uid()
    )
  )
);

-- Also allow INSERT (publish) on broadcast typing channels only for members
CREATE POLICY "realtime_messages_typing_publish"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  extension = 'broadcast'
  AND topic LIKE 'typing-%'
  AND public.is_match_member(
    substring(topic from 'typing-([0-9a-fA-F-]{36})')::uuid,
    auth.uid()
  )
);
