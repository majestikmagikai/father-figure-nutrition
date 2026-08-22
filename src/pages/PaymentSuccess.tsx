import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { createOrderRecord, upsertOrderItems } from "@/lib/adminData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REDIRECT_DELAY_MS = 5000;
const CHECKOUT_SNAPSHOT_KEY = "ff-checkout-cart-snapshot";
const CHECKOUT_ORDER_TOKEN_KEY = "ff-checkout-order-token";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    const url = new URL(window.location.href);
    const paymentIntentId = url.searchParams.get("payment_intent") ?? undefined;
    const clientOrderToken = sessionStorage.getItem(CHECKOUT_ORDER_TOKEN_KEY) ?? undefined;
    const dedupeKey = paymentIntentId ? `ff-order-saved-${paymentIntentId}` : null;
    const snapshotItems = (() => {
      try {
        const raw = sessionStorage.getItem(CHECKOUT_SNAPSHOT_KEY);
        if (!raw) return [] as typeof items;
        const parsed = JSON.parse(raw) as typeof items;
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [] as typeof items;
      }
    })();
    const sourceItems = items.length > 0 ? items : snapshotItems;
    let timer: number | null = null;
    let isActive = true;

    const saveOrderIfNeeded = async () => {
      if (sourceItems.length === 0) return;

      if (dedupeKey && sessionStorage.getItem(dedupeKey)) {
        return;
      }

      let customerEmail: string | null = null;
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        customerEmail = data.session?.user?.email ?? null;
      }

      const totalAmount = sourceItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const itemCount = sourceItems.reduce((sum, item) => sum + item.quantity, 0);
      const currencyCode = sourceItems[0]?.currencyCode ?? "USD";

      let orderId: string | null = null;

      try {
        orderId = await createOrderRecord({
          externalId: paymentIntentId,
          stripePaymentIntentId: paymentIntentId,
          clientOrderToken,
          customerEmail,
          totalAmount,
          currencyCode,
          itemCount,
        });
      } catch {
        // The webhook may have already created the order row; continue so line items can still be stored.
      }

      if (!orderId && supabase) {
        if (clientOrderToken) {
          const { data: savedOrder } = await supabase
            .from("orders")
            .select("id")
            .eq("client_order_token", clientOrderToken)
            .maybeSingle();

          orderId = savedOrder?.id ?? null;
        }

        if (!orderId && paymentIntentId) {
          const { data: savedOrder } = await supabase
            .from("orders")
            .select("id")
            .or(`stripe_payment_intent_id.eq.${paymentIntentId},external_id.eq.${paymentIntentId}`)
            .maybeSingle();

          orderId = savedOrder?.id ?? null;
        }
      }

      if (!orderId) {
        console.warn("Skipping success-page item sync because the saved order is not available yet.");
        return;
      }

      try {
        await upsertOrderItems(
          orderId,
          sourceItems.map((item) => ({
            productHandle: item.handle,
            productTitle: item.title,
            variantId: item.variantId,
            imageUrl: item.image.url,
            unitPrice: parseFloat(item.price),
            quantity: item.quantity,
            currencyCode: item.currencyCode,
          })),
        );
      } catch {
        toast.error("Order saved, but product line items could not be synced.");
      }

      if (dedupeKey) {
        sessionStorage.setItem(dedupeKey, "1");
      }

      sessionStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
      sessionStorage.removeItem(CHECKOUT_ORDER_TOKEN_KEY);
    };

    const runFlow = async () => {
      await saveOrderIfNeeded();

      if (sourceItems.length > 0) {
        clearCart();
      }

      if (!isActive) return;

      timer = window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, REDIRECT_DELAY_MS);
    };

    void runFlow();

    return () => {
      isActive = false;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [clearCart, items.length, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-emerald-200 bg-emerald-50/70 shadow-card">
            <CardHeader>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs uppercase tracking-widest font-semibold mb-3 w-fit">
                <CheckCircle2 className="h-3.5 w-3.5" /> Payment Successful
              </div>
              <CardTitle className="font-display uppercase text-3xl text-emerald-900">
                Thank You For Your Order
              </CardTitle>
              <CardDescription className="text-emerald-900/80">
                Your payment was confirmed. We are processing your order and redirecting you to your customer dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-900/80 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Redirecting in a few seconds...
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Go to Dashboard Now
                </Button>
                <Button asChild variant="outline" className="border-emerald-300 text-emerald-900 hover:bg-emerald-100">
                  <Link to="/">Return Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default PaymentSuccess;
