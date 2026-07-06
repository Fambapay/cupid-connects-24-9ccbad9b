
SET session_replication_role = replica;

WITH new_profiles(id, name, age, city, country, lat, lng, gender, interested_in, interests, bio, height_cm, looking_for, photos) AS (
  VALUES
  (gen_random_uuid(),'Fenna'::text,27,'Amsterdam'::text,'NL'::text,52.3702::float8,4.8952::float8,'woman'::text,ARRAY['man']::text[],ARRAY['Ciclismo','Café','Jazz']::text[],'Ciclista de fim-de-semana. Café forte, jazz baixinho.'::text,171::smallint,'long_term'::text,
    ARRAY['https://randomuser.me/api/portraits/women/31.jpg','https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80']::text[]),
  (gen_random_uuid(),'Bram',30,'Amsterdam','NL',52.3595,4.9020,'man',ARRAY['woman']::text[],ARRAY['Arquitectura','Barcos','Vinho'],'Arquitecto. Fim-de-semana em barcos pelos canais.',184::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/31.jpg','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80']),
  (gen_random_uuid(),'Anouk',26,'Rotterdam','NL',51.9250,4.4800,'woman',ARRAY['man']::text[],ARRAY['Fotografia','Arte','Viagens'],'Fotógrafa de rua. Rotterdam skyline é o meu escritório.',168::smallint,'short_term',
    ARRAY['https://randomuser.me/api/portraits/women/32.jpg','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80']),
  (gen_random_uuid(),'Sem',29,'Rotterdam','NL',51.9200,4.4700,'man',ARRAY['woman']::text[],ARRAY['Barcos','Viagens','Surf'],'Engenheiro naval. À procura de alguém para explorar Portugal.',188::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/32.jpg','https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80']),
  (gen_random_uuid(),'Noa',24,'Utrecht','NL',52.0910,5.1210,'woman',ARRAY['man','woman']::text[],ARRAY['Livros','Natação','Yoga'],'Estudante de medicina. Livros, cerveja artesanal, natação.',165::smallint,'undecided',
    ARRAY['https://randomuser.me/api/portraits/women/33.jpg','https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80','https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&q=80']),
  (gen_random_uuid(),'Daan',28,'Utrecht','NL',52.0900,5.1150,'man',ARRAY['woman']::text[],ARRAY['Corrida','Tecnologia','Café'],'Dev backend. Trail runner. Café de especialidade.',180::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/33.jpg','https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=800&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&q=80']),
  (gen_random_uuid(),'Maud',31,'Haia','NL',52.0705,4.3007,'woman',ARRAY['man']::text[],ARRAY['Praia','Corrida','Arte'],'Consultora. Adoro Scheveningen ao amanhecer.',173::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/women/34.jpg','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80','https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80']),
  (gen_random_uuid(),'Luuk',32,'Haia','NL',52.0770,4.3100,'man',ARRAY['woman']::text[],ARRAY['Música','Política','Squash'],'Diplomata júnior. Piano e squash.',186::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/34.jpg','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80','https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=800&q=80']),
  (gen_random_uuid(),'Sophie',25,'Eindhoven','NL',51.4416,5.4697,'woman',ARRAY['man']::text[],ARRAY['Design','Festivais','Arte'],'Designer industrial. Fim-de-semana entre festivais e workshops.',170::smallint,'short_term',
    ARRAY['https://randomuser.me/api/portraits/women/35.jpg','https://images.unsplash.com/photo-1499651681375-8afc5a4db253?w=800&q=80','https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80']),
  (gen_random_uuid(),'Thijs',27,'Eindhoven','NL',51.4400,5.4680,'man',ARRAY['woman']::text[],ARRAY['Skate','Tecnologia','Música'],'Programador de dia, skater à noite.',182::smallint,'short_term',
    ARRAY['https://randomuser.me/api/portraits/men/35.jpg','https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=800&q=80','https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80']),
  (gen_random_uuid(),'Roos',28,'Groningen','NL',53.2194,6.5665,'woman',ARRAY['man']::text[],ARRAY['Ciclismo','Natureza','Viagens'],'Enfermeira. Ciclismo até ao mar do norte.',172::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/women/36.jpg','https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80','https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80']),
  (gen_random_uuid(),'Finn',26,'Groningen','NL',53.2200,6.5700,'man',ARRAY['woman']::text[],ARRAY['Ciência','Mergulho','Cerveja'],'Biólogo marinho. Peixes, cerveja e boa conversa.',179::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/36.jpg','https://images.unsplash.com/photo-1520975916090-3105956dac38?w=800&q=80','https://images.unsplash.com/photo-1502767089025-6572583495b0?w=800&q=80']),
  (gen_random_uuid(),'Emma',29,'Haarlem','NL',52.3874,4.6462,'woman',ARRAY['man']::text[],ARRAY['Gastronomia','Arte','Cinema'],'Chef pasteleira. Vem provar o meu stroopwafel caseiro.',167::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/women/37.jpg','https://images.unsplash.com/photo-1524638431109-93d95c968f03?w=800&q=80','https://images.unsplash.com/photo-1499887142886-791eca5918cd?w=800&q=80']),
  (gen_random_uuid(),'Jesse',30,'Haarlem','NL',52.3860,4.6500,'man',ARRAY['woman']::text[],ARRAY['Música','Viagens','Livros'],'Músico. Guitarra, tulipas e conversas longas.',181::smallint,'short_term',
    ARRAY['https://randomuser.me/api/portraits/men/37.jpg','https://images.unsplash.com/photo-1502980426475-b83966705988?w=800&q=80','https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80']),
  (gen_random_uuid(),'Julia',26,'Nijmegen','NL',51.8126,5.8372,'woman',ARRAY['man']::text[],ARRAY['Kayak','Direito','Café'],'Estudante de direito. Ando de kayak no Waal.',169::smallint,'undecided',
    ARRAY['https://randomuser.me/api/portraits/women/38.jpg','https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80','https://images.unsplash.com/photo-1502764613149-7f1d229e230f?w=800&q=80']),
  (gen_random_uuid(),'Tim',31,'Nijmegen','NL',51.8100,5.8400,'man',ARRAY['woman']::text[],ARRAY['História','Ciclismo','Livros'],'Professor de história. Fanático por bicicletas antigas.',185::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/38.jpg','https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80','https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&q=80']),
  (gen_random_uuid(),'Iris',27,'Delft','NL',52.0116,4.3571,'woman',ARRAY['man','woman']::text[],ARRAY['Ciência','Arte','Vinho'],'Investigadora TU Delft. Cerâmica azul e vinho tinto.',174::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/women/39.jpg','https://images.unsplash.com/photo-1502378735452-bc7d86632805?w=800&q=80','https://images.unsplash.com/photo-1495562569060-2eec283d3391?w=800&q=80']),
  (gen_random_uuid(),'Mees',29,'Delft','NL',52.0100,4.3600,'man',ARRAY['woman']::text[],ARRAY['Aviação','Engenharia','Viagens'],'Engenheiro aeroespacial. Piloto amador nos tempos livres.',183::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/39.jpg','https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80','https://images.unsplash.com/photo-1517070208541-6ddc4d3efbcb?w=800&q=80']),
  (gen_random_uuid(),'Fleur',24,'Leiden','NL',52.1601,4.4970,'woman',ARRAY['man']::text[],ARRAY['Botânica','Fotografia','Yoga'],'Bióloga. Fim-de-semana em jardins botânicos.',166::smallint,'short_term',
    ARRAY['https://randomuser.me/api/portraits/women/40.jpg','https://images.unsplash.com/photo-1497551060073-4c5ab6435f12?w=800&q=80','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80']),
  (gen_random_uuid(),'Ruben',28,'Leiden','NL',52.1620,4.5000,'man',ARRAY['woman']::text[],ARRAY['Literatura','Cinema','Viagens'],'Escritor. Café de manhã, cerveja belga à noite.',180::smallint,'long_term',
    ARRAY['https://randomuser.me/api/portraits/men/40.jpg','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80'])
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
    'authenticated','authenticated',
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
    membership_tier, membership_status, height_cm, looking_for
  )
  SELECT np.id, np.name, np.age, np.city, np.country, np.lat, np.lng, np.gender, np.interested_in, np.interests, np.bio,
         true, true, true, true, 99,
         now() - (random() * interval '6 hours'),
         'free','inactive', np.height_cm, np.looking_for
  FROM new_profiles np
  RETURNING id
)
INSERT INTO public.profile_photos (profile_id, storage_path, position)
SELECT np.id, photo, (ord - 1)::int
FROM new_profiles np,
     LATERAL unnest(np.photos) WITH ORDINALITY AS p(photo, ord);

SET session_replication_role = DEFAULT;
