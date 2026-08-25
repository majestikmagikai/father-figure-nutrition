import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentIntentItem = {
  handle: string;
  variantId: string;
  quantity: number;
  bundleInstanceId?: string;
};

type ShippingAddressInput = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

type BundleRow = {
  handle: string;
  name: string;
  price: number;
  currency_code: string | null;
  product_handles: string[];
  discount_type: "fixed" | "percentage" | null;
  discount_value: number | null;
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

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const body = await req.json();

    // Lightweight side-channel: list the shipping rates configured directly in the Stripe
    // Dashboard (Tony's settings), so the client can render real options without us ever
    // hardcoding shipping costs/methods in this codebase.
    if (body?.action === "list-shipping-rates") {
      const rates = await stripe.shippingRates.list({ active: true, limit: 20 });
      return new Response(
        JSON.stringify({
          shippingRates: rates.data.map((rate: Stripe.ShippingRate) => ({
            id: rate.id,
            displayName: rate.display_name,
            amount: (rate.fixed_amount?.amount ?? 0) / 100,
            currency: rate.fixed_amount?.currency ?? "usd",
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const items = Array.isArray(body?.items) ? (body.items as PaymentIntentItem[]) : [];
    const clientOrderToken = typeof body?.clientOrderToken === "string" ? body.clientOrderToken.trim() : "";
    const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId.trim() : "";
    const shippingRateId = typeof body?.shippingRateId === "string" ? body.shippingRateId.trim() : "";
    const shippingAddress = (body?.shippingAddress ?? null) as ShippingAddressInput | null;

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
      .select("handle, name, price, currency_code, product_handles, discount_type, discount_value")
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

    // First, calculate the total as if there were no bundles, and build enriched metadata.
    for (const line of validatedLines) {
      totalMinor += line.unitMinor * line.quantity;
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

    const initialTotalMinor = totalMinor;

    // Now, for each matched bundle, calculate the discount and subtract it from the total.
    for (const [instanceId, { bundle, units }] of bundleUnitsByInstanceId.entries()) {
      const group = linesByInstanceId.get(instanceId)!;

      // Sum of original prices for one unit of the bundle.
      const originalBundlePriceMinor = group.reduce((sum, line) => sum + line.unitMinor, 0);

      let discountPerBundle = 0;
      const discountType = bundle.discount_type;
      const discountValue = bundle.discount_value;

      // Prefer new discount_type/value fields if available for more robust, real-time calculation.
      if (discountType && discountValue != null && discountValue > 0) {
        if (discountType === "fixed") {
          discountPerBundle = toMinorUnits(discountValue) ?? 0;
        } else if (discountType === "percentage") {
          discountPerBundle = Math.round(originalBundlePriceMinor * (discountValue / 100));
        }
      } else {
        // Fallback to using the pre-calculated `price` field for older bundle definitions.
        const bundlePriceMinor = toMinorUnits(bundle.price);
        if (bundlePriceMinor && originalBundlePriceMinor > bundlePriceMinor) {
          discountPerBundle = originalBundlePriceMinor - bundlePriceMinor;
        }
      }

      if (discountPerBundle > 0) {
        totalMinor -= discountPerBundle * units;
      }
    }

    if (totalMinor <= 0) {
      return new Response(JSON.stringify({ error: "Invalid cart total" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const discountMinor = initialTotalMinor > totalMinor ? initialTotalMinor - totalMinor : 0;
    const merchandiseTotalMinor = totalMinor;

    // Shipping cost comes only from a real, active Stripe Shipping Rate (configured directly
    // in the Stripe Dashboard) — never a client-supplied amount — so the price can't be spoofed.
    let shippingAmountMinor = 0;
    let shippingMethod: string | null = null;

    if (shippingRateId) {
      try {
        const shippingRate = await stripe.shippingRates.retrieve(shippingRateId);
        if (shippingRate.active && shippingRate.fixed_amount?.currency === currency) {
          shippingAmountMinor = shippingRate.fixed_amount.amount;
          shippingMethod = shippingRate.display_name ?? null;
        }
      } catch (shippingRateError) {
        console.error("Invalid shipping rate requested", shippingRateError);
        return new Response(JSON.stringify({ error: "Invalid shipping option" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Tax is calculated dynamically via Stripe Tax based on the shopper's destination
    // address (never a hardcoded rate). If Stripe Tax isn't configured/enabled on the
    // account yet, or no address has been collected, this is skipped and tax stays 0 —
    // it never blocks checkout.
    let taxAmountMinor = 0;
    let taxRate: number | null = null;

    if (shippingAddress?.postal_code && shippingAddress?.country) {
      try {
        const calculation = await stripe.tax.calculations.create({
          currency,
          line_items: [
            {
              amount: merchandiseTotalMinor,
              reference: "merchandise",
              tax_behavior: "exclusive",
              tax_code: "txcd_99999999",
            },
          ],
          shipping_cost: shippingAmountMinor > 0 ? { amount: shippingAmountMinor } : undefined,
          customer_details: {
            address: {
              line1: shippingAddress.line1,
              line2: shippingAddress.line2,
              city: shippingAddress.city,
              state: shippingAddress.state,
              postal_code: shippingAddress.postal_code,
              country: shippingAddress.country,
            },
            address_source: "shipping",
          },
        });

        taxAmountMinor = calculation.tax_amount_exclusive;
        const taxableMinor = merchandiseTotalMinor + shippingAmountMinor;
        taxRate = taxableMinor > 0 ? Number((taxAmountMinor / taxableMinor).toFixed(4)) : 0;
      } catch (taxError) {
        // Stripe Tax not enabled/configured yet, or an unsupported address — fall back to
        // no tax rather than failing checkout.
        console.error("Stripe Tax calculation failed; defaulting to $0 tax", taxError);
        taxAmountMinor = 0;
        taxRate = null;
      }
    }

    totalMinor = merchandiseTotalMinor + shippingAmountMinor + taxAmountMinor;

    const metadata = {
      customer_id: userData.user.id,
      customer_email: userData.user.email ?? "",
      item_count: String(itemCount),
      cart_handles: handles.join(","),
      // Compact encoding to stay under Stripe's 500-character metadata value limit.
      // Title and image URL are re-fetched from inventory_products by handle when needed
      // (in the webhook and on the payment success page) instead of being stored here.
      cart_lines: enrichedCartItems.map((item) => `${item.h}:${item.v}:${item.q}:${item.p}:${item.c}:${item.b || ""}`).join("|"),
      client_order_token: clientOrderToken,
      shipping_amount: String(shippingAmountMinor / 100),
      shipping_method: shippingMethod ?? "",
      tax_amount: String(taxAmountMinor / 100),
      tax_rate: taxRate != null ? String(taxRate) : "",
    };

    // Re-quoting an existing PaymentIntent (e.g. the shopper picked a shipping method or
    // finished entering their address after the intent was first created) updates its
    // amount/metadata in place instead of creating a brand-new intent/clientSecret.
    const paymentIntent = paymentIntentId
      ? await stripe.paymentIntents.update(paymentIntentId, {
          amount: totalMinor,
          metadata,
        })
      : await stripe.paymentIntents.create({
          amount: totalMinor,
          currency,
          automatic_payment_methods: {
            enabled: true,
          },
          receipt_email: userData.user.email ?? undefined,
          metadata,
        });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        totalAmount: totalMinor / 100,
        subtotalAmount: initialTotalMinor / 100,
        discountAmount: discountMinor / 100,
        shippingAmount: shippingAmountMinor / 100,
        shippingMethod,
        taxAmount: taxAmountMinor / 100,
        taxRate,
        currency: currency,
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

