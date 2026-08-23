ALTER TABLE public.inventory_products
ADD COLUMN enable_3d_viewer BOOLEAN NOT NULL DEFAULT false;

-- For existing products, enable the viewer if a 3D model URL is already present.
UPDATE public.inventory_products
SET enable_3d_viewer = true
WHERE model_3d_url IS NOT NULL AND model_3d_url <> '';

COMMENT ON COLUMN public.inventory_products.enable_3d_viewer IS 'Controls whether the 360-degree product viewer is enabled in the storefront product detail page.';
