CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  first_name text,
  last_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_email ON public.customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_last_sign_in_at ON public.customer_profiles(last_sign_in_at DESC);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read customer profiles" ON public.customer_profiles;
CREATE POLICY "Authenticated can read customer profiles"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can upsert own customer profile" ON public.customer_profiles;
CREATE POLICY "Authenticated can upsert own customer profile"
  ON public.customer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Authenticated can update own customer profile" ON public.customer_profiles;
CREATE POLICY "Authenticated can update own customer profile"
  ON public.customer_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
