CREATE POLICY "verification_selfies_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "verification_selfies_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "verification_selfies_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'verification-selfies' AND auth.uid()::text = (storage.foldername(name))[1]);
