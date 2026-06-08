CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('reactivation-reminders');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'reactivation-reminders',
  '0 10 * * *', -- every day at 10:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://project--vwwnmfazltjkdlxvwnta.lovable.app/api/public/reactivation-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3d25tZmF6bHRqa2RseHZ3bnRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTA2MjgsImV4cCI6MjA5NTk4NjYyOH0.40fkFj0IW90Sh7h41R2iLF0rolunWd63SY6d_MrCgY4'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
