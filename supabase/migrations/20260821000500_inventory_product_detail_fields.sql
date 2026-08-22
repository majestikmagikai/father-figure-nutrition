ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS full_description text,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS cap_color text,
  ADD COLUMN IF NOT EXISTS fill_color text;

CREATE INDEX IF NOT EXISTS idx_inventory_products_variant_id ON public.inventory_products(variant_id);
