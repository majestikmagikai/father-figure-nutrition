import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentIntentItem = {
  handle: string;
  variantId: string;
  quantity: number;
  bundleInstanceId?: string;
};

type BundleRow = {
  handle: string;
  name: string;
  price: number;
  currency_code: string | null;
  product_handles: string[];
};

type EnrichedCartItem = {
  h: string;
  t: string;
  v: string;
  q: number;
  p: number;
  c: string;
  i: string;
  b?: string;
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

    // Bundles are a pricing rule applied here, never trusted from the client: only an
    // active bundle whose full product_handles set is present in a bundleInstanceId group
    // gets the discounted price. Everything else prices at the regular catalog price.
    const { data: bundleRows, error: bundleError } = await supabase
      .from("bundles")
      .select("handle, name, price, currency_code, product_handles")
      .eq("active", true);

    if (bundleError) {
      return new Response(JSON.stringify({ error: "Could not validate bundles" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bundles = (bundleRows ?? []) as BundleRow[];

    const normalizedRequested = new Set(handles.map((handle) => handle.toLowerCase()));
    const byHandle = new Map(
      ((products ?? []) as ProductRow[])
        .filter((product) => normalizedRequested.has(String(product.handle ?? "").trim().toLowerCase()))
        .map((product) => [String(product.handle ?? "").trim().toLowerCase(), product]),
    );

    type ValidatedLine = {
      handle: string;
      variantId: string;
      quantity: number;
      product: ProductRow;
      unitMinor: number;
      rowCurrency: string;
      bundleInstanceId: string;
    };

    const validatedLines: ValidatedLine[] = [];
    let currency = "usd";
    let currencyLocked = false;

    for (const item of items) {
      const handle = String(item.handle ?? "").trim().toLowerCase();
      const variantId = String(item.variantId ?? "").trim();
      const quantity = Number(item.quantity ?? 0);
      const bundleInstanceId = String(item.bundleInstanceId ?? "").trim();
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
      if (!currencyLocked) {
        currency = rowCurrency;
        currencyLocked = true;
      } else if (currency !== rowCurrency) {
        return new Response(JSON.stringify({ error: "Cart cannot mix currencies" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      validatedLines.push({ handle, variantId, quantity, product, unitMinor, rowCurrency, bundleInstanceId });
    }

    // Group lines by bundleInstanceId (each "Add Bundle to Cart" click) and, for any group
    // whose handles exactly match an active bundle's product_handles, price the matched
    // quantity at the bundle price instead of summing individual product prices. Any
    // quantity beyond the matched set (e.g. the shopper bumped one line's quantity) still
    // prices individually.
    const bundlesByHandleSet = new Map<string, BundleRow>();
    for (const bundle of bundles) {
      const key = [...bundle.product_handles].map((h) => h.toLowerCase()).sort().join("|");
      bundlesByHandleSet.set(key, bundle);
    }

    const linesByInstanceId = new Map<string, ValidatedLine[]>();
    for (const line of validatedLines) {
      if (!line.bundleInstanceId) continue;
      const group = linesByInstanceId.get(line.bundleInstanceId) ?? [];
      group.push(line);
      linesByInstanceId.set(line.bundleInstanceId, group);
    }

    const bundleUnitsByInstanceId = new Map<string, { bundle: BundleRow; units: number }>();
    for (const [instanceId, group] of linesByInstanceId) {
      const key = group.map((line) => line.handle).sort().join("|");
      const bundle = bundlesByHandleSet.get(key);
      if (!bundle) continue;

      const bundleCurrency = String(bundle.currency_code ?? "USD").toLowerCase();
      if (bundleCurrency !== currency) continue;

      const units = Math.min(...group.map((line) => line.quantity));
      if (units > 0) {
        bundleUnitsByInstanceId.set(instanceId, { bundle, units });
      }
    }

    let totalMinor = 0;
    let itemCount = 0;
    const enrichedCartItems: EnrichedCartItem[] = [];

    for (const line of validatedLines) {
      const bundleMatch = line.bundleInstanceId ? bundleUnitsByInstanceId.get(line.bundleInstanceId) : undefined;
      const bundleUnits = bundleMatch?.units ?? 0;
      const discountedQuantity = Math.min(bundleUnits, line.quantity);
      const regularQuantity = line.quantity - discountedQuantity;

      totalMinor += line.unitMinor * regularQuantity;
      itemCount += line.quantity;

      const firstImage = Array.isArray(line.product.images) && line.product.images.length > 0 ? line.product.images[0] : null;
      const imageUrl = firstImage && typeof firstImage === "object" && firstImage !== null && "url" in firstImage
        ? String((firstImage as { url?: unknown }).url ?? "")
        : "";

      enrichedCartItems.push({
        h: line.handle,
        t: String(line.product.title ?? line.handle),
        v: String(line.product.variant_id ?? line.variantId),
        q: line.quantity,
        p: line.unitMinor,
        c: line.rowCurrency,
        i: imageUrl,
        b: line.bundleInstanceId,
      });
    }

    // Add each matched bundle instance once at its bundle price (not per member line).
    for (const { bundle, units } of bundleUnitsByInstanceId.values()) {
      const bundleUnitMinor = toMinorUnits(bundle.price);
      if (!bundleUnitMinor) continue;
      totalMinor += bundleUnitMinor * units;
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
        // Compact encoding to stay under Stripe's 500-character metadata value limit.
        // Title and image URL are re-fetched from inventory_products by handle when needed
        // (in the webhook and on the payment success page) instead of being stored here.
        cart_lines: enrichedCartItems.map((item) => `${item.h}:${item.v}:${item.q}:${item.p}:${item.c}:${item.b || ""}`).join("|"),
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
