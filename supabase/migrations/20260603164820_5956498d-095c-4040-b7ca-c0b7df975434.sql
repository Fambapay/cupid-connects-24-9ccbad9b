
CREATE TABLE public.match_reads (
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_reads TO authenticated;
GRANT ALL ON public.match_reads TO service_role;

ALTER TABLE public.match_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_reads_select_own" ON public.match_reads
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_match_member(match_id, auth.uid()));

CREATE POLICY "match_reads_insert_own" ON public.match_reads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_match_member(match_id, auth.uid()));

CREATE POLICY "match_reads_update_own" ON public.match_reads
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
