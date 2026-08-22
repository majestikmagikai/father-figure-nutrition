ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS sort_order integer;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) - 1 AS rn
  FROM public.inventory_products
)
UPDATE public.inventory_products p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id
  AND p.sort_order IS NULL;

ALTER TABLE public.inventory_products
  ALTER COLUMN sort_order SET DEFAULT 0;

UPDATE public.inventory_products
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE public.inventory_products
  ALTER COLUMN sort_order SET NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_inventory_product_sort_order()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sort_order IS NULL THEN
    SELECT COALESCE(MAX(sort_order), -1) + 1
    INTO NEW.sort_order
    FROM public.inventory_products;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_inventory_product_sort_order ON public.inventory_products;
CREATE TRIGGER trg_assign_inventory_product_sort_order
BEFORE INSERT ON public.inventory_products
FOR EACH ROW
EXECUTE FUNCTION public.assign_inventory_product_sort_order();

CREATE INDEX IF NOT EXISTS idx_inventory_products_sort_order ON public.inventory_products(sort_order ASC);
