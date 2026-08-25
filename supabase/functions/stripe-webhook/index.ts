import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatShippingAddress(shipping: Stripe.Shipping | null | undefined): string | null {
  if (!shipping?.name || !shipping.address) {
    return null;
  }
  const { name, address } = shipping;
  const addressParts = [
    name,
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postal_code}`,
    address.country,
  ].filter(Boolean); // Filter out null/empty parts
  return addressParts.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !stripeWebhookSecret || !supabaseUrl || !supabaseServiceRole) {
      return new Response("Webhook not configured", { status: 500, headers: corsHeaders });
    }

    const stripeSignature = req.headers.get("stripe-signature");
    if (!stripeSignature) {
      return new Response("Missing stripe-signature", { status: 400, headers: corsHeaders });
    }

    const payload = await req.text();

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const event = await stripe.webhooks.constructEventAsync(
      payload,
      stripeSignature,
      stripeWebhookSecret,
    );

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;

      const totalAmount = (session.amount_total ?? 0) / 100;
      const currencyCode = (session.currency ?? "usd").toUpperCase();
      const itemCount = Number.parseInt(session.metadata?.item_count ?? "0", 10) || 0;

      const customerEmail =
        session.customer_details?.email ??
        session.customer_email ??
        session.metadata?.customer_email ??
        null;

      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
      const orderExternalId = paymentIntentId ?? session.id;
      const clientOrderToken = session.metadata?.client_order_token ?? null;
      const shippingAddress = formatShippingAddress(session.shipping_details);

      const status = session.payment_status === "paid" ? "processing" : "pending";

      const { error } = await supabase
        .from("orders")
        .upsert(
          {
            external_id: orderExternalId,
            stripe_payment_intent_id: paymentIntentId,
            client_order_token: clientOrderToken,
            customer_email: customerEmail,
            shipping_address: shippingAddress,
            total_amount: Number(totalAmount.toFixed(2)),
            currency_code: currencyCode,
            item_count: itemCount,
            status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "external_id" },
        );

      if (error) {
        console.error("Failed to upsert order from webhook", error);
        return new Response("Failed to persist order", { status: 500, headers: corsHeaders });
      }
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;

      const totalAmount = (intent.amount_received || intent.amount || 0) / 100;
      const currencyCode = (intent.currency ?? "usd").toUpperCase();
      const itemCount = Number.parseInt(intent.metadata?.item_count ?? "0", 10) || 0;
      const customerEmail = intent.metadata?.customer_email ?? intent.receipt_email ?? null;
      const clientOrderToken = intent.metadata?.client_order_token ?? null;
      const shippingAddress = formatShippingAddress(intent.shipping);
      const shippingAmount = Number.parseFloat(intent.metadata?.shipping_amount ?? "0") || 0;
      const shippingMethod = intent.metadata?.shipping_method || null;
      const taxAmount = Number.parseFloat(intent.metadata?.tax_amount ?? "0") || 0;
      const taxRateRaw = intent.metadata?.tax_rate ?? "";
      const taxRate = taxRateRaw ? Number.parseFloat(taxRateRaw) : null;
      const cartLinesRaw = intent.metadata?.cart_lines ?? "";
      type BundleRow = { handle: string; name: string; price: number; currency_code: string | null; product_handles: string[] };
      type ParsedCartLine = { h: string; v: string; q: number; p: number; c: string; bundleInstanceId: string };

      const cartLines: ParsedCartLine[] = cartLinesRaw
        ? cartLinesRaw
            .split("|")
            .map((line: string): ParsedCartLine | null => {
              const [h, v, q, p, c, b] = line.split(":");
              const quantity = Number.parseInt(q ?? "", 10);
              const unitMinor = Number.parseInt(p ?? "", 10);
              if (!h || !c || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitMinor) || unitMinor <= 0) {
                return null;
              }
              return { h, v: v ?? "", q: quantity, p: unitMinor, c, bundleInstanceId: b ?? "" };
            })
            .filter((line: ParsedCartLine | null): line is ParsedCartLine => line !== null)
        : [];

      const { error } = await supabase
        .from("orders")
        .upsert(
          {
            external_id: intent.id,
            stripe_payment_intent_id: intent.id,
            client_order_token: clientOrderToken,
            customer_email: customerEmail,
            shipping_address: shippingAddress,
            total_amount: Number(totalAmount.toFixed(2)),
            currency_code: currencyCode,
            item_count: itemCount,
            shipping_amount: Number(shippingAmount.toFixed(2)),
            shipping_method: shippingMethod,
            tax_amount: Number(taxAmount.toFixed(2)),
            tax_rate: taxRate,
            status: "processing",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "external_id" },
        );

      if (error) {
        console.error("Failed to upsert payment intent order", error);
        return new Response("Failed to persist payment intent order", { status: 500, headers: corsHeaders });
      }

      const { data: savedOrder, error: orderLookupError } = await supabase
        .from("orders")
        .select("id")
        .eq("external_id", intent.id)
        .maybeSingle();

      if (orderLookupError || !savedOrder) {
        console.error("Could not resolve saved order for items", orderLookupError);
        return new Response("Failed to resolve saved order", { status: 500, headers: corsHeaders });
      }

      if (cartLines.length > 0) {
        // Re-create bundle logic from create-payment-intent to correctly price line items
        const { data: bundleRows, error: bundleError } = await supabase
          .from("bundles")
          .select("handle, name, price, currency_code, product_handles")
          .eq("active", true);

        if (bundleError) {
          console.error("Webhook: Could not validate bundles", bundleError);
        }

        const bundles = (bundleRows ?? []) as BundleRow[];
        const bundlesByHandleSet = new Map<string, BundleRow>();
        for (const bundle of bundles) {
          const key = [...bundle.product_handles].map((h) => h.toLowerCase()).sort().join("|");
          bundlesByHandleSet.set(key, bundle);
        }

        const linesByInstanceId = new Map<string, ParsedCartLine[]>();
        for (const line of cartLines) {
          if (!line.bundleInstanceId) continue;
          const group = linesByInstanceId.get(line.bundleInstanceId) ?? [];
          group.push(line);
          linesByInstanceId.set(line.bundleInstanceId, group);
        }

        const bundleUnitsByInstanceId = new Map<string, { bundle: BundleRow; units: number }>();
        for (const [instanceId, group] of linesByInstanceId) {
          const key = group.map((line) => line.h.toLowerCase()).sort().join("|");
          const bundle = bundlesByHandleSet.get(key);
          if (!bundle) continue;

          const bundleCurrency = String(bundle.currency_code ?? "USD").toLowerCase();
          if (bundleCurrency !== intent.currency.toLowerCase()) continue;

          const units = Math.min(...group.map((line) => line.q));
          if (units > 0) {
            bundleUnitsByInstanceId.set(instanceId, { bundle, units });
          }
        }

        const { data: lineProducts } = await supabase
          .from("inventory_products")
          .select("handle, title, images")
          .in("handle", cartLines.map((line) => line.h));

        const productInfoMap = new Map(
          ((lineProducts ?? []) as Array<{ handle: string; title: string | null; images: Array<{ url?: unknown }> | null }>).map((p) => [p.handle, p]),
        );

        const orderItemsToUpsert = [];

        for (const line of cartLines) {
          const product = productInfoMap.get(line.h);
          const title = product?.title ?? line.h;
          const firstImage = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : null;
          const imageUrl = firstImage && typeof firstImage === "object" && firstImage !== null && "url" in firstImage
            ? String((firstImage as { url?: unknown }).url ?? "")
            : "";

          const bundleMatch = line.bundleInstanceId ? bundleUnitsByInstanceId.get(line.bundleInstanceId) : undefined;
          const bundleUnits = bundleMatch?.units ?? 0;
          const discountedQuantity = Math.min(bundleUnits, line.q);
          const regularQuantity = line.q - discountedQuantity;

          if (regularQuantity > 0) {
            orderItemsToUpsert.push({
              order_id: savedOrder.id,
              product_handle: line.h,
              product_title: title,
              variant_id: line.v || null,
              image_url: imageUrl || null,
              unit_price: Number((line.p / 100).toFixed(2)),
              quantity: regularQuantity,
              currency_code: line.c.toUpperCase(),
              bundle_instance_id: "",
            });
          }

          if (discountedQuantity > 0 && bundleMatch) {
            const group = linesByInstanceId.get(line.bundleInstanceId)!;
            const bundlePriceMinor = Math.round(bundleMatch.bundle.price * 100);
            const originalBundlePriceMinor = group.reduce((sum, l) => sum + l.p, 0);

            let discountedUnitPriceMinor = line.p;
            if (originalBundlePriceMinor > 0) {
              discountedUnitPriceMinor = Math.round(bundlePriceMinor * (line.p / originalBundlePriceMinor));
            }

            orderItemsToUpsert.push({
              order_id: savedOrder.id,
              product_handle: line.h,
              product_title: title,
              variant_id: line.v || null,
              image_url: imageUrl || null,
              unit_price: Number((discountedUnitPriceMinor / 100).toFixed(2)),
              quantity: discountedQuantity,
              currency_code: line.c.toUpperCase(),
              bundle_instance_id: line.bundleInstanceId,
            });
          }
        }

        const { error: orderItemsError } = await supabase
          .from("order_items")
          .upsert(orderItemsToUpsert, { onConflict: "order_id,product_handle,bundle_instance_id" });

        if (orderItemsError) {
          console.error("Failed to persist order items", orderItemsError);
          return new Response("Failed to persist order items", { status: 500, headers: corsHeaders });
        }

        // Decrement stock for each ordered product. Aggregate quantities per handle first
        // (a handle can appear in multiple cart lines, e.g. split across bundle/non-bundle
        // quantities) so each product only gets one atomic decrement call.
        const quantityByHandle = new Map<string, number>();
        for (const line of cartLines) {
          quantityByHandle.set(line.h, (quantityByHandle.get(line.h) ?? 0) + line.q);
        }

        for (const [handle, quantity] of quantityByHandle) {
          const { error: stockError } = await supabase.rpc("decrement_inventory_stock", {
            p_handle: handle,
            p_quantity: quantity,
          });
          if (stockError) {
            console.error(`Failed to decrement stock for ${handle}`, stockError);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("stripe-webhook error", error);
    return new Response("Webhook handler failed", { status: 400, headers: corsHeaders });
  }
});
