import Stripe from "npm:stripe@16.8.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutItem = {
  title: string;
  quantity: number;
  price: string;
  currencyCode: string;
};

const toMinorUnits = (value: string) => {
  const parsed = Number.parseFloat(value);
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
    const origin = typeof body?.origin === "string" ? body.origin : "";
    const items = Array.isArray(body?.items) ? (body.items as CheckoutItem[]) : [];

    if (!origin || items.length === 0) {
      return new Response(JSON.stringify({ error: "Origin and items are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let itemCount = 0;

    for (const item of items) {
      const title = String(item.title ?? "").trim();
      const quantity = Number(item.quantity ?? 0);
      const amount = toMinorUnits(String(item.price ?? ""));
      const currency = String(item.currencyCode ?? "usd").trim().toLowerCase();

      if (!title || !Number.isInteger(quantity) || quantity <= 0 || !amount || !currency) {
        return new Response(JSON.stringify({ error: "Invalid cart item data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      lineItems.push({
        quantity,
        price_data: {
          currency,
          product_data: {
            name: title,
          },
          unit_amount: amount,
        },
      });

      itemCount += quantity;
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2024-06-20",
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      customer_email: userData.user.email ?? undefined,
      metadata: {
        customer_id: userData.user.id,
        customer_email: userData.user.email ?? "",
        item_count: String(itemCount),
      },
    });

    if (!session.url) {
      return new Response(JSON.stringify({ error: "Stripe did not return a checkout URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout-session error", error);
    return new Response(JSON.stringify({ error: "Unable to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
