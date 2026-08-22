CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_items_order_id_product_handle
  ON public.order_items(order_id, product_handle);