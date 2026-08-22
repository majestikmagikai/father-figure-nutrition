ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_order_token text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_orders_client_order_token
  ON public.orders(client_order_token)
  WHERE client_order_token IS NOT NULL;
