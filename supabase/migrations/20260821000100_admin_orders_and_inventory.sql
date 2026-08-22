CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  customer_email text,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  item_count integer NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read orders" ON public.orders;
CREATE POLICY "Authenticated can read orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert orders" ON public.orders;
CREATE POLICY "Authenticated can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (true);


CREATE TABLE IF NOT EXISTS public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  title text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  currency_code text NOT NULL DEFAULT 'USD',
  available_for_sale boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_products_handle ON public.inventory_products(handle);

ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read inventory products" ON public.inventory_products;
CREATE POLICY "Public can read inventory products"
  ON public.inventory_products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage inventory products" ON public.inventory_products;
CREATE POLICY "Authenticated can manage inventory products"
  ON public.inventory_products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.inventory_products (handle, title, price, currency_code, available_for_sale)
VALUES
  ('creatine-hardbody', 'Creatine Hardbody', 24.99, 'USD', true),
  ('multi-vitamin-plus', 'Multi Vitamin Plus', 19.99, 'USD', true),
  ('15-day-fresh-start-cleanse', '15 Day Fresh Start Cleanse', 14.99, 'USD', true)
ON CONFLICT (handle) DO NOTHING;
