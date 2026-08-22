import bottleCreatine from "@/assets/products/creatine-bottle.webp";
import labelCreatine from "@/assets/products/creatine-label-clean.webp";
import bottleMulti from "@/assets/products/multi-bottle.webp";
import labelMulti from "@/assets/products/multi-label-clean.webp";
import bottleCleanse from "@/assets/products/cleanse-bottle.webp";
import labelCleanse from "@/assets/products/cleanse-label-clean.webp";
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
}

type InventoryProductRow = Database["public"]["Tables"]["inventory_products"]["Row"];

export const PRODUCTS: LocalProduct[] = [
  {
    id: "prod-creatine",
    handle: "creatine-hardbody",
    title: "Creatine Hardbody",
    description: "For strength, training and performance.",
    fullDescription: `<b>Creatine Hardbody</b><br />
<i>Build Strength. Support Performance. Stay Consistent.</i><br />
Creatine Hardbody is designed for men who want to get more from their training and stay consistent with their performance goals. Creatine is one of the most researched sports-nutrition ingredients and is commonly used to support strength, power, and high-intensity exercise performance. Creatine Hardbody makes adding creatine to your daily routine simple.<br />
<br />
<b>Why Creatine Hardbody?</b>
<ul>
  <li>Supports strength and power during training</li>
  <li>Helps support high-intensity exercise performance</li>
  <li>Easy addition to your daily routine</li>
  <li>Designed for men committed to consistent training</li>
  <li>Convenient gummy format</li>
</ul>
<b>Make It Part of Your Routine</b>
Take daily as directed and pair it with regular training, proper nutrition, and adequate hydration.
<i>Train hard. Recover. Repeat.</i><br />
<b>Creatine Hardbody — built for men who refuse to coast.</b>`,
    price: "24.99",
    currencyCode: "USD",
    availableForSale: true,
    images: [
      { url: bottleCreatine, altText: "Creatine Hardbody bottle" },
      { url: labelCreatine, altText: "Creatine Hardbody label" },
    ],
    variantId: "var-creatine-default",
    cap: "#f5f5f5",
    fill: "#7a86b8",
  },
  {
    id: "prod-multi",
    handle: "multi-vitamin-plus",
    title: "Multi Vitamin Plus",
    description: "For everyday nutritional support.",
    fullDescription: `<b>Your Daily Foundation</b><br />
Multi Vitamin Plus is designed to help men build a simple daily nutritional routine by providing a convenient source of essential vitamins and minerals. Think of it as nutritional insurance for the days when your diet doesn't go exactly according to plan.<br />
<br />
<b>Why Multi Vitamin Plus?</b>
<ul>
  <li>Supports everyday nutritional needs</li>
  <li>Helps supplement gaps in your diet</li>
  <li>Convenient for busy lifestyles</li>
  <li>Easy-to-follow daily routine</li>
  <li>Designed with the everyday man in mind</li>
</ul>
<b>Make Every Day Count</b>
Take daily as directed and make Multi Vitamin Plus part of your everyday routine alongside a balanced diet and healthy lifestyle.`,
    price: "19.99",
    currencyCode: "USD",
    availableForSale: true,
    images: [
      { url: labelMulti, altText: "Multi Vitamin Plus bottle with label flair" },
      { url: bottleMulti, altText: "Multi Vitamin Plus bottle" },
    ],
    variantId: "var-multi-default",
    cap: "#f5f5f5",
    fill: "#e89a55",
  },
  {
    id: "prod-cleanse",
    handle: "15-day-fresh-start-cleanse",
    title: "15 Day Fresh Start Cleanse",
    description: "Reset the body for a wellness-focused living.",
    fullDescription: `<b>The 15-Day Fresh Start Cleanse</b><br />
The 15-Day Fresh Start Cleanse is designed as a focused routine for men who want to recommit to better daily habits. Use the 15 days as an opportunity to focus on hydration, balanced nutrition, movement, and consistency while incorporating the product according to its directions.<br />
<br />
<b>Why Fresh Start?</b>
<ul>
  <li>Simple 15-day routine for short-term wellness</li>
  <li>Designed to help you recommit to healthier habits</li>
  <li>Convenient format</li>
  <li>Easy to incorporate into a structured wellness routine</li>
  <li>Great starting point for a renewed commitment to yourself</li>
</ul>
<b>Your Fresh Start Starts Here</b>
Recommended Use: 2 capsules, once a week for two weeks a month. As directed for 15 days while focusing on balanced nutrition, hydration, movement, and healthy daily habits.<br />
<b>Fresh Start — reset your routine. Recommit to yourself.</b>`,
    price: "14.99",
    currencyCode: "USD",
    availableForSale: true,
    images: [
      { url: bottleCleanse, altText: "15 Day Fresh Start Cleanse bottle" },
      { url: labelCleanse, altText: "15 Day Fresh Start Cleanse label" },
    ],
    variantId: "var-cleanse-default",
    cap: "#f5f5f5",
    fill: null,
  },
];

