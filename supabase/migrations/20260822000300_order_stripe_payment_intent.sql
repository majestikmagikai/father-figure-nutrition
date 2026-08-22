ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id
  ON public.orders(stripe_payment_intent_id);