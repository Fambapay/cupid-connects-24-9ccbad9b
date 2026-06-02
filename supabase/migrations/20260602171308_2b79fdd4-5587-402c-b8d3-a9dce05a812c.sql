-- 1) Profiles: novos campos
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS interested_in text[] NOT NULL DEFAULT '{}'::text[];

-- 2) Tabela de fotos do perfil
CREATE TABLE IF NOT EXISTS public.profile_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_photos TO authenticated;
GRANT ALL ON public.profile_photos TO service_role;

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photos_select_own" ON public.profile_photos
  FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "photos_insert_own" ON public.profile_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "photos_update_own" ON public.profile_photos
  FOR UPDATE TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "photos_delete_own" ON public.profile_photos
  FOR DELETE TO authenticated USING (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_photos_profile_pos
  ON public.profile_photos(profile_id, position);

-- 3) Garantir trigger handle_new_user em auth.users (caso não exista)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;