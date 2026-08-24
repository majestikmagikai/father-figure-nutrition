-- Add explicit tax and shipping fields to track final breakdown at checkout
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_amount numeric(10,2) DEFAULT 0.00 CHECK (shipping_amount >= 0),
  ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) DEFAULT 0.00 CHECK (tax_amount >= 0),
  ADD COLUMN IF NOT EXISTS shipping_method text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,4) CHECK (tax_rate >= 0); -- e.g., 0.0825 for 8.25%
