DROP POLICY IF EXISTS "Authenticated can update order items" ON public.order_items;
CREATE POLICY "Authenticated can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
