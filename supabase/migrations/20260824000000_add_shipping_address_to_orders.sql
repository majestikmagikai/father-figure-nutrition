ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_address text;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';