CREATE POLICY boosts_select_active_for_discovery
ON public.boosts
FOR SELECT
TO authenticated
USING (expires_at > now());