-- 1) Boosts: restrict select to own
DROP POLICY IF EXISTS boosts_select_active ON public.boosts;
CREATE POLICY boosts_select_own
  ON public.boosts FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- 2) Storage: replace permissive "Authenticated can read profile photos"
DROP POLICY IF EXISTS "Authenticated can read profile photos" ON storage.objects;

CREATE POLICY "Profile photos visible per profile rules"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (
      -- owner always
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id::text = (storage.foldername(name))[1]
          AND p.onboarding_completed = true
          AND p.is_paused = false
          AND ((p.is_seed = false) OR (p.seed_active = true))
          AND NOT EXISTS (
            SELECT 1 FROM public.blocked_users b
            WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
               OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
          )
      )
    )
  );

-- 3) Profile prompts: allow visible-profile reads
CREATE POLICY prompts_select_others
  ON public.profile_prompts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_prompts.profile_id
        AND p.onboarding_completed = true
        AND p.is_paused = false
        AND ((p.is_seed = false) OR (p.seed_active = true))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = profile_prompts.profile_id)
         OR (b.blocker_id = profile_prompts.profile_id AND b.blocked_id = auth.uid())
    )
  );