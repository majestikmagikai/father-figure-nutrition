// Compares ingredients listed on the product label (parsed from the Shopify
// description) against rows the crawler stored in `public.ingredients`.
// Returns a per-handle audit so the UI can highlight matches & gaps.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHOPIFY_DOMAIN = "veteran-s-organic-source-uwt0v.myshopify.com";
const SHOPIFY_TOKEN = "28377111d832188432ba7d206af79997";
const SHOPIFY_API = "2025-07";

const PRODUCT_QUERY = `
  query($handle: String!) {
    product(handle: $handle) { title description }
  }
`;

async function fetchProduct(handle: string) {
  const r = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${SHOPIFY_API}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN,
      },
      body: JSON.stringify({ query: PRODUCT_QUERY, variables: { handle } }),
    },
  );
  const j = await r.json();
  return j?.data?.product as { title: string; description: string } | null;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function fuzzyMatch(a: string, b: string) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const aw = new Set(na.split(" "));
  const bw = nb.split(" ");
  const overlap = bw.filter((w) => w.length > 3 && aw.has(w)).length;
  return overlap >= Math.min(2, bw.filter((w) => w.length > 3).length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { handle } = await req.json();
    if (!handle || typeof handle !== "string") {
      return new Response(JSON.stringify({ error: "handle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const product = await fetchProduct(handle);
    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ask the AI for a clean list of ingredient names exactly as they appear on the label.
    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You extract the active nutritional ingredient names listed on a supplement product label. Return ONLY ingredients explicitly listed (skip marketing claims). Use the canonical name (e.g. 'Vitamin D3', 'Magnesium Glycinate', 'Zinc'). No dosages, no duplicates.",
            },
            {
              role: "user",
              content: `Product: ${product.title}\n\nDescription:\n${product.description}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "label_ingredients",
                parameters: {
                  type: "object",
                  properties: {
                    ingredients: { type: "array", items: { type: "string" } },
                  },
                  required: ["ingredients"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "label_ingredients" } },
        }),
      },
    );

    if (!aiRes.ok) {
      const t = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: `AI error: ${t}` }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    const labelIngredients: string[] = args?.ingredients ?? [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: crawled, error } = await supabase
      .from("ingredients")
      .select("ingredient_name")
      .eq("product_handle", handle);
    if (error) throw error;

    const crawledNames: string[] = (crawled ?? []).map((r: any) => r.ingredient_name);

    const matched: Array<{ label: string; crawled: string }> = [];
    const missingFromCrawl: string[] = [];
    const usedCrawled = new Set<string>();

    for (const lab of labelIngredients) {
      const hit = crawledNames.find(
        (c) => !usedCrawled.has(c) && fuzzyMatch(lab, c),
      );
      if (hit) {
        usedCrawled.add(hit);
        matched.push({ label: lab, crawled: hit });
      } else {
        missingFromCrawl.push(lab);
      }
    }

    const extraInCrawl = crawledNames.filter((c) => !usedCrawled.has(c));
    const coverage = labelIngredients.length
      ? Math.round((matched.length / labelIngredients.length) * 100)
      : 0;

    return new Response(
      JSON.stringify({
        label_ingredients: labelIngredients,
        crawled_ingredients: crawledNames,
        matched,
        missing_from_crawl: missingFromCrawl,
        extra_in_crawl: extraInCrawl,
        coverage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("audit-ingredients error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
