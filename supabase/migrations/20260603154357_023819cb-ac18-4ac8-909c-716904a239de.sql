DROP POLICY IF EXISTS "Profile photos visible per profile rules" ON storage.objects;

CREATE POLICY "Profile photos visible per profile rules"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id)::text = (storage.foldername(storage.objects.name))[1]
        AND p.onboarding_completed = true
        AND p.is_paused = false
        AND (p.is_seed = false OR p.seed_active = true)
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_users b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
             OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
        )
    )
  )
);