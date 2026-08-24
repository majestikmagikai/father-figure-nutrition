import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
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
      const cartLinesRaw = intent.metadata?.cart_lines ?? "";

      type ParsedCartLine = { h: string; v: string; q: number; p: number; c: string };

      const cartLines: ParsedCartLine[] = cartLinesRaw
        ? cartLinesRaw
            .split("|")
            .map((line: string): ParsedCartLine | null => {
              const [h, v, q, p, c] = line.split(":");
              const quantity = Number.parseInt(q ?? "", 10);
              const unitMinor = Number.parseInt(p ?? "", 10);
              if (!h || !c || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitMinor) || unitMinor <= 0) {
                return null;
              }
              return { h, v: v ?? "", q: quantity, p: unitMinor, c };
            })
            .filter((line: ParsedCartLine | null): line is ParsedCartLine => line !== null)
        : [];

      let cartItems: Array<{ h: string; t: string; v: string; q: number; p: number; c: string; i: string }> = [];

      if (cartLines.length > 0) {
        const { data: lineProducts } = await supabase
          .from("inventory_products")
          .select("handle, title, images")
          .in("handle", cartLines.map((line) => line.h));

        const productByHandle = new Map(
          ((lineProducts ?? []) as Array<{ handle: string; title: string | null; images: Array<{ url?: unknown }> | null }>)
            .map((product) => [product.handle, product]),
        );

        cartItems = cartLines.map((line) => {
          const product = productByHandle.get(line.h);
          const firstImage = Array.isArray(product?.images) && product.images.length > 0 ? product.images[0] : null;
          const imageUrl = firstImage && typeof firstImage === "object" && firstImage !== null && "url" in firstImage
            ? String((firstImage as { url?: unknown }).url ?? "")
            : "";

          return {
            h: line.h,
            t: product?.title ?? line.h,
            v: line.v,
            q: line.q,
            p: line.p,
            c: line.c,
            i: imageUrl,
          };
        });
      }

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

      if (cartItems.length > 0) {
        const { error: orderItemsError } = await supabase
          .from("order_items")
          .upsert(
            cartItems.map((item) => ({
              order_id: savedOrder.id,
              product_handle: item.h,
              product_title: item.t,
              variant_id: item.v || null,
              image_url: item.i || null,
              unit_price: Number((item.p / 100).toFixed(2)),
              quantity: item.q,
              currency_code: item.c.toUpperCase(),
              // This fallback webhook path re-derives items from compact Stripe metadata,
              // which does not carry bundle grouping, so these lines are always recorded as
              // non-bundle ('') here. The primary PaymentSuccess.tsx path tags real bundle
              // instances; this keeps the unique index (order_id, product_handle,
              // bundle_instance_id) satisfied either way.
              bundle_instance_id: "",
            })),
            { onConflict: "order_id,product_handle,bundle_instance_id" },
          );

        if (orderItemsError) {
          console.error("Failed to persist order items", orderItemsError);
          return new Response("Failed to persist order items", { status: 500, headers: corsHeaders });
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
