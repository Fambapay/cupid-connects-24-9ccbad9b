
UPDATE public.profiles SET latitude = 52.3676 + (random()-0.5)*0.05, longitude = 4.9041 + (random()-0.5)*0.05 WHERE is_seed=true AND country='NL' AND city='Amsterdam' AND (latitude IS NULL OR longitude IS NULL);
UPDATE public.profiles SET latitude = 51.9244 + (random()-0.5)*0.05, longitude = 4.4777 + (random()-0.5)*0.05 WHERE is_seed=true AND country='NL' AND city='Rotterdam' AND (latitude IS NULL OR longitude IS NULL);
UPDATE public.profiles SET latitude = 52.0705 + (random()-0.5)*0.05, longitude = 4.3007 + (random()-0.5)*0.05 WHERE is_seed=true AND country='NL' AND city='Haia' AND (latitude IS NULL OR longitude IS NULL);
UPDATE public.profiles SET latitude = 52.0907 + (random()-0.5)*0.05, longitude = 5.1214 + (random()-0.5)*0.05 WHERE is_seed=true AND country='NL' AND city='Utrecht' AND (latitude IS NULL OR longitude IS NULL);
UPDATE public.profiles SET latitude = 51.4416 + (random()-0.5)*0.05, longitude = 5.4697 + (random()-0.5)*0.05 WHERE is_seed=true AND country='NL' AND city='Eindhoven' AND (latitude IS NULL OR longitude IS NULL);
