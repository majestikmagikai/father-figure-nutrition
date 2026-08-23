ALTER TABLE public.inventory_products
ADD COLUMN IF NOT EXISTS upc text;

DROP INDEX IF EXISTS idx_inventory_products_upc;

UPDATE public.inventory_products
SET upc = '850000000012'
WHERE handle = 'creatine-hardbody';

UPDATE public.inventory_products
SET upc = '850000000029, 199874431949'
WHERE handle = 'multi-vitamin-plus';

UPDATE public.inventory_products
SET upc = '850000000036'
WHERE handle = '15-day-fresh-start-cleanse';
