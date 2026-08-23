import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export interface LocalProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  fullDescription?: string;
  price: string;
  currencyCode: string;
  availableForSale: boolean;
  images: Array<{ url: string; altText: string }>;
  variantId: string;
  cap: string;
  fill: string | null;
  model3dUrl?: string | null;
  enable3dViewer: boolean;
  upc: string | null;
}

type InventoryProductRow = Database["public"]["Tables"]["inventory_products"]["Row"];

const isImageEntry = (value: unknown): value is { url: string; altText: string } => {
  if (!value || typeof value !== "object") return false;
  const entry = value as { url?: unknown; altText?: unknown };
  return typeof entry.url === "string" && typeof entry.altText === "string";
};

const isRuntimeAssetUrl = (value: string) => {
  const url = value.trim();
  if (!url) return false;

  const lowered = url.toLowerCase();
  if (lowered.startsWith("http://localhost") || lowered.startsWith("https://localhost")) return false;
  if (lowered.startsWith("http://127.0.0.1") || lowered.startsWith("https://127.0.0.1")) return false;
  if (lowered.startsWith("http://0.0.0.0") || lowered.startsWith("https://0.0.0.0")) return false;
  if (lowered.startsWith("src/")) return false;
  if (lowered.startsWith("/src/")) return false;
  if (lowered.startsWith("./src/")) return false;
  if (lowered.includes("/storage/v1/object/sign/")) return false;
  if (lowered.includes("token=") && lowered.includes("expires=")) return false;

  if (/^https?:\/\//i.test(url)) return true;
  if (url.startsWith("/")) return true;
  if (url.startsWith("assets/")) return true;
  if (url.startsWith("./assets/")) return true;

  return false;
};

const normalizeRuntimeAssetUrl = (value: string) => {
  const url = value.trim();
  if (!url) return "";

  if (url.startsWith("/src/assets/")) return url.replace(/^\/src\//, "/");
  if (url.startsWith("src/assets/")) return `/${url.replace(/^src\//, "")}`;
  if (url.startsWith("./src/assets/")) return `/${url.replace(/^\.\/src\//, "")}`;

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return url;
  if (url.startsWith("./assets/")) return `/${url.replace(/^\.\//, "")}`;
  if (url.startsWith("assets/")) return `/${url}`;

  return url;
};

const isAdminUploadedProductAssetUrl = (value: string) => {
  const url = value.trim();
  if (!url) return false;

  return /\/storage\/v1\/object\/public\/product-assets\//i.test(url);
};

const parseImages = (images: Json) => {
  if (!Array.isArray(images)) return [] as Array<{ url: string; altText: string }>;
  const parsed = images
    .filter(isImageEntry)
    .map((entry) => ({
      url: normalizeRuntimeAssetUrl(entry.url),
      altText: entry.altText.trim(),
    }))
    .filter(
      (entry) =>
        entry.altText.length > 0 &&
        isRuntimeAssetUrl(entry.url) &&
        isAdminUploadedProductAssetUrl(entry.url),
    );
  return parsed;
};

const normalizeModelUrl = (modelUrl: string | null | undefined) => {
  const looksLikeModelFile = (value: string) => /\.(glb|gltf)(\?|#|$)/i.test(value);

  const candidate = modelUrl?.trim();
  if (candidate && isRuntimeAssetUrl(candidate) && looksLikeModelFile(candidate)) {
    return normalizeRuntimeAssetUrl(candidate);
  }

  return null;
};

const mapInventoryRowToProduct = (row: InventoryProductRow): LocalProduct | null => {
  const price = Number(row.price);
  const parsedImages = parseImages(row.images);

  if (!Number.isFinite(price) || !row.title || !row.handle || parsedImages.length === 0) {
    return null;
  }

  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description || "",
    fullDescription: row.full_description || "",
    price: price.toFixed(2),
    currencyCode: row.currency_code || "USD",
    availableForSale: row.available_for_sale,
    images: parsedImages,
    variantId: row.variant_id || `variant-${row.handle}`,
    cap: row.cap_color || "#f5f5f5",
    fill: row.fill_color ?? null,
    model3dUrl: normalizeModelUrl(row.model_3d_url),
    enable3dViewer: row.enable_3d_viewer,
    upc: row.upc ?? null,
  };
};

export const fetchStorefrontProducts = async (): Promise<LocalProduct[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) return [];

  const mapped = (data ?? [])
    .map(mapInventoryRowToProduct)
    .filter((product): product is LocalProduct => Boolean(product));

  return mapped;
};

export const fetchStorefrontProductByHandle = async (handle: string): Promise<LocalProduct | undefined> => {
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (error || !data) return undefined;

  return mapInventoryRowToProduct(data) ?? undefined;
};
