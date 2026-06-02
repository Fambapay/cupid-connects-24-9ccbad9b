
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE TABLE IF NOT EXISTS public.profile_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_prompts TO authenticated;
GRANT ALL ON public.profile_prompts TO service_role;

ALTER TABLE public.profile_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prompts_select_own" ON public.profile_prompts
  FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "prompts_insert_own" ON public.profile_prompts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "prompts_update_own" ON public.profile_prompts
  FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "prompts_delete_own" ON public.profile_prompts
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);
