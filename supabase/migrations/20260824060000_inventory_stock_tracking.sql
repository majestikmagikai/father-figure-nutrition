-- Inventory tracking: stock quantity, low-stock threshold, and SKU per product.
-- Table is `inventory_products` in this codebase (not `products`/`product_variants`).
ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  ADD COLUMN IF NOT EXISTS sku text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_inventory_products_sku ON public.inventory_products(sku);

-- Atomically decrements stock for a product by handle. Implemented as a single
-- UPDATE statement so Postgres row locking prevents race conditions when
-- multiple webhook deliveries decrement the same product concurrently.
-- Clamped at 0 (never goes negative) so an oversold/duplicate event can't
-- trip the stock_quantity >= 0 check constraint.
CREATE OR REPLACE FUNCTION public.decrement_inventory_stock(p_handle text, p_quantity integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.inventory_products
  SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0),
      updated_at = now()
  WHERE handle = p_handle;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_inventory_stock(text, integer) TO authenticated, service_role;