export function getProductByHandle(handle: string): LocalProduct | undefined {
  return PRODUCTS.find((p) => p.handle === handle);
}

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

  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return url;
  if (url.startsWith("./assets/")) return `/${url.replace(/^\.\//, "")}`;
  if (url.startsWith("assets/")) return `/${url}`;

  return url;
};

const parseImages = (images: Json, fallback: Array<{ url: string; altText: string }>) => {
  if (!Array.isArray(images)) return fallback;
  const parsed = images
    .filter(isImageEntry)
    .map((entry) => ({
      url: normalizeRuntimeAssetUrl(entry.url),
      altText: entry.altText.trim(),
    }))
    .filter((entry) => entry.altText.length > 0 && isRuntimeAssetUrl(entry.url));
  return parsed.length > 0 ? parsed : fallback;
};

const normalizeModelUrl = (modelUrl: string | null | undefined, fallbackModelUrl: string | null | undefined) => {
  const looksLikeModelFile = (value: string) => /\.(glb|gltf)(\?|#|$)/i.test(value);

  const candidate = modelUrl?.trim();
  if (candidate && isRuntimeAssetUrl(candidate) && looksLikeModelFile(candidate)) {
    return normalizeRuntimeAssetUrl(candidate);
  }

  const fallback = fallbackModelUrl?.trim();
  if (fallback && isRuntimeAssetUrl(fallback) && looksLikeModelFile(fallback)) {
    return normalizeRuntimeAssetUrl(fallback);
  }

  return null;
};

export const toProductRecordInput = (product: LocalProduct) => ({
  handle: product.handle,
  title: product.title,
  description: product.description,
  fullDescription: product.fullDescription ?? null,
  price: Number.parseFloat(product.price),
  currencyCode: product.currencyCode,
  availableForSale: product.availableForSale,
  images: product.images,
  variantId: product.variantId,
  capColor: product.cap,
  fillColor: product.fill,
  model3dUrl: product.model3dUrl ?? null,
});

const mapInventoryRowToProduct = (row: InventoryProductRow): LocalProduct | null => {
  const fallback = getProductByHandle(row.handle);
  const price = Number(row.price);

  if (!fallback && (!Number.isFinite(price) || !row.title || !row.handle)) {
    return null;
  }

  return {
    id: row.id,
    handle: row.handle,
    title: row.title || fallback?.title || "Product",
    description: row.description || fallback?.description || "",
    fullDescription: row.full_description || fallback?.fullDescription || "",
    price: Number.isFinite(price) ? price.toFixed(2) : fallback?.price || "0.00",
    currencyCode: row.currency_code || fallback?.currencyCode || "USD",
    availableForSale: row.available_for_sale,
    images: parseImages(row.images, fallback?.images || []),
    variantId: row.variant_id || fallback?.variantId || `variant-${row.handle}`,
    cap: row.cap_color || fallback?.cap || "#f5f5f5",
    fill: row.fill_color ?? fallback?.fill ?? null,
    model3dUrl: normalizeModelUrl(row.model_3d_url, fallback?.model3dUrl),
  };
};

export const fetchStorefrontProducts = async (): Promise<LocalProduct[]> => {
  if (!supabase) return PRODUCTS;

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
  if (!supabase) return getProductByHandle(handle);

  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();

  if (error || !data) return undefined;

  return mapInventoryRowToProduct(data) ?? undefined;
};
