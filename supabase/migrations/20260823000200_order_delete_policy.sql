DROP POLICY IF EXISTS "Authenticated can delete order items" ON public.order_items;
CREATE POLICY "Authenticated can delete order items"
  ON public.order_items FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can delete orders" ON public.orders;
CREATE POLICY "Authenticated can delete orders"
  ON public.orders FOR DELETE
  TO authenticated
  USING (true);
