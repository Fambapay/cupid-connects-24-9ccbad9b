
-- Desativar triggers durante o seed (incluindo handle_new_user e prevent_profile_privilege_escalation)
SET session_replication_role = replica;

WITH new_profiles(id, name, age, city, country, lat, lng, gender, interested_in, interests, bio, verified, photos) AS (
  VALUES
  (gen_random_uuid(), 'Inês'::text, 24, 'Maputo'::text, 'Moçambique'::text, -25.9655::float8, 32.5832::float8, 'feminino'::text, ARRAY['masculino']::text[], ARRAY['Surf','Café','Fotografia','Viagens','Música']::text[], 'Surfista da Praia do Tofo. Coleciono pôr-do-sóis e cafés bons.'::text, true,
    ARRAY['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&q=80','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80']::text[]),
  (gen_random_uuid(), 'Mariana', 27, 'Maputo', 'Moçambique', -25.9710, 32.5710, 'feminino', ARRAY['masculino']::text[], ARRAY['Yoga','Cozinhar','Vinho','Cinema','Praia'], 'Arquiteta de dia, cozinheira de fim de semana. Procuro alguém que ria muito.', true,
    ARRAY['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80','https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=80','https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=900&q=80']),
  (gen_random_uuid(), 'Sofia', 23, 'Maputo', 'Moçambique', -25.9580, 32.5900, 'feminino', ARRAY['masculino','feminino']::text[], ARRAY['Arte','Concertos','Tatuagens','Cães','Viagens'], 'Ilustradora freelancer. O meu cão sabe mais segredos que ninguém.', false,
    ARRAY['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=900&q=80','https://images.unsplash.com/photo-1496440737103-cd596325d314?w=900&q=80','https://images.unsplash.com/photo-1521252659862-eec69941b071?w=900&q=80']),
  (gen_random_uuid(), 'Leonor', 29, 'Maputo', 'Moçambique', -25.9800, 32.6010, 'feminino', ARRAY['masculino']::text[], ARRAY['Trail running','Vinho','Livros','Praia','Astrologia'], 'Médica veterinária. Domingos de mercado e cinema de autor.', true,
    ARRAY['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80','https://images.unsplash.com/photo-1503467913725-d8e9b4cba432?w=900&q=80']),
  (gen_random_uuid(), 'Beatriz', 26, 'Maputo', 'Moçambique', -25.9690, 32.5750, 'feminino', ARRAY['masculino']::text[], ARRAY['Pilates','Brunch','Moda','Cinema','Praia'], 'Brand designer. Adoro descobrir cafés escondidos e galerias pequenas.', true,
    ARRAY['https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=900&q=80','https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=900&q=80','https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=80']),
  (gen_random_uuid(), 'Tiago', 28, 'Maputo', 'Moçambique', -25.9730, 32.5820, 'masculino', ARRAY['feminino']::text[], ARRAY['Surf','Whisky','Trail','Música ao vivo','Cozinhar'], 'Engenheiro civil. Fim de semana é Bilene, segunda é gym e podcast.', true,
    ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80']),
  (gen_random_uuid(), 'Rui', 31, 'Maputo', 'Moçambique', -25.9650, 32.5990, 'masculino', ARRAY['feminino']::text[], ARRAY['Padel','Cinema','Vinho','Viagens','Fotografia'], 'Diretor de marketing. Conta-me a tua viagem favorita.', true,
    ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80']),
  (gen_random_uuid(), 'André', 26, 'Maputo', 'Moçambique', -25.9520, 32.5670, 'masculino', ARRAY['feminino','nao_binario']::text[], ARRAY['Música','Guitarra','Skate','Café','Praia'], 'Produtor musical. Costumo perder-me entre concertos e mercados.', false,
    ARRAY['https://images.unsplash.com/photo-1463453091185-61582044d556?w=900&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80']),
  (gen_random_uuid(), 'Pedro', 30, 'Maputo', 'Moçambique', -25.9780, 32.5980, 'masculino', ARRAY['feminino']::text[], ARRAY['BJJ','Sushi','Cinema','Viagens','Cães'], 'Advogado, atleta nos tempos livres. Procuro alguém genuíno.', true,
    ARRAY['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80']),
  (gen_random_uuid(), 'Helena', 25, 'Beira', 'Moçambique', -19.8436, 34.8389, 'feminino', ARRAY['masculino']::text[], ARRAY['Natação','Livros','Café','Viagens','Yoga'], 'Enfermeira. Fã de manhãs cedo na praia da Macuti.', true,
    ARRAY['https://images.unsplash.com/photo-1496360166961-10a51d5f367a?w=900&q=80','https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=900&q=80','https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&q=80']),
  (gen_random_uuid(), 'Joana', 28, 'Beira', 'Moçambique', -19.8290, 34.8500, 'feminino', ARRAY['masculino']::text[], ARRAY['Padel','Cozinhar','Vinho','Cinema','Cães'], 'Gestora de hotel. Quem é que ainda escreve cartas à mão?', true,
    ARRAY['https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=900&q=80','https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=80','https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=900&q=80']),
  (gen_random_uuid(), 'Carolina', 22, 'Beira', 'Moçambique', -19.8410, 34.8420, 'feminino', ARRAY['masculino','feminino']::text[], ARRAY['Dança','Concertos','Moda','Praia','Arte'], 'Estudante de design. Curto kizomba até o sol nascer.', false,
    ARRAY['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80','https://images.unsplash.com/photo-1521252659862-eec69941b071?w=900&q=80','https://images.unsplash.com/photo-1496440737103-cd596325d314?w=900&q=80']),
  (gen_random_uuid(), 'Miguel', 29, 'Beira', 'Moçambique', -19.8350, 34.8460, 'masculino', ARRAY['feminino']::text[], ARRAY['Pesca','Cerveja artesanal','Trail','Cães','Cozinhar'], 'Chef de cozinha. Se gostas de comer bem, já temos um tema.', true,
    ARRAY['https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80']),
  (gen_random_uuid(), 'Hugo', 33, 'Beira', 'Moçambique', -19.8470, 34.8350, 'masculino', ARRAY['feminino']::text[], ARRAY['Crossfit','Vinho','Cinema','Viagens','Fotografia'], 'Empresário. Filho da Beira, cidadão do mundo.', true,
    ARRAY['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80']),
  (gen_random_uuid(), 'Filipa', 24, 'Nampula', 'Moçambique', -15.1165, 39.2666, 'feminino', ARRAY['masculino']::text[], ARRAY['Mergulho','Livros','Café','Viagens','Música'], 'Bióloga marinha. Fim de semana é Ilha de Moçambique.', true,
    ARRAY['https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=900&q=80','https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&q=80','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80']),
  (gen_random_uuid(), 'Catarina', 27, 'Nampula', 'Moçambique', -15.1200, 39.2700, 'feminino', ARRAY['masculino']::text[], ARRAY['Pilates','Cozinhar','Vinho','Cinema','Praia'], 'Jornalista. A perguntar coisas é o meu trabalho — e o meu vício.', true,
    ARRAY['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80','https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=900&q=80','https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=900&q=80']),
  (gen_random_uuid(), 'Bruno', 30, 'Nampula', 'Moçambique', -15.1140, 39.2620, 'masculino', ARRAY['feminino']::text[], ARRAY['Mergulho','Pesca','Cerveja artesanal','Trail','Música'], 'Skipper. Se nunca dormiste num barco, devias.', true,
    ARRAY['https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80']),
  (gen_random_uuid(), 'João', 26, 'Nampula', 'Moçambique', -15.1180, 39.2710, 'masculino', ARRAY['feminino']::text[], ARRAY['Futebol','Sushi','Cinema','Viagens','Música'], 'Programador. Café duplo, código, repetir.', false,
    ARRAY['https://images.unsplash.com/photo-1463453091185-61582044d556?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80']),
  (gen_random_uuid(), 'Rita', 23, 'Quelimane', 'Moçambique', -17.8786, 36.8883, 'feminino', ARRAY['masculino']::text[], ARRAY['Yoga','Cozinhar','Praia','Cinema','Cães'], 'Professora. Conheço todas as pastelarias da cidade — testa-me.', false,
    ARRAY['https://images.unsplash.com/photo-1521252659862-eec69941b071?w=900&q=80','https://images.unsplash.com/photo-1503467913725-d8e9b4cba432?w=900&q=80','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=900&q=80']),
  (gen_random_uuid(), 'Daniel', 29, 'Quelimane', 'Moçambique', -17.8800, 36.8900, 'masculino', ARRAY['feminino']::text[], ARRAY['Surf','Crossfit','Música ao vivo','Café','Viagens'], 'Médico. Tenta acompanhar-me numa caminhada ao amanhecer.', true,
    ARRAY['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80']),
  (gen_random_uuid(), 'Luísa', 26, 'Tete', 'Moçambique', -16.1564, 33.5867, 'feminino', ARRAY['masculino']::text[], ARRAY['Trail','Cozinhar','Vinho','Cinema','Fotografia'], 'Geóloga. Felicidade é tenda, fogueira e silêncio.', true,
    ARRAY['https://images.unsplash.com/photo-1496360166961-10a51d5f367a?w=900&q=80','https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=900&q=80','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80']),
  (gen_random_uuid(), 'Vasco', 32, 'Tete', 'Moçambique', -16.1600, 33.5900, 'masculino', ARRAY['feminino']::text[], ARRAY['Pesca','Whisky','Trail','Música','Cães'], 'Engenheiro de minas. Vida simples: rio, churrasco, amigos.', false,
    ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80']),
  (gen_random_uuid(), 'Eva', 25, 'Amesterdão', 'Países Baixos', 52.3676, 4.9041, 'woman', ARRAY['man']::text[], ARRAY['Bicicleta','Museus','Café','Vinho','Viagens'], 'UX designer. Os meus domingos são Vondelpark + sebentas + flat white.', true,
    ARRAY['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80','https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=900&q=80','https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=80']),
  (gen_random_uuid(), 'Lotte', 27, 'Amesterdão', 'Países Baixos', 52.3700, 4.8900, 'woman', ARRAY['man','woman']::text[], ARRAY['Brunch','Concertos','Arte','Moda','Cães'], 'Arquiteta freelancer. Vai um café no De Pijp?', true,
    ARRAY['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80','https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=900&q=80','https://images.unsplash.com/photo-1521252659862-eec69941b071?w=900&q=80']),
  (gen_random_uuid(), 'Sanne', 23, 'Amesterdão', 'Países Baixos', 52.3760, 4.8920, 'woman', ARRAY['man']::text[], ARRAY['Yoga','Vegetariano','Cinema','Livros','Café'], 'Estudante de psicologia. Adoro debates longos e silêncios confortáveis.', false,
    ARRAY['https://images.unsplash.com/photo-1503467913725-d8e9b4cba432?w=900&q=80','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=900&q=80','https://images.unsplash.com/photo-1496440737103-cd596325d314?w=900&q=80']),
  (gen_random_uuid(), 'Daan', 28, 'Amesterdão', 'Países Baixos', 52.3650, 4.9100, 'man', ARRAY['woman']::text[], ARRAY['Bicicleta','Cerveja artesanal','Cinema','Viagens','Música'], 'Product manager. Provo cervejas como outros provam vinho.', true,
    ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80']),
  (gen_random_uuid(), 'Lars', 31, 'Amesterdão', 'Países Baixos', 52.3590, 4.8870, 'man', ARRAY['woman']::text[], ARRAY['Padel','Vinho','Sushi','Viagens','Música ao vivo'], 'Engenheiro de software dinamarquês em Amesterdão há 4 anos.', true,
    ARRAY['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80']),
  (gen_random_uuid(), 'Sam', 26, 'Maputo', 'Moçambique', -25.9700, 32.5800, 'nao_binario', ARRAY['feminino','masculino','nao_binario']::text[], ARRAY['Arte','Concertos','Café','Cinema','Viagens'], 'Curador de arte. Conta-me a tua exposição preferida.', false,
    ARRAY['https://images.unsplash.com/photo-1463453091185-61582044d556?w=900&q=80','https://images.unsplash.com/photo-1521252659862-eec69941b071?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80']),
  (gen_random_uuid(), 'Robin', 24, 'Amesterdão', 'Países Baixos', 52.3680, 4.9000, 'nao_binario', ARRAY['woman','nao_binario']::text[], ARRAY['Música','Cinema','Café','Livros','Bicicleta'], 'DJ nos fins de semana, designer durante a semana.', true,
    ARRAY['https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80'])
),
ins_auth AS (
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  SELECT
    np.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated', 'authenticated',
    'seed+' || np.id::text || '@hunie.app',
    crypt(np.id::text, gen_salt('bf')),
    now(),
    jsonb_build_object('provider','seed','providers',ARRAY['seed']),
    jsonb_build_object('seed', true),
    now(), now(),
    '', '', '', ''
  FROM new_profiles np
  RETURNING id
),
ins_profiles AS (
  INSERT INTO public.profiles (
    id, name, age, city, country, latitude, longitude, gender, interested_in, interests, bio,
    is_verified, is_seed, seed_active, onboarding_completed, onboarding_step, last_active_at,
    membership_tier, membership_status
  )
  SELECT np.id, np.name, np.age, np.city, np.country, np.lat, np.lng, np.gender, np.interested_in, np.interests, np.bio,
         np.verified, true, true, true, 99,
         now() - (random() * interval '6 hours'),
         'free', 'inactive'
  FROM new_profiles np
  RETURNING id
)
INSERT INTO public.profile_photos (profile_id, storage_path, position)
SELECT np.id, photo, (ord - 1)::int
FROM new_profiles np,
     LATERAL unnest(np.photos) WITH ORDINALITY AS p(photo, ord);

SET session_replication_role = DEFAULT;
