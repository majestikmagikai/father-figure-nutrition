import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentIntentItem = {
  handle: string;
  variantId: string;
  quantity: number;
};

type EnrichedCartItem = {
  h: string;
  t: string;
  v: string;
  q: number;
  p: number;
  c: string;
  i: string;
};

type ProductRow = {
  handle: string;
  variant_id: string | null;
  title: string | null;
  price: number;
  currency_code: string | null;
  available_for_sale: boolean;
  images?: Array<{ url?: unknown }> | null;
};

const toMinorUnits = (value: string | number) => {
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnon) {
      return new Response(JSON.stringify({ error: "Missing required server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? (body.items as PaymentIntentItem[]) : [];
    const clientOrderToken = typeof body?.clientOrderToken === "string" ? body.clientOrderToken.trim() : "";

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "Cart items are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const handles = [...new Set(items.map((item) => String(item.handle ?? "").trim()).filter(Boolean))];
    if (handles.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid cart items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: products, error: productError } = await supabase
      .from("inventory_products")
      .select("handle, variant_id, title, price, currency_code, available_for_sale, images")
      .in("handle", handles);

    if (productError) {
      return new Response(JSON.stringify({ error: "Could not validate products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedRequested = new Set(handles.map((handle) => handle.toLowerCase()));
    const byHandle = new Map(
      ((products ?? []) as ProductRow[])
        .filter((product) => normalizedRequested.has(String(product.handle ?? "").trim().toLowerCase()))
        .map((product) => [String(product.handle ?? "").trim().toLowerCase(), product]),
    );
    const enrichedCartItems: EnrichedCartItem[] = [];

    let totalMinor = 0;
    let itemCount = 0;
    let currency = "usd";

    for (const item of items) {
      const handle = String(item.handle ?? "").trim().toLowerCase();
      const variantId = String(item.variantId ?? "").trim();
      const quantity = Number(item.quantity ?? 0);
      const product = byHandle.get(handle);

      if (!product || !product.available_for_sale) {
        return new Response(JSON.stringify({ error: `Product unavailable: ${handle}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (product.variant_id && variantId && product.variant_id !== variantId) {
        return new Response(JSON.stringify({ error: `Variant mismatch for ${handle}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return new Response(JSON.stringify({ error: `Invalid quantity for ${handle}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const unitMinor = toMinorUnits(product.price);
      if (!unitMinor) {
        return new Response(JSON.stringify({ error: `Invalid price for ${handle}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rowCurrency = String(product.currency_code ?? "USD").toLowerCase();
      if (totalMinor === 0) {
        currency = rowCurrency;
      } else if (currency !== rowCurrency) {
        return new Response(JSON.stringify({ error: "Cart cannot mix currencies" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      totalMinor += unitMinor * quantity;
      itemCount += quantity;

      const firstImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
      const imageUrl = firstImage && typeof firstImage === "object" && firstImage !== null && "url" in firstImage
        ? String((firstImage as { url?: unknown }).url ?? "")
        : "";

      enrichedCartItems.push({
        h: handle,
        t: String(product.title ?? handle),
        v: String(product.variant_id ?? variantId),
        q: quantity,
        p: unitMinor,
        c: rowCurrency,
        i: imageUrl,
      });
    }

    if (totalMinor <= 0) {
      return new Response(JSON.stringify({ error: "Invalid cart total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalMinor,
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: userData.user.email ?? undefined,
      metadata: {
        customer_id: userData.user.id,
        customer_email: userData.user.email ?? "",
        item_count: String(itemCount),
        cart_handles: handles.join(","),
        cart_items: JSON.stringify(enrichedCartItems),
        client_order_token: clientOrderToken,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("create-payment-intent error", error);
    const details = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: "Unable to create payment intent", details }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
