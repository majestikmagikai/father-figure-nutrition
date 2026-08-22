CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_handle text NOT NULL,
  product_title text NOT NULL,
  variant_id text,
  image_url text,
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  currency_code text NOT NULL DEFAULT 'USD',
  line_total numeric(10,2) GENERATED ALWAYS AS (round((unit_price * quantity)::numeric, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_handle ON public.order_items(product_handle);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read order items" ON public.order_items;
CREATE POLICY "Authenticated can read order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert order items" ON public.order_items;
CREATE POLICY "Authenticated can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status text,
  next_status text NOT NULL CHECK (next_status IN ('pending', 'processing', 'fulfilled', 'cancelled')),
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id ON public.order_status_events(order_id, created_at DESC);

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read order status events" ON public.order_status_events;
CREATE POLICY "Authenticated can read order status events"
  ON public.order_status_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert order status events" ON public.order_status_events;
CREATE POLICY "Authenticated can insert order status events"
  ON public.order_status_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Primary',
  recipient_name text,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state_region text,
  postal_code text NOT NULL,
  country_code text NOT NULL DEFAULT 'US',
  phone text,
  is_default_shipping boolean NOT NULL DEFAULT false,
  is_default_billing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_shipping_per_customer
  ON public.customer_addresses(customer_id)
  WHERE is_default_shipping = true;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_default_billing_per_customer
  ON public.customer_addresses(customer_id)
  WHERE is_default_billing = true;

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read their addresses" ON public.customer_addresses;
CREATE POLICY "Customers can read their addresses"
  ON public.customer_addresses FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can insert their addresses" ON public.customer_addresses;
CREATE POLICY "Customers can insert their addresses"
  ON public.customer_addresses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update their addresses" ON public.customer_addresses;
CREATE POLICY "Customers can update their addresses"
  ON public.customer_addresses FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can delete their addresses" ON public.customer_addresses;
CREATE POLICY "Customers can delete their addresses"
  ON public.customer_addresses FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

DROP TRIGGER IF EXISTS trg_customer_addresses_set_updated_at ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_set_updated_at
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.customer_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_routines_customer_id ON public.customer_routines(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_routines_active ON public.customer_routines(customer_id, is_active);

ALTER TABLE public.customer_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can read their routines" ON public.customer_routines;
CREATE POLICY "Customers can read their routines"
  ON public.customer_routines FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can insert their routines" ON public.customer_routines;
CREATE POLICY "Customers can insert their routines"
  ON public.customer_routines FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can update their routines" ON public.customer_routines;
CREATE POLICY "Customers can update their routines"
  ON public.customer_routines FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers can delete their routines" ON public.customer_routines;
CREATE POLICY "Customers can delete their routines"
  ON public.customer_routines FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

DROP TRIGGER IF EXISTS trg_customer_routines_set_updated_at ON public.customer_routines;
CREATE TRIGGER trg_customer_routines_set_updated_at
BEFORE UPDATE ON public.customer_routines
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_actor_user_id ON public.admin_activity_logs(actor_user_id);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read admin logs" ON public.admin_activity_logs;
CREATE POLICY "Authenticated can read admin logs"
  ON public.admin_activity_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert admin logs" ON public.admin_activity_logs;
CREATE POLICY "Authenticated can insert admin logs"
  ON public.admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
