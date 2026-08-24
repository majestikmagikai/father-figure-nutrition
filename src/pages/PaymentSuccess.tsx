import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { createOrderRecord, upsertOrderItems } from "@/lib/adminData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Reduced delay to 1.5 seconds for snappier feedback
const REDIRECT_DELAY_MS = 2000;
const CHECKOUT_SNAPSHOT_KEY = "ff-checkout-cart-snapshot";
const CHECKOUT_ORDER_TOKEN_KEY = "ff-checkout-order-token";
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const hasExecuted = useRef(false);
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasExecuted.current) return;
    hasExecuted.current = true;

    const processOrder = async () => {
      try {
        const url = new URL(window.location.href);
        const paymentIntentId = url.searchParams.get("payment_intent") ?? undefined;
        const paymentIntentClientSecret = url.searchParams.get("payment_intent_client_secret") ?? undefined;
        const clientOrderToken = sessionStorage.getItem(CHECKOUT_ORDER_TOKEN_KEY) ?? undefined;
        const dedupeKey = paymentIntentId ? `ff-order-saved-${paymentIntentId}` : null;

        if (dedupeKey && sessionStorage.getItem(dedupeKey)) {
          // Already processed, just redirect.
          setStatus("success");
          setTimeout(() => navigate("/dashboard", { replace: true }), 500);
          return;
        }

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

        let normalizedItems = items.length > 0 ? items : snapshotItems;
        let shippingAddress: string | null = null;
        // Prefer the amount Stripe actually charged over recomputing from cart item prices,
        // since bundle discounts are applied server-side in create-payment-intent and would
        // otherwise make a client-side recomputation understate the discount (or, if tampered
        // with, overstate it).
        let chargedAmountMinor: number | null = null;
        let shippingAmount: number | null = null;
        let shippingMethod: string | null = null;
        let taxAmount: number | null = null;
        let taxRate: number | null = null;

        // Always retrieve the payment intent when we have its client secret so we can capture
        // the shipping address, even if we already have item details from the local cart snapshot.
        if (paymentIntentClientSecret && stripePromise) {
          const stripe = await stripePromise;
          if (!stripe) throw new Error("Stripe.js failed to load.");

          const result = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
          if (result.error) throw new Error(result.error.message ?? "Could not retrieve payment details.");

          const intent = result.paymentIntent;
          if (intent) {
            if (intent.status === "succeeded" && typeof intent.amount === "number") {
              chargedAmountMinor = intent.amount;
            }

            const metadataForBreakdown = (intent as { metadata?: Record<string, string> }).metadata ?? {};
            if (metadataForBreakdown.shipping_amount) {
              const parsed = Number.parseFloat(metadataForBreakdown.shipping_amount);
              shippingAmount = Number.isFinite(parsed) ? parsed : null;
            }
            shippingMethod = metadataForBreakdown.shipping_method || null;
            if (metadataForBreakdown.tax_amount) {
              const parsed = Number.parseFloat(metadataForBreakdown.tax_amount);
              taxAmount = Number.isFinite(parsed) ? parsed : null;
            }
            if (metadataForBreakdown.tax_rate) {
              const parsed = Number.parseFloat(metadataForBreakdown.tax_rate);
              taxRate = Number.isFinite(parsed) ? parsed : null;
            }

            if (intent.shipping) {
              const s = intent.shipping;
              shippingAddress = [
                s.name,
                s.address?.line1,
                s.address?.line2,
                `${s.address?.city}, ${s.address?.state} ${s.address?.postal_code}`,
                s.address?.country,
              ]
                .filter(Boolean)
                .join("\n");
            }

            if (intent.status === "succeeded" && normalizedItems.length === 0) {
              const metadata = (intent as { metadata?: Record<string, string> }).metadata ?? {};
              const cartLinesRaw = metadata.cart_lines ?? "";

              type ParsedCartLine = { h: string; v: string; q: number; p: number; c: string };

              const cartLines: ParsedCartLine[] = cartLinesRaw
                ? cartLinesRaw
                    .split("|")
                    .map((line): ParsedCartLine | null => {
                      const [h, v, q, p, c] = line.split(":");
                      const quantity = Number.parseInt(q ?? "", 10);
                      const unitMinor = Number.parseInt(p ?? "", 10);
                      if (!h || !c || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitMinor) || unitMinor <= 0) {
                        return null;
                      }
                      return { h, v: v ?? "", q: quantity, p: unitMinor, c };
                    })
                    .filter((line): line is ParsedCartLine => line !== null)
                : [];

              if (cartLines.length > 0 && supabase) {
                const { data: lineProducts, error } = await supabase
                  .from("inventory_products")
                  .select("handle, title, images")
                  .in("handle", cartLines.map((line) => line.h));

                if (error) throw error;

                const productByHandle = new Map((lineProducts ?? []).map((product) => [product.handle, product]));

                normalizedItems = cartLines.map((line) => {
                  const product = productByHandle.get(line.h);
                  const images = product?.images as Array<{ url?: unknown }> | null | undefined;
                  const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
                  const imageUrl =
                    firstImage && typeof firstImage === "object" && firstImage !== null && "url" in firstImage
                      ? String((firstImage as { url?: unknown }).url ?? "")
                      : "";
                  const title = product?.title ?? line.h;

                  return {
                    lineId: `metadata-${line.h}-${line.v}`,
                    productId: `prod-${line.h}`,
                    handle: line.h,
                    title,
                    image: { url: imageUrl, altText: title },
                    variantId: line.v,
                    price: (line.p / 100).toFixed(2),
                    currencyCode: line.c.toUpperCase(),
                    quantity: line.q,
                  };
                });
              }
            }
          }
        }

        if (normalizedItems.length === 0) {
          // Nothing to save, but not an error. E.g. user refreshed page after successful save.
          setStatus("success");
          setTimeout(() => navigate("/dashboard", { replace: true }), REDIRECT_DELAY_MS);
          return;
        }

        let customerEmail: string | null = null;
        if (supabase) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          customerEmail = sessionData.session?.user?.email ?? null;
        }

        const totalAmount = chargedAmountMinor != null
          ? chargedAmountMinor / 100
          : normalizedItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
        const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
        const currencyCode = normalizedItems[0]?.currencyCode ?? "USD";

        const orderId = await createOrderRecord({
          externalId: paymentIntentId,
          stripePaymentIntentId: paymentIntentId,
          clientOrderToken,
          customerEmail,
          totalAmount,
          currencyCode,
          itemCount,
          shippingAddress,
          shippingAmount,
          shippingMethod,
          taxAmount,
          taxRate,
        });

        if (!orderId) {
          throw new Error("Failed to create or find an order record for this payment.");
        }

        await upsertOrderItems(
          orderId,
          normalizedItems.map((item) => ({
            productHandle: item.handle,
            productTitle: item.title,
            variantId: item.variantId,
            imageUrl: item.image.url,
            unitPrice: parseFloat(item.price),
            quantity: item.quantity,
            currencyCode: item.currencyCode,
            bundleInstanceId: "bundleInstanceId" in item ? item.bundleInstanceId ?? null : null,
            bundleHandle: "bundleHandle" in item ? item.bundleHandle ?? null : null,
            bundleName: "bundleName" in item ? item.bundleName ?? null : null,
          })),
        );

        if (dedupeKey) sessionStorage.setItem(dedupeKey, "1");
        sessionStorage.removeItem(CHECKOUT_SNAPSHOT_KEY);
        sessionStorage.removeItem(CHECKOUT_ORDER_TOKEN_KEY);
        clearCart();

        setStatus("success");
        toast.success("Order confirmed! Redirecting to your dashboard.");
        setTimeout(() => navigate("/dashboard", { replace: true }), REDIRECT_DELAY_MS);
      } catch (err) {
        let message = "An unknown error occurred while saving your order.";
        if (err instanceof Error) {
          message = err.message;
        } else if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
          message = err.message;
        }
        setErrorMessage(message);
        setStatus("error");
        toast.error(`Failed to save order: ${message}`);
      }
    };

    void processOrder();
  }, [clearCart, items, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {status === "processing" && (
            <Card className="border-sky-200 bg-sky-50/70 shadow-card">
              <CardHeader>
                <CardTitle className="font-display uppercase text-3xl text-sky-900">Processing Your Order</CardTitle>
                <CardDescription className="text-sky-900/80">
                  Please wait while we confirm and save your order details. Do not close this page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sky-900/80 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving order...
                </div>
              </CardContent>
            </Card>
          )}
          {status === "success" && (
            <Card className="border-emerald-200 bg-emerald-50/70 shadow-card">
              <CardHeader>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs uppercase tracking-widest font-semibold mb-3 w-fit">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Payment Successful
                </div>
                <CardTitle className="font-display uppercase text-3xl text-emerald-900">
                  Thank You For Your Order
                </CardTitle>
                <CardDescription className="text-emerald-900/80">
                  Your payment was confirmed. Redirecting you to your dashboard...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-emerald-900/80 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecting now...
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Go to Dashboard Now
                </Button>
                <Button asChild variant="outline" className="border-emerald-300 text-emerald-900 hover:bg-emerald-100">
                  <Link to="/">Return Home</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
          {status === "error" && (
            <Card className="border-rose-200 bg-rose-50/70 shadow-card">
              <CardHeader>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs uppercase tracking-widest font-semibold mb-3 w-fit">
                  <AlertTriangle className="h-3.5 w-3.5" /> Order Error
                </div>
                <CardTitle className="font-display uppercase text-3xl text-rose-900">Order Save Failed</CardTitle>
                <CardDescription className="text-rose-900/80">
                  There was a problem saving your order details. Your payment was successful, but please contact support to ensure your order is processed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-rose-900/80">
                  <span className="font-semibold">Error:</span> {errorMessage ?? "An unknown error occurred."}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-3">
                <Button asChild variant="outline" className="border-rose-300 text-rose-900 hover:bg-rose-100">
                  <Link to="/contact">Contact Support</Link>
                </Button>
                <Button asChild variant="outline" className="border-rose-300 text-rose-900 hover:bg-rose-100">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default PaymentSuccess;