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
  fullDescription?: string;
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
