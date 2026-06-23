
SET LOCAL "request.jwt.claim.role" = 'service_role';

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
  i int; pid uuid; age_v int; bd date; face text; sel_int text[]; sel_ph text[];
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  FOR i IN 1..array_length(names,1) LOOP
    SELECT id INTO pid FROM public.profiles
    WHERE name = names[i] AND (city IS NULL OR city = 'Roterdão')
    ORDER BY created_at DESC LIMIT 1;
    IF pid IS NULL THEN CONTINUE; END IF;

    age_v := 20 + floor(random()*15)::int;
    bd := (current_date - (age_v * 365 + floor(random()*300)::int))::date;
    face := 'https://randomuser.me/api/portraits/women/' || floor(random()*99)::int || '.jpg';

    SELECT array_agg(x) INTO sel_int FROM (SELECT unnest(interests_pool) AS x ORDER BY random() LIMIT 4) t;
    SELECT array_agg(x) INTO sel_ph  FROM (SELECT unnest(photos_pool)    AS x ORDER BY random() LIMIT 3) t;

    UPDATE public.profiles SET
      age = age_v, birthdate = bd, city = 'Roterdão', country = 'NL',
      latitude = 51.9244 + (random()-0.5)*0.1, longitude = 4.4777 + (random()-0.5)*0.1,
      bio = bios[1 + floor(random()*array_length(bios,1))::int],
      gender = 'woman', interests = sel_int, interested_in = ARRAY[]::text[],
      is_verified = true, onboarding_completed = true, onboarding_step = 99,
      is_seed = true, seed_active = true,
      last_active_at = now() - (floor(random()*72)::int * interval '1 hour')
    WHERE id = pid;

    DELETE FROM public.profile_photos WHERE profile_id = pid;
    INSERT INTO public.profile_photos (profile_id, storage_path, position) VALUES
      (pid, face, 0),(pid, sel_ph[1], 1),(pid, sel_ph[2], 2),(pid, sel_ph[3], 3);
  END LOOP;
END $$;

DO $$
DECLARE
  real_user uuid := 'cee7923c-dad3-4272-a5ae-a235acd75d58';
  openers text[] := ARRAY['Oi! Vi o teu perfil e curti muito 😊','Olá, como estás?','Heyy, bom te conhecer aqui','Boa noite! Adorei as tuas fotos','Olá! Que coincidência ver-te aqui'];
  replies text[] := ARRAY['Obrigada 😄 e tu, tudo bem?','Tudo ótimo! Como tem sido a tua semana?','Haha, obrigada! O que costumas fazer ao fim-de-semana?','Estou bem sim, e tu?','Que fixe! Conta-me mais sobre ti','Em Roterdão também? Conheces algum bom café?','Vamos combinar um café qualquer dia destes?'];
  seed_id uuid; m_id uuid; cnt int := 0; a uuid; b uuid;
  msg_count int; k int; i int; sender uuid; ts timestamptz; pool uuid[];
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  SELECT array_agg(p.id ORDER BY random()) INTO pool
  FROM public.profiles p
  WHERE p.is_seed = true AND p.seed_active = true
    AND p.city = 'Roterdão' AND p.gender = 'woman'
    AND p.id NOT IN (
      SELECT swiper_id FROM public.swipes WHERE swiped_id = real_user
      UNION SELECT user_a FROM public.matches WHERE user_b = real_user
      UNION SELECT user_b FROM public.matches WHERE user_a = real_user
    );
  IF pool IS NULL THEN RETURN; END IF;

  FOR k IN 1..6 LOOP
    seed_id := pool[cnt+1]; cnt := cnt+1; EXIT WHEN seed_id IS NULL;
    INSERT INTO public.swipes (swiper_id, swiped_id, direction, created_at)
    VALUES (seed_id, real_user, 'like', now() - (floor(random()*48)::int * interval '1 hour'))
    ON CONFLICT DO NOTHING;
  END LOOP;

  FOR k IN 1..4 LOOP
    seed_id := pool[cnt+1]; cnt := cnt+1; EXIT WHEN seed_id IS NULL;
    IF real_user < seed_id THEN a := real_user; b := seed_id; ELSE a := seed_id; b := real_user; END IF;
    ts := now() - (floor(random()*72)::int * interval '1 hour');
    INSERT INTO public.matches (user_a, user_b, created_at, last_message_at) VALUES (a,b,ts,ts) ON CONFLICT DO NOTHING;
  END LOOP;

  FOR k IN 1..3 LOOP
    seed_id := pool[cnt+1]; cnt := cnt+1; EXIT WHEN seed_id IS NULL;
    IF real_user < seed_id THEN a := real_user; b := seed_id; ELSE a := seed_id; b := real_user; END IF;
    ts := now() - (floor(random()*120 + 24)::int * interval '1 hour');
    INSERT INTO public.matches (user_a, user_b, created_at, last_message_at) VALUES (a,b,ts,ts) RETURNING id INTO m_id;
    IF m_id IS NULL THEN CONTINUE; END IF;
    msg_count := 5 + floor(random()*3)::int;
    FOR i IN 1..msg_count LOOP
      ts := ts + (floor(random()*120 + 5)::int * interval '1 minute');
      sender := CASE WHEN i % 2 = 1 THEN seed_id ELSE real_user END;
      INSERT INTO public.messages (match_id, sender_id, content, created_at)
      VALUES (m_id, sender,
        CASE WHEN i = 1 THEN openers[1 + floor(random()*array_length(openers,1))::int]
             ELSE replies[1 + floor(random()*array_length(replies,1))::int] END,
        ts);
    END LOOP;
    UPDATE public.matches SET last_message_at = ts WHERE id = m_id;
    m_id := NULL;
  END LOOP;
END $$;
