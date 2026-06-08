
SET session_replication_role = replica;

DO $$
DECLARE
  v_count int := 400;
  i int;
  v_id uuid;
  v_gender text;
  v_name text;
  v_city text;
  v_lat float8;
  v_lng float8;
  v_age int;
  v_bio text;
  v_interested text[];
  v_interests text[];
  v_verified boolean;
  v_photos text[];
  ci int;
  pi int;
  r int;

  female_names text[] := ARRAY['Ana','Marta','Cláudia','Vera','Lúcia','Tânia','Patrícia','Susana','Mónica','Diana','Isabel','Teresa','Cristina','Andreia','Raquel','Liliana','Cátia','Mafalda','Sara','Margarida','Constança','Madalena','Matilde','Bárbara','Elisa','Vanessa','Daniela','Sílvia','Telma','Adriana','Iara','Aida','Berta','Celina','Dália','Eugénia','Fátima','Glória','Júlia','Kátia','Laura','Marisa','Natália','Olga','Paula','Rosa','Salomé','Tatiana','Verónica','Yasmin','Zélia','Amélia','Clara','Débora','Edna','Flávia','Gabriela','Hélia','Ivone','Letícia','Maíra','Nádia','Olívia','Priscila','Sandra','Tamara','Valéria','Yolanda','Zara'];

  male_names text[] := ARRAY['João','Pedro','Tiago','Rui','Hugo','André','Bruno','Miguel','Daniel','Ricardo','Nuno','Vasco','Diogo','Gonçalo','Henrique','Ivo','Jorge','Luís','Marco','Nelson','Octávio','Paulo','Raul','Sérgio','Tomás','Vítor','Xavier','Aires','Bento','César','Dinis','Edgar','Fábio','Gustavo','Heitor','Ismael','Kevin','Leonardo','Mateus','Nilton','Osvaldo','Rafael','Salvador','Telmo','Ulisses','Válter','Wilson','Yuri','Zacarias','Belmiro','Cândido','Emanuel','Frederico','Gabriel','Hélder','Júlio','Leandro','Mário','Norberto','Renato','Sandro','Vladimir','Yago','Adérito','Joel','Manuel','Damião'];

  nb_names text[] := ARRAY['Sam','Alex','Jordan','Sky','Robin','Drew','Quinn','Eli','River','Casey','Morgan','Avery','Charlie','Dakota','Phoenix','Reese','Sage','Wren','Zion','Kai'];

  cities text[] := ARRAY['Maputo','Matola','Beira','Nampula','Quelimane','Tete','Pemba','Chimoio','Nacala','Xai-Xai','Inhambane','Lichinga'];
  city_lats float8[] := ARRAY[-25.9655,-25.9622,-19.8436,-15.1165,-17.8786,-16.1564,-12.9740,-19.1164,-14.5627,-25.0519,-23.8650,-13.3128];
  city_lngs float8[] := ARRAY[ 32.5832, 32.4589, 34.8389, 39.2666, 36.8883, 33.5867, 40.5178, 33.4833, 40.6728, 33.6442, 35.3833, 35.2406];

  female_bios text[] := ARRAY[
    'Adoro café da manhã longo, livros e quem sabe ouvir.',
    'Procuro alguém que ria com gosto e dance mesmo sem ritmo.',
    'Surfista nos tempos livres, designer durante a semana.',
    'Trabalho com palavras. Conta-me uma boa história.',
    'Brunch ao domingo é sagrado. Vinho à sexta também.',
    'Veterinária. O meu cão é o filtro do primeiro encontro.',
    'Apaixonada por mercados, viagens e fim de tarde na praia.',
    'Yoga, cozinhar, repetir. Procuro alguém genuíno.',
    'Coleciono pôr-do-sóis e cafés torrados na hora.',
    'Fotógrafa freelancer. Boa luz e boa conversa, basta.'
  ];

  male_bios text[] := ARRAY[
    'Engenheiro civil. Fim de semana é Bilene, segunda é gym.',
    'Médico nos dias úteis, surfista aos sábados.',
    'Empresário. Filho da cidade, cidadão do mundo.',
    'Programador. Café duplo, código, repetir.',
    'Chef. Se gostas de comer bem, já temos um tema.',
    'Skipper. Se nunca dormiste num barco, devias.',
    'Advogado, atleta nos tempos livres. Procuro alguém genuíno.',
    'Produtor musical. Perco-me em concertos e mercados.',
    'Diretor de marketing. Conta-me a tua viagem favorita.',
    'Trail runner. Se topas amanhecer no Bilene, fala comigo.'
  ];

  nb_bios text[] := ARRAY[
    'Arte, café e boas conversas. Sem rótulos.',
    'A vida é demasiado curta para fingires quem não és.',
    'Adoro concertos pequenos, livros estranhos e cães grandes.',
    'Crio coisas. Pinto, escrevo, cozinho. Vem provar.'
  ];

  fp1 text[] := ARRAY['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&q=80','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=900&q=80','https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900&q=80'];
  fp2 text[] := ARRAY['https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=900&q=80','https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=900&q=80','https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&q=80'];
  fp3 text[] := ARRAY['https://images.unsplash.com/photo-1496440737103-cd596325d314?w=900&q=80','https://images.unsplash.com/photo-1521252659862-eec69941b071?w=900&q=80','https://images.unsplash.com/photo-1503467913725-d8e9b4cba432?w=900&q=80'];
  fp4 text[] := ARRAY['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=900&q=80','https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=900&q=80','https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=900&q=80'];
  fp5 text[] := ARRAY['https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=900&q=80','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=900&q=80','https://images.unsplash.com/photo-1496360166961-10a51d5f367a?w=900&q=80'];
  fp6 text[] := ARRAY['https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=900&q=80','https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=900&q=80','https://images.unsplash.com/photo-1502767089025-6572583495b9?w=900&q=80'];

  mp1 text[] := ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80','https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80'];
  mp2 text[] := ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80','https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=900&q=80','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=900&q=80'];
  mp3 text[] := ARRAY['https://images.unsplash.com/photo-1463453091185-61582044d556?w=900&q=80','https://images.unsplash.com/photo-1499714608240-22fc6ad53fb2?w=900&q=80','https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=900&q=80'];
  mp4 text[] := ARRAY['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=900&q=80','https://images.unsplash.com/photo-1502720433255-614171a1835e?w=900&q=80','https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=80'];

  fi1 text[] := ARRAY['Yoga','Café','Praia','Cinema','Música'];
  fi2 text[] := ARRAY['Pilates','Brunch','Moda','Cães','Viagens'];
  fi3 text[] := ARRAY['Dança','Concertos','Arte','Fotografia','Vinho'];
  fi4 text[] := ARRAY['Trail running','Livros','Astrologia','Praia','Cozinhar'];
  fi5 text[] := ARRAY['Surf','Mergulho','Café','Viagens','Música'];
  fi6 text[] := ARRAY['Cinema','Vinho','Brunch','Tatuagens','Cães'];

  mi1 text[] := ARRAY['Surf','Whisky','Trail','Música ao vivo','Cozinhar'];
  mi2 text[] := ARRAY['Padel','Cinema','Vinho','Viagens','Fotografia'];
  mi3 text[] := ARRAY['BJJ','Sushi','Cinema','Viagens','Cães'];
  mi4 text[] := ARRAY['Crossfit','Vinho','Cinema','Viagens','Fotografia'];
  mi5 text[] := ARRAY['Pesca','Cerveja artesanal','Trail','Cães','Cozinhar'];
  mi6 text[] := ARRAY['Futebol','Sushi','Cinema','Viagens','Música'];
