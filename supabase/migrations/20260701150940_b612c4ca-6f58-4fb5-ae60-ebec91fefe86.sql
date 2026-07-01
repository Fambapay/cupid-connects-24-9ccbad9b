DROP POLICY IF EXISTS notification_deliveries_no_client_access ON public.notification_deliveries;
CREATE POLICY notification_deliveries_no_client_access
  ON public.notification_deliveries
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);