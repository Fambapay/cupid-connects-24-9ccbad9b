DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM auth.users LOOP
    DELETE FROM auth.users WHERE id = r.id;
  END LOOP;
END $$;