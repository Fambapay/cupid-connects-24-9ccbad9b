
DO $$
DECLARE
  seeds jsonb := $j$[
    {"name":"Sanne","age":26,"city":"Amesterdão","lat":52.3676,"lng":4.9041,"gender":"woman","interested_in":["man"],"bio":"Adoro bicicletas, café e canais ao pôr-do-sol.","interests":["viagens","café","arte"],"photos":["https://randomuser.me/api/portraits/women/12.jpg","https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80","https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80"]},
    {"name":"Lieke","age":29,"city":"Amesterdão","lat":52.3676,"lng":4.9041,"gender":"woman","interested_in":["man"],"bio":"Designer holandesa apaixonada por cozinha portuguesa.","interests":["design","culinária","música"],"photos":["https://randomuser.me/api/portraits/women/22.jpg","https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80","https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80"]},
    {"name":"Anouk","age":24,"city":"Roterdão","lat":51.9244,"lng":4.4777,"gender":"woman","interested_in":["man"],"bio":"Arquitetura, livros e fins-de-semana em Lisboa.","interests":["leitura","arquitetura"],"photos":["https://randomuser.me/api/portraits/women/33.jpg","https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80","https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800&q=80"]},
    {"name":"Eva","age":31,"city":"Haia","lat":52.0705,"lng":4.3007,"gender":"woman","interested_in":["man"],"bio":"Praia de Scheveningen e jantares longos.","interests":["praia","vinho"],"photos":["https://randomuser.me/api/portraits/women/44.jpg","https://images.unsplash.com/photo-1496440737103-cd596325d314?w=800&q=80","https://images.unsplash.com/photo-1521252659862-eec69941b071?w=800&q=80"]},
    {"name":"Mariana","age":27,"city":"Amesterdão","lat":52.3676,"lng":4.9041,"gender":"woman","interested_in":["man"],"bio":"Mestrado em Amesterdão, raízes em Maputo.","interests":["fotografia","dança"],"photos":["https://randomuser.me/api/portraits/women/55.jpg","https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80","https://images.unsplash.com/photo-1542596594-649edbc13630?w=800&q=80"]},
    {"name":"Fenna","age":25,"city":"Utrecht","lat":52.0907,"lng":5.1214,"gender":"woman","interested_in":["man"],"bio":"Yoga, brunch e road trips pelos Países Baixos.","interests":["yoga","viagens"],"photos":["https://randomuser.me/api/portraits/women/66.jpg","https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80","https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=800&q=80"]},
    {"name":"Daan","age":30,"city":"Amesterdão","lat":52.3676,"lng":4.9041,"gender":"man","interested_in":["woman"],"bio":"Engenheiro a viver entre Amesterdão e a Beira.","interests":["tecnologia","corrida"],"photos":["https://randomuser.me/api/portraits/men/12.jpg","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80"]},
    {"name":"Sven","age":28,"city":"Roterdão","lat":51.9244,"lng":4.4777,"gender":"man","interested_in":["woman"],"bio":"Fotógrafo. Procuro alguém para explorar a cidade.","interests":["fotografia","cinema"],"photos":["https://randomuser.me/api/portraits/men/24.jpg","https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&q=80","https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&q=80"]},
    {"name":"Bruno NL","age":33,"city":"Haia","lat":52.0705,"lng":4.3007,"gender":"man","interested_in":["woman"],"bio":"Moçambicano em Haia, fã de surf e Tofo.","interests":["surf","viagens"],"photos":["https://randomuser.me/api/portraits/men/36.jpg","https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80","https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80"]},
    {"name":"Lucas","age":27,"city":"Utrecht","lat":52.0907,"lng":5.1214,"gender":"man","interested_in":["woman"],"bio":"Café especial, vinis e bicicleta todos os dias.","interests":["café","música"],"photos":["https://randomuser.me/api/portraits/men/48.jpg","https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80","https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&q=80"]},
    {"name":"Thijs","age":31,"city":"Amesterdão","lat":52.3676,"lng":4.9041,"gender":"man","interested_in":["woman"],"bio":"Chef num bistro do Jordaan. Cozinho para a primeira data.","interests":["culinária","vinho"],"photos":["https://randomuser.me/api/portraits/men/57.jpg","https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800&q=80","https://images.unsplash.com/photo-1517630800677-932d836ab680?w=800&q=80"]},
    {"name":"Joao NL","age":29,"city":"Roterdão","lat":51.9244,"lng":4.4777,"gender":"man","interested_in":["woman"],"bio":"Português a viver em Roterdão, sempre a viajar.","interests":["viagens","futebol"],"photos":["https://randomuser.me/api/portraits/men/68.jpg","https://images.unsplash.com/photo-1502764613149-7f1d229e230f?w=800&q=80","https://images.unsplash.com/photo-1521119989659-a83eee488004?w=800&q=80"]}
  ]$j$::jsonb;
  s jsonb;
  new_id uuid;
  slug text;
  eml text;
  photo_url text;
  idx int;
BEGIN
  FOR s IN SELECT * FROM jsonb_array_elements(seeds) LOOP
    slug := lower(regexp_replace((s->>'name') || '-' || (s->>'city'), '[^a-zA-Z0-9]+', '-', 'g'));
    eml := 'seed-' || slug || '@seeds.hunie.local';

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = eml) THEN
      CONTINUE;
    END IF;

    new_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      new_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      eml, crypt(gen_random_uuid()::text, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('is_seed', true, 'name', s->>'name'),
      now(), now(), '', '', '', ''
    );

    INSERT INTO public.profiles (
      id, name, age, birthdate, city, country, latitude, longitude, bio,
      gender, interests, interested_in, is_verified, is_paused, is_incognito,
      membership_tier, membership_status, onboarding_completed, onboarding_step,
      is_seed, seed_active, last_active_at
    ) VALUES (
      new_id, s->>'name', (s->>'age')::int,
      make_date(extract(year from now())::int - (s->>'age')::int, 6, 15),
      s->>'city', 'Holanda', (s->>'lat')::float8, (s->>'lng')::float8, s->>'bio',
      s->>'gender',
      ARRAY(SELECT jsonb_array_elements_text(s->'interests')),
      ARRAY(SELECT jsonb_array_elements_text(s->'interested_in')),
      true, false, false, 'free', 'inactive', true, 99, true, true,
      now() - (random() * interval '3 days')
    ) ON CONFLICT (id) DO NOTHING;

    idx := 0;
    FOR photo_url IN SELECT jsonb_array_elements_text(s->'photos') LOOP
      INSERT INTO public.profile_photos (profile_id, storage_path, position)
      VALUES (new_id, photo_url, idx);
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;
