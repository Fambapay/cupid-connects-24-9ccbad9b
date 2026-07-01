
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS looking_for text,
  ADD COLUMN IF NOT EXISTS pets text,
  ADD COLUMN IF NOT EXISTS smoking text,
  ADD COLUMN IF NOT EXISTS drinking text,
  ADD COLUMN IF NOT EXISTS workout text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_looking_for_check,
  DROP CONSTRAINT IF EXISTS profiles_pets_check,
  DROP CONSTRAINT IF EXISTS profiles_smoking_check,
  DROP CONSTRAINT IF EXISTS profiles_drinking_check,
  DROP CONSTRAINT IF EXISTS profiles_workout_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_looking_for_check
    CHECK (looking_for IS NULL OR looking_for IN ('short_term','long_term','friendship','undecided')),
  ADD CONSTRAINT profiles_pets_check
    CHECK (pets IS NULL OR pets IN ('dog','cat','both','other','none')),
  ADD CONSTRAINT profiles_smoking_check
    CHECK (smoking IS NULL OR smoking IN ('never','social','regular','quitting')),
  ADD CONSTRAINT profiles_drinking_check
    CHECK (drinking IS NULL OR drinking IN ('never','social','regular','sober')),
  ADD CONSTRAINT profiles_workout_check
    CHECK (workout IS NULL OR workout IN ('never','sometimes','often','daily'));
