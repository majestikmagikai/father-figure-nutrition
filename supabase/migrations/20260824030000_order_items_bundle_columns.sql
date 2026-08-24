-- Track which bundle (if any) an order line item belonged to at purchase time.
-- bundle_instance_id defaults to '' (not null) so the unique index below behaves
-- consistently for both bundle and non-bundle lines (NULL would not collide in a
-- unique index, which would break upsert-based idempotency for plain line items).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS bundle_instance_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bundle_handle text,
  ADD COLUMN IF NOT EXISTS bundle_name text;

DROP INDEX IF EXISTS uniq_order_items_order_id_product_handle;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_items_order_product_bundle
  ON public.order_items(order_id, product_handle, bundle_instance_id);

CREATE INDEX IF NOT EXISTS idx_order_items_bundle_instance_id
  ON public.order_items(bundle_instance_id)
  WHERE bundle_instance_id <> '';
