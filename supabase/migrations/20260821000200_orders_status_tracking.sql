ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.orders
SET status = COALESCE(status, 'pending')
WHERE status IS NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'processing', 'fulfilled', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
