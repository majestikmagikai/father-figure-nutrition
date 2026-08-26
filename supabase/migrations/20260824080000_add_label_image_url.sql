alter table inventory_products
  add column if not exists label_image_url text default null;
