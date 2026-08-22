ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can update orders" ON public.orders;
CREATE POLICY "Authenticated can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);