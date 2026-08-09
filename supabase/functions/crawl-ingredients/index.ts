// Crawls verified ingredient details for a Shopify product using Lovable AI Gateway.
// Parses ingredient names from the product description, asks the AI for structured
// research with sources, then upserts results into the `ingredients` table.

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

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a supplement research analyst. Identify the active nutritional ingredients mentioned in the product description (e.g. zinc, magnesium, creatine monohydrate, vitamin D3). Return verified, evidence-based information sourced from authoritative outlets (NIH ODS, Examine.com, PubMed, Mayo Clinic). Do not fabricate sources. For each ingredient, grade the overall evidence base: 'Strong' (multiple high-quality RCTs / meta-analyses), 'Moderate' (mixed or smaller studies, mechanistic support), or 'Limited' (preliminary, anecdotal, or conflicting). Then assign a 0-100 confidence score reflecting the quantity, quality, and consistency of the cited sources.",
            },
            {
              role: "user",
              content: `Product: ${product.title}\n\nDescription:\n${product.description}\n\nExtract every distinct active ingredient and return structured research for each.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_ingredients",
                description: "Return verified ingredient research entries.",
                parameters: {
                  type: "object",
                  properties: {
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          summary: {
                            type: "string",
                            description: "1-2 sentence overview.",
                          },
                          benefits: {
                            type: "array",
                            items: { type: "string" },
                            description: "3-5 evidence-based benefits.",
                          },
                          dosage: {
                            type: "string",
                            description: "Typical effective dose for adult men.",
                          },
                          sources: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                title: { type: "string" },
                                url: { type: "string" },
                              },
                              required: ["title", "url"],
                              additionalProperties: false,
                            },
                          },
                          evidence_strength: {
                            type: "string",
                            enum: ["Strong", "Moderate", "Limited"],
                            description:
                              "Strong = multiple high-quality RCTs/meta-analyses; Moderate = mixed or smaller studies; Limited = mostly preliminary or anecdotal.",
                          },
                          confidence_score: {
                            type: "integer",
                            minimum: 0,
                            maximum: 100,
                            description:
                              "0-100 confidence based on quantity, quality, and consistency of the cited sources.",
                          },
                        },
                        required: ["name", "summary", "benefits", "dosage", "sources", "evidence_strength", "confidence_score"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["ingredients"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "save_ingredients" },
          },
        }),
      },
    );

    if (!aiRes.ok) {
      const t = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg =
        aiRes.status === 429
          ? "Rate limit exceeded. Try again shortly."
          : aiRes.status === 402
          ? "AI credits exhausted. Add funds in Workspace > Usage."
          : `AI error: ${t}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const call = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call ? JSON.parse(call.function.arguments) : null;
    const ingredients = args?.ingredients ?? [];

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = ingredients.map((i: any) => ({
      product_handle: handle,
      ingredient_name: i.name,
      summary: i.summary,
      benefits: i.benefits,
      dosage: i.dosage,
      sources: i.sources,
      evidence_strength: i.evidence_strength,
      confidence_score: i.confidence_score,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error } = await supabase
        .from("ingredients")
        .upsert(rows, { onConflict: "product_handle,ingredient_name" });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ count: rows.length, ingredients: rows }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crawl-ingredients error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
