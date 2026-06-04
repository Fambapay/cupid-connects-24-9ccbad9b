-- Read receipts: allow match members to see each other's last_read_at
CREATE POLICY match_reads_select_peer
  ON public.match_reads
  FOR SELECT
  TO authenticated
  USING (is_match_member(match_id, auth.uid()));

-- Realtime publication + topic-scoped subscription policy
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_reads;

CREATE POLICY realtime_match_reads_members
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'postgres_changes'
    AND topic LIKE 'realtime:public:match_reads:match_id=eq.%'
    AND is_match_member(
      (substring(topic, 'match_id=eq\.([0-9a-fA-F-]{36})'))::uuid,
      auth.uid()
    )
  );