BEGIN
  FOR i IN 1..v_count LOOP
    v_id := gen_random_uuid();

    CASE
      WHEN random() < 0.45 THEN v_gender := 'feminino';
      WHEN random() < 0.90 THEN v_gender := 'masculino';
      ELSE v_gender := 'nao_binario';
    END CASE;

    IF v_gender = 'feminino' THEN
      v_name := female_names[1 + floor(random() * array_length(female_names,1))::int];
      v_bio := female_bios[1 + floor(random() * array_length(female_bios,1))::int];
      v_interested := CASE WHEN random() < 0.85 THEN ARRAY['masculino']::text[] ELSE ARRAY['masculino','feminino']::text[] END;
      r := 1 + floor(random()*6)::int;
      v_interests := CASE r WHEN 1 THEN fi1 WHEN 2 THEN fi2 WHEN 3 THEN fi3 WHEN 4 THEN fi4 WHEN 5 THEN fi5 ELSE fi6 END;
      r := 1 + floor(random()*6)::int;
      v_photos := CASE r WHEN 1 THEN fp1 WHEN 2 THEN fp2 WHEN 3 THEN fp3 WHEN 4 THEN fp4 WHEN 5 THEN fp5 ELSE fp6 END;
    ELSIF v_gender = 'masculino' THEN
      v_name := male_names[1 + floor(random() * array_length(male_names,1))::int];
      v_bio := male_bios[1 + floor(random() * array_length(male_bios,1))::int];
      v_interested := CASE WHEN random() < 0.85 THEN ARRAY['feminino']::text[] ELSE ARRAY['feminino','nao_binario']::text[] END;
      r := 1 + floor(random()*6)::int;
      v_interests := CASE r WHEN 1 THEN mi1 WHEN 2 THEN mi2 WHEN 3 THEN mi3 WHEN 4 THEN mi4 WHEN 5 THEN mi5 ELSE mi6 END;
      r := 1 + floor(random()*4)::int;
      v_photos := CASE r WHEN 1 THEN mp1 WHEN 2 THEN mp2 WHEN 3 THEN mp3 ELSE mp4 END;
    ELSE
      v_name := nb_names[1 + floor(random() * array_length(nb_names,1))::int];
      v_bio := nb_bios[1 + floor(random() * array_length(nb_bios,1))::int];
      v_interested := ARRAY['masculino','feminino','nao_binario']::text[];
      r := 1 + floor(random()*6)::int;
      v_interests := CASE r WHEN 1 THEN fi1 WHEN 2 THEN fi3 WHEN 3 THEN fi5 WHEN 4 THEN mi2 WHEN 5 THEN mi4 ELSE mi6 END;
      r := 1 + floor(random()*4)::int;
      v_photos := CASE r WHEN 1 THEN fp3 WHEN 2 THEN mp3 WHEN 3 THEN fp1 ELSE mp1 END;
    END IF;

    ci := 1 + floor(random() * array_length(cities,1))::int;
    v_city := cities[ci];
    v_lat := city_lats[ci] + (random() - 0.5) * 0.05;
    v_lng := city_lngs[ci] + (random() - 0.5) * 0.05;

    v_age := 21 + floor(random() * 18)::int;
    v_verified := random() < 0.55;

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
      'seed+' || v_id::text || '@hunie.app',
      crypt(v_id::text, gen_salt('bf')),
      now(),
      jsonb_build_object('provider','seed','providers',ARRAY['seed']),
      jsonb_build_object('seed', true),
      now(), now(), '', '', '', ''
    );

    INSERT INTO public.profiles (
      id, name, age, city, country, latitude, longitude, gender, interested_in, interests, bio,
      is_verified, is_seed, seed_active, onboarding_completed, onboarding_step, last_active_at,
      membership_tier, membership_status
    ) VALUES (
      v_id, v_name, v_age, v_city, 'Moçambique', v_lat, v_lng, v_gender, v_interested, v_interests, v_bio,
      v_verified, true, true, true, 99,
      now() - (random() * interval '12 hours'),
      'free', 'inactive'
    );

    FOR pi IN 1..array_length(v_photos,1) LOOP
      INSERT INTO public.profile_photos (profile_id, storage_path, position)
      VALUES (v_id, v_photos[pi], pi - 1);
    END LOOP;
  END LOOP;
END $$;

SET session_replication_role = DEFAULT;
