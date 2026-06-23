ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
ALTER TABLE public.swipes REPLICA IDENTITY FULL;
ALTER TABLE public.user_settings REPLICA IDENTITY FULL;