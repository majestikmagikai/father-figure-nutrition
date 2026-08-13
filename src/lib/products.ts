import bottleCreatine from "@/assets/products/creatine-bottle.webp";
import labelCreatine from "@/assets/products/creatine-label-clean.webp";
import bottleMulti from "@/assets/products/multi-bottle.webp";
import labelMulti from "@/assets/products/multi-label-clean.webp";
import bottleCleanse from "@/assets/products/cleanse-bottle.webp";
import labelCleanse from "@/assets/products/cleanse-label-clean.webp";

export interface LocalProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  price: string;
  currencyCode: string;
  availableForSale: boolean;
  images: Array<{ url: string; altText: string }>;
  variantId: string;
  cap: string;
  fill: string | null;
}

export const PRODUCTS: LocalProduct[] = [
  {
    id: "prod-creatine",
    handle: "creatine-hardbody",
    title: "Creatine Hardbody",
    description:
      "Micronized creatine monohydrate gummies for strength, power, and recovery. No powder, no mixing — just results. 5g per serving, 30 servings.",
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
    description:
      "A complete daily multivitamin built for hardworking men. 23 essential vitamins and minerals, 80% organic, zero fillers. One gummy a day keeps the excuses away.",
    price: "19.99",
    currencyCode: "USD",
    availableForSale: true,
    images: [
      { url: bottleMulti, altText: "Multi Vitamin Plus bottle" },
      { url: labelMulti, altText: "Multi Vitamin Plus label" },
    ],
    variantId: "var-multi-default",
    cap: "#f5f5f5",
    fill: "#e89a55",
  },
  {
    id: "prod-cleanse",
    handle: "15-day-fresh-start-cleanse",
    title: "15 Day Fresh Start Cleanse",
    description:
      "A gentle 15-day digestive reset formulated with organic herbs and fiber. Flush the junk, restore your gut, and start your transformation from the inside out.",
    price: "29.99",
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
