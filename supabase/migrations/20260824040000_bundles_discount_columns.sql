-- Add explicit discount fields to bundles so the admin UI and create-payment-intent
-- can compute a bundle's discount directly (fixed amount off, or percentage off) instead
-- of only inferring it from the difference between summed product prices and `price`.
ALTER TABLE public.bundles
  ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IN ('fixed', 'percentage')),
  ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) CHECK (discount_value >= 0);
