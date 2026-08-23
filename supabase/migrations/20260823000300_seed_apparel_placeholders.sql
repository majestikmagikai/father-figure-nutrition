-- Seed the Apparel placeholders into inventory_products
INSERT INTO public.inventory_products (
  handle,
  title,
  description,
  price,
  currency_code,
  available_for_sale,
  images,
  variant_id,
  cap_color
) VALUES 
(
  'father-figure-dad-cap',
  'Beanie',
  'Heavyweight, comfortable beanie styled for the everyday mission.',
  0.00,
  'USD',
  false,
  '[{"url": "/src/assets/products/father-figure-logo-product.webp", "altText": "Beanie"}]'::jsonb,
  'var-dad-cap-default',
  '#f5f5f5'
),
(
  'father-figure-letterman-jacket',
  'Exercise Equipment',
  'High-performance apparel designed for training and active recovery.',
  0.00,
  'USD',
  false,
  '[{"url": "/src/assets/products/father-figure-logo-product.webp", "altText": "Exercise Equipment"}]'::jsonb,
  'var-letterman-jacket-default',
  '#f5f5f5'
),
(
  'father-figure-tshirt',
  'Father Figure T-Shirt',
  'Heavyweight premium cotton t-shirt with classic varsity branding.',
  0.00,
  'USD',
  false,
  '[{"url": "/src/assets/products/father-figure-logo-product.webp", "altText": "Father Figure T-Shirt"}]'::jsonb,
  'var-tshirt-default',
  '#f5f5f5'
)
ON CONFLICT (handle) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency_code = EXCLUDED.currency_code,
  available_for_sale = EXCLUDED.available_for_sale,
  images = EXCLUDED.images,
  variant_id = EXCLUDED.variant_id,
  cap_color = EXCLUDED.cap_color;
