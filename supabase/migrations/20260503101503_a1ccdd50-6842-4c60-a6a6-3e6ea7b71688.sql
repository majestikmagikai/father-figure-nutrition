
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_handle text NOT NULL,
  ingredient_name text NOT NULL,
  summary text,
  benefits jsonb DEFAULT '[]'::jsonb,
  dosage text,
  sources jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_handle, ingredient_name)
);

CREATE INDEX idx_ingredients_handle ON public.ingredients(product_handle);

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read ingredients"
  ON public.ingredients FOR SELECT
  USING (true);
