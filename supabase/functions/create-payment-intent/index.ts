import Stripe from "npm:stripe@16.8.0";
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

    const handles = [...new Set(items.map((item) => String(item.handle ?? "").trim().toLowerCase()).filter(Boolean))];
    if (handles.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid cart items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: products, error: productError } = await supabase
      .from("inventory_products")
      .select("handle, variant_id, title, price, currency_code, available_for_sale")
      .in("handle", handles);

    if (productError) {
      return new Response(JSON.stringify({ error: "Could not validate products" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const byHandle = new Map((products ?? []).map((product) => [product.handle, product]));
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

    // Persist a pending order row immediately so dashboards can show the order
    // even if webhook delivery or signature verification is delayed.
    const { error: orderError } = await supabase
      .from("orders")
      .upsert(
        {
          external_id: paymentIntent.id,
          stripe_payment_intent_id: paymentIntent.id,
          client_order_token: clientOrderToken || null,
          customer_email: userData.user.email ?? null,
          total_amount: Number((totalMinor / 100).toFixed(2)),
          currency_code: currency.toUpperCase(),
          item_count: itemCount,
          status: "pending",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "external_id" },
      );

    if (orderError) {
      console.error("create-payment-intent order upsert error", orderError);
    }

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
    return new Response(JSON.stringify({ error: "Unable to create payment intent" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
