
-- 1. Add user as admin (uses their email)
INSERT INTO public.admin_emails (email)
SELECT lower(email) FROM auth.users WHERE id = 'cee7923c-dad3-4272-a5ae-a235acd75d58'
ON CONFLICT (email) DO NOTHING;

-- 2. Create 20 women seeds in Rotterdam
DO $$
DECLARE
  names text[] := ARRAY['Sofia','Emma','Julia','Mila','Lotte','Anna','Eva','Lisa','Noor','Tess','Sara','Lara','Iris','Fleur','Yara','Nina','Lieke','Maud','Roos','Sanne'];
  bios text[] := ARRAY[
    'Adoro café, viagens e boas conversas ☕✈️',
    'Procuro alguém genuíno para partilhar momentos',
    'Fotógrafa amadora, fã de pôr-do-sol 📸',
    'Sempre a explorar a cidade de bicicleta 🚲',
    'Brunch aos domingos é sagrado 🥐',
    'Apaixonada por arte, livros e música indie',
    'Yoga, natureza e amigos próximos 🌿',
    'Curiosa, viajante e sempre a aprender',
    'Cinéfila assumida — recomenda-me um filme!',
    'Dança, risadas e boa companhia ✨'
  ];
  interests_pool text[] := ARRAY['Café','Viagens','Música','Cinema','Livros','Yoga','Fotografia','Arte','Caminhadas','Natação','Gastronomia','Bicicleta','Dança','Vinho','Brunch','Praia','Festivais'];
  photos_pool text[] := ARRAY[
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
    'https://images.unsplash.com/photo-1499714608240-22fc6ad53fb2?w=800&q=80',
    'https://images.unsplash.com/photo-1500649297466-74794c70acfc?w=800&q=80',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80'
  ];
  i int;
  new_id uuid;
  age_v int;
  bd date;
  face text;
  selected_interests text[];
  selected_photos text[];
  email_v text;
