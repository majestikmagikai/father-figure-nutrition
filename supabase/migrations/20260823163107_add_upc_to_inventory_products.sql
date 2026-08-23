ALTER TABLE public.inventory_products
ADD COLUMN IF NOT EXISTS upc text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_products_upc ON public.inventory_products(upc);

UPDATE public.inventory_products
SET upc = '850000000012'
WHERE handle = 'creatine-hardbody' AND upc IS NULL;

UPDATE public.inventory_products
SET upc = '850000000029'
WHERE handle = 'multi-vitamin-plus' AND upc IS NULL;

UPDATE public.inventory_products
SET upc = '850000000036'
WHERE handle = '15-day-fresh-start-cleanse' AND upc IS NULL;
