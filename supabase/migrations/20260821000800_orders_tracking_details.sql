ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_carrier text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS tracking_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders(tracking_number);
