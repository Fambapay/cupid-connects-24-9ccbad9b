
UPDATE public.profiles SET gender = 'woman' WHERE is_seed = true AND country IN ('Holanda','NL') AND gender = 'feminino';
UPDATE public.profiles SET gender = 'man' WHERE is_seed = true AND country IN ('Holanda','NL') AND gender = 'masculino';
UPDATE public.profiles SET city = 'Amsterdam', country = 'NL' WHERE is_seed = true AND city = 'Amesterdão';
UPDATE public.profiles SET city = 'Rotterdam', country = 'NL' WHERE is_seed = true AND city = 'Roterdão';
UPDATE public.profiles SET country = 'NL' WHERE is_seed = true AND country = 'Holanda';
UPDATE public.profiles SET interested_in = ARRAY['man'] WHERE is_seed = true AND country = 'NL' AND gender = 'woman' AND (interested_in IS NULL OR array_length(interested_in,1) IS NULL);
UPDATE public.profiles SET interested_in = ARRAY['woman'] WHERE is_seed = true AND country = 'NL' AND gender = 'man' AND (interested_in IS NULL OR array_length(interested_in,1) IS NULL);
