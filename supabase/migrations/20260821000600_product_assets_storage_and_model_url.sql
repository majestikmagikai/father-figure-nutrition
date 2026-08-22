ALTER TABLE public.inventory_products
  ADD COLUMN IF NOT EXISTS model_3d_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('product-assets', 'product-assets', true, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read product assets" ON storage.objects;
CREATE POLICY "Public can read product assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-assets');

DROP POLICY IF EXISTS "Authenticated can upload product assets" ON storage.objects;
CREATE POLICY "Authenticated can upload product assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-assets');

DROP POLICY IF EXISTS "Authenticated can update product assets" ON storage.objects;
CREATE POLICY "Authenticated can update product assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-assets')
  WITH CHECK (bucket_id = 'product-assets');

DROP POLICY IF EXISTS "Authenticated can delete product assets" ON storage.objects;
CREATE POLICY "Authenticated can delete product assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-assets');
