UPDATE public.profiles SET gender = 'man' WHERE is_seed = true AND gender = 'masculino';
UPDATE public.profiles SET gender = 'woman' WHERE is_seed = true AND gender = 'feminino';
UPDATE public.profiles SET gender = 'nonbinary' WHERE is_seed = true AND gender = 'nao_binario';