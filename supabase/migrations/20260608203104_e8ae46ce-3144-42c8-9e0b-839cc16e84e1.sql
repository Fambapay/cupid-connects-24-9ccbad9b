-- Schedule daily check for memberships expiring in 3 days / 1 day,
-- which sends a reminder email with a "Renovar" CTA.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if present (re-run safe)
DO $$
BEGIN
  PERFORM cron.unschedule('membership-expiry-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'membership-expiry-reminders',
  '0 9 * * *', -- every day at 09:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://project--vwwnmfazltjkdlxvwnta.lovable.app/api/public/membership-expiry-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3d25tZmF6bHRqa2RseHZ3bnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTA2MjgsImV4cCI6MjA5NTk4NjYyOH0.40fkFj0IW90Sh7h41R2iLF0rolunWd63SY6d_MrCgY4'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
