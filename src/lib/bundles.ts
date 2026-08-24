import { supabase } from "@/integrations/supabase/client";

// The `bundles` table was added after the last Supabase typegen run, so it is not
// present in `Database`. Cast the client narrowly at each call site (matching the
// existing convention in src/lib/sessionManager.ts) until types.ts is regenerated.

export type Bundle = {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  price: number;
  currency_code: string;
  product_handles: string[];
  tag: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BundleInput = {
  handle: string;
  name: string;
  description: string | null;
  price: number;
  currencyCode: string;
  productHandles: string[];
  tag: string | null;
  active: boolean;
  sortOrder: number;
};

/** Public storefront fetch: only bundles marked active. */
export const fetchActiveBundles = async (): Promise<Bundle[]> => {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("bundles")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];

  return (data ?? []) as Bundle[];
};

/** Admin fetch: every bundle regardless of active state. */
export const fetchAllBundles = async (): Promise<Bundle[]> => {
  if (!supabase) return [];

  const { data, error } = await (supabase as any)
    .from("bundles")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Bundle[];
};

export const createBundle = async (input: BundleInput) => {
  if (!supabase) return;

  const { error } = await (supabase as any).from("bundles").insert({
    handle: input.handle,
    name: input.name,
    description: input.description,
    price: Number(input.price.toFixed(2)),
    currency_code: input.currencyCode,
    product_handles: input.productHandles,
    tag: input.tag,
    active: input.active,
    sort_order: input.sortOrder,
  });

  if (error) throw error;
};

export const updateBundle = async (id: string, input: BundleInput) => {
  if (!supabase) return;

  const { error } = await (supabase as any)
    .from("bundles")
    .update({
      handle: input.handle,
      name: input.name,
      description: input.description,
      price: Number(input.price.toFixed(2)),
      currency_code: input.currencyCode,
      product_handles: input.productHandles,
      tag: input.tag,
      active: input.active,
      sort_order: input.sortOrder,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
};

export const deleteBundle = async (id: string) => {
  if (!supabase) return;

  const { error } = await (supabase as any).from("bundles").delete().eq("id", id);

  if (error) throw error;
};
