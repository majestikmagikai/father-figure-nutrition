-- "Virtual" bundles: a bundle is a pricing rule applied at checkout over existing
-- inventory_products, not a standalone stock-keeping unit. product_handles references
-- inventory_products.handle by convention (no FK so bundles can be edited independently).
CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  product_handles text[] NOT NULL DEFAULT '{}',
  tag text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bundles_product_handles_not_empty CHECK (cardinality(product_handles) > 0)
);

CREATE INDEX IF NOT EXISTS idx_bundles_handle ON public.bundles(handle);
CREATE INDEX IF NOT EXISTS idx_bundles_active_sort ON public.bundles(active, sort_order);

ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active bundles" ON public.bundles;
CREATE POLICY "Public can read active bundles"
  ON public.bundles FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Authenticated can read all bundles" ON public.bundles;
CREATE POLICY "Authenticated can read all bundles"
  ON public.bundles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage bundles" ON public.bundles;
CREATE POLICY "Authenticated can manage bundles"
  ON public.bundles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
