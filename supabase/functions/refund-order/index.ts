import Stripe from "https://esm.sh/stripe@16.8.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    if (order.stripe_payment_intent_id?.startsWith("pi_")) {
      paymentIntentId = order.stripe_payment_intent_id;
    } else if (order.external_id?.startsWith("pi_")) {
      paymentIntentId = order.external_id;
    } else if (order.external_id?.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(order.external_id);
      if (typeof session.payment_intent === "string") {
        paymentIntentId = session.payment_intent;
      }
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

    let refundId: string | null = null;
    let refundErrorMessage: string | null = null;

    if (paymentIntentId) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
          metadata: {
            order_id: order.id,
            order_external_id: order.external_id ?? "",
          },
        });

        refundId = refund.id;
      } catch (error) {
        refundErrorMessage = error instanceof Error ? error.message : String(error);
      }
    }

    const { error: eventError } = await serviceClient.from("order_status_events").insert({
      order_id: order.id,
      previous_status: order.status,
      next_status: "cancelled",
      note: refundErrorMessage
        ? `Cancelled. Stripe refund failed: ${refundErrorMessage}`
        : paymentIntentId
          ? `Refunded via Stripe${refundId ? ` (${refundId})` : ""}`
          : "Cancelled without a Stripe payment reference",
      changed_by: userData.user.id,
    });

    return new Response(
      JSON.stringify({
        refunded: Boolean(paymentIntentId && !refundErrorMessage),
        refundId,
        paymentIntentId,
        orderId: order.id,
        status: "cancelled",
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