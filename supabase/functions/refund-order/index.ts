import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getAdminEmails = () =>
  [Deno.env.get("ADMIN_EMAILS"), Deno.env.get("VITE_ADMIN_EMAILS")]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !supabaseUrl || !supabaseAnonKey || !supabaseServiceRole) {
      return new Response(JSON.stringify({ error: "Missing required server configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminEmails = new Set(getAdminEmails());
    const normalizedEmail = userData.user.email?.trim().toLowerCase() ?? "";
    const appRole = userData.user.app_metadata?.role;
    const profileRole = userData.user.user_metadata?.role;
    const isAdmin =
      appRole === "admin" ||
      profileRole === "admin" ||
      (normalizedEmail.length > 0 && adminEmails.has(normalizedEmail));

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Order id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const serviceClient = createClient(supabaseUrl, supabaseServiceRole);

    const { data: order, error: orderError } = await serviceClient
      .from("orders")
      .select("id, external_id, stripe_payment_intent_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let paymentIntentId: string | null = null;
    let chargeId: string | null = null;
    if (order.stripe_payment_intent_id?.startsWith("pi_")) {
      paymentIntentId = order.stripe_payment_intent_id;
    } else if (order.stripe_payment_intent_id?.startsWith("ch_")) {
      chargeId = order.stripe_payment_intent_id;
    } else if (order.external_id?.startsWith("pi_")) {
      paymentIntentId = order.external_id;
    } else if (order.external_id?.startsWith("ch_")) {
      chargeId = order.external_id;
    } else if (order.external_id?.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(order.external_id);
      if (typeof session.payment_intent === "string") {
        paymentIntentId = session.payment_intent;
      }
    }

    let refundId: string | null = null;
    let refundErrorMessage: string | null = null;
    let refundStatus: "refunded" | "already_refunded" | "payment_cancelled" | "not_attempted" = "not_attempted";

    if (!paymentIntentId && !chargeId) {
      return new Response(JSON.stringify({ error: "No Stripe payment reference found on this order. Refund in Stripe Dashboard." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let intent: Stripe.PaymentIntent | null = null;
    if (paymentIntentId) {
      try {
        intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: `Could not load Stripe payment intent: ${message}` }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If payment was authorized but never captured, canceling the intent is the correct no-refund path.
    if (intent?.status === "requires_capture" && paymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
        refundStatus = "payment_cancelled";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: `Could not cancel uncaptured payment: ${message}` }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (intent && (intent.amount_received ?? 0) > 0 && paymentIntentId) {
      try {
        const refund = await stripe.refunds.create(
          {
            payment_intent: paymentIntentId,
            reason: "requested_by_customer",
            metadata: {
              order_id: order.id,
              order_external_id: order.external_id ?? "",
            },
          },
          {
            idempotencyKey: `order-refund-pi-${order.id}`,
          },
        );

        refundId = refund.id;
        refundStatus = "refunded";
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const normalized = message.toLowerCase();

        if (normalized.includes("already refunded") || normalized.includes("charge_already_refunded")) {
          refundStatus = "already_refunded";
        } else {
          refundErrorMessage = message;
        }
      }
    } else if (chargeId || intent?.latest_charge) {
      // Some payment methods can have a refundable charge even when amount_received is not populated on PI.
      try {
        const resolvedChargeId = chargeId ?? (typeof intent?.latest_charge === "string" ? intent.latest_charge : intent?.latest_charge?.id ?? null);

        if (!resolvedChargeId) {
          return new Response(JSON.stringify({ error: "No Stripe charge reference found to refund." }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const charge = await stripe.charges.retrieve(resolvedChargeId);

        const refundableAmount = Math.max((charge.amount_captured ?? charge.amount ?? 0) - (charge.amount_refunded ?? 0), 0);

        if (charge.refunded || refundableAmount <= 0) {
          refundStatus = "already_refunded";
        } else {
          const refund = await stripe.refunds.create(
            {
              charge: charge.id,
              reason: "requested_by_customer",
              metadata: {
                order_id: order.id,
                order_external_id: order.external_id ?? "",
              },
            },
            {
              idempotencyKey: `order-refund-charge-${order.id}`,
            },
          );

          refundId = refund.id;
          refundStatus = "refunded";
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const normalized = message.toLowerCase();

        if (normalized.includes("already refunded") || normalized.includes("charge_already_refunded")) {
          refundStatus = "already_refunded";
        } else {
          refundErrorMessage = message;
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "Payment has no captured Stripe funds to refund. If this payment was only authorized, canceling the authorization is the only available action." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (refundErrorMessage) {
      return new Response(JSON.stringify({ error: `Stripe refund failed: ${refundErrorMessage}` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const { error: updateError } = await serviceClient
      .from("orders")
      .update({
        status: "cancelled",
        fulfilled_at: null,
        updated_at: now,
      })
      .eq("id", order.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Could not update order status" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: eventError } = await serviceClient.from("order_status_events").insert({
      order_id: order.id,
      previous_status: order.status,
      next_status: "cancelled",
      note: refundErrorMessage
        ? `Cancelled. Stripe refund failed: ${refundErrorMessage}`
        : refundStatus === "payment_cancelled"
          ? "Payment authorization was cancelled before capture"
          : refundStatus === "already_refunded"
            ? "Already refunded in Stripe"
            : `Refunded via Stripe${refundId ? ` (${refundId})` : ""}`,
      changed_by: userData.user.id,
    });

    return new Response(
      JSON.stringify({
        refunded: refundStatus === "refunded" || refundStatus === "already_refunded",
        refundId,
        paymentIntentId,
        chargeId,
        orderId: order.id,
        status: "cancelled",
        refundStatus,
        warning: refundErrorMessage || (eventError ? "Order cancelled but status event logging failed" : null),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("refund-order error", error);
    return new Response(JSON.stringify({ error: "Unable to cancel/refund order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});