BEGIN
  FOR i IN 1..array_length(names,1) LOOP
    new_id := gen_random_uuid();
    age_v := 20 + floor(random()*15)::int;
    bd := (current_date - (age_v * 365 + floor(random()*300)::int))::date;
    face := 'https://randomuser.me/api/portraits/women/' || floor(random()*99)::int || '.jpg';
    email_v := 'seed-nl-' || lower(names[i]) || '-' || substr(new_id::text,1,8) || '@seeds.hunie.local';

    -- random 4 interests
    SELECT array_agg(x) INTO selected_interests FROM (
      SELECT unnest(interests_pool) AS x ORDER BY random() LIMIT 4
    ) t;
    -- random 3 photos + face
    SELECT array_agg(x) INTO selected_photos FROM (
      SELECT unnest(photos_pool) AS x ORDER BY random() LIMIT 3
    ) t;

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      email_v, crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('is_seed', true, 'name', names[i]),
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), new_id, new_id::text, 'email',
      jsonb_build_object('sub', new_id::text, 'email', email_v, 'email_verified', true),
      now(), now(), now()
    );

    INSERT INTO public.profiles (
      id, name, age, birthdate, city, country, latitude, longitude, bio,
      gender, interests, interested_in, is_verified, is_paused, is_incognito,
      membership_tier, membership_status, onboarding_completed, onboarding_step,
      is_seed, seed_active, last_active_at
    ) VALUES (
      new_id, names[i], age_v, bd, 'Roterdão', 'NL',
      51.9244 + (random()-0.5)*0.1, 4.4777 + (random()-0.5)*0.1,
      bios[1 + floor(random()*array_length(bios,1))::int],
      'woman', selected_interests, ARRAY[]::text[],
      true, false, false, 'free', 'inactive', true, 99,
      true, true, now() - (floor(random()*72)::int * interval '1 hour')
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profile_photos (profile_id, storage_path, position)
    VALUES (new_id, face, 0);
    INSERT INTO public.profile_photos (profile_id, storage_path, position)
    VALUES (new_id, selected_photos[1], 1),
           (new_id, selected_photos[2], 2),
           (new_id, selected_photos[3], 3);
  END LOOP;
END $$;

-- 3. Populate interactions for Huncho (cee7923c-dad3-4272-a5ae-a235acd75d58)
DO $$
DECLARE
  real_user uuid := 'cee7923c-dad3-4272-a5ae-a235acd75d58';
  openers text[] := ARRAY[
    'Oi! Vi o teu perfil e curti muito 😊',
    'Olá, como estás?',
    'Heyy, bom te conhecer aqui',
    'Boa noite! Adorei as tuas fotos',
    'Olá! Que coincidência ver-te aqui'
  ];
  replies text[] := ARRAY[
    'Obrigada 😄 e tu, tudo bem?',
    'Tudo ótimo! Como tem sido a tua semana?',
    'Haha, obrigada! O que costumas fazer ao fim-de-semana?',
    'Estou bem sim, e tu?',
    'Que fixe! Conta-me mais sobre ti',
    'Em Roterdão também? Conheces algum bom café?',
    'Vamos combinar um café qualquer dia destes?'
  ];
  seed_id uuid;
  m_id uuid;
  cnt int;
  a uuid; b uuid;
  msg_count int;
  k int;
  sender uuid;
  ts timestamptz;
  pool uuid[];
BEGIN
  -- Build pool of fresh seeds in Roterdão not yet related to real_user
  SELECT array_agg(p.id) INTO pool
  FROM public.profiles p
  WHERE p.is_seed = true AND p.seed_active = true
    AND p.city = 'Roterdão' AND p.gender = 'woman'
    AND p.id NOT IN (
      SELECT swiper_id FROM public.swipes WHERE swiped_id = real_user
      UNION SELECT user_a FROM public.matches WHERE user_b = real_user
      UNION SELECT user_b FROM public.matches WHERE user_a = real_user
    );

  -- shuffle
  SELECT array_agg(id ORDER BY random()) INTO pool FROM unnest(pool) AS id;

  cnt := 0;

  -- 6 likes received (only one-sided like → "Liked Me")
  FOR k IN 1..6 LOOP
    seed_id := pool[cnt+1]; cnt := cnt+1;
    IF seed_id IS NULL THEN EXIT; END IF;
    INSERT INTO public.swipes (swiper_id, swiped_id, direction, created_at)
    VALUES (seed_id, real_user, 'like', now() - (floor(random()*48)::int * interval '1 hour'))
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 4 empty matches (insert directly, no messages)
  FOR k IN 1..4 LOOP
    seed_id := pool[cnt+1]; cnt := cnt+1;
    IF seed_id IS NULL THEN EXIT; END IF;
    IF real_user < seed_id THEN a := real_user; b := seed_id; ELSE a := seed_id; b := real_user; END IF;
    ts := now() - (floor(random()*72)::int * interval '1 hour');
    INSERT INTO public.matches (user_a, user_b, created_at, last_message_at)
    VALUES (a, b, ts, ts)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 3 matches with chats
  FOR k IN 1..3 LOOP
    seed_id := pool[cnt+1]; cnt := cnt+1;
    IF seed_id IS NULL THEN EXIT; END IF;
    IF real_user < seed_id THEN a := real_user; b := seed_id; ELSE a := seed_id; b := real_user; END IF;
    ts := now() - (floor(random()*120 + 24)::int * interval '1 hour');
    INSERT INTO public.matches (user_a, user_b, created_at, last_message_at)
    VALUES (a, b, ts, ts)
    RETURNING id INTO m_id;
    IF m_id IS NULL THEN CONTINUE; END IF;

    msg_count := 5 + floor(random()*3)::int;
    FOR i IN 1..msg_count LOOP
      ts := ts + (floor(random()*120 + 5)::int * interval '1 minute');
      IF i = 1 THEN
        sender := seed_id;
        INSERT INTO public.messages (match_id, sender_id, content, created_at)
        VALUES (m_id, sender, openers[1 + floor(random()*array_length(openers,1))::int], ts);
      ELSE
        sender := CASE WHEN i % 2 = 1 THEN seed_id ELSE real_user END;
        INSERT INTO public.messages (match_id, sender_id, content, created_at)
        VALUES (m_id, sender, replies[1 + floor(random()*array_length(replies,1))::int], ts);
      END IF;
    END LOOP;
    UPDATE public.matches SET last_message_at = ts WHERE id = m_id;
    m_id := NULL;
  END LOOP;
END $$;
