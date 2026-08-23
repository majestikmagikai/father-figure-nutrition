import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cartStore";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const CHECKOUT_SNAPSHOT_KEY = "ff-checkout-cart-snapshot";
const CHECKOUT_ORDER_TOKEN_KEY = "ff-checkout-order-token";

const EmbeddedPaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsSubmitting(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
    });

    if ("error" in result && result.error) {
      toast.error(result.error.message ?? "Could not complete payment.");
      setIsSubmitting(false);
      return;
    }

    const paymentIntent = "paymentIntent" in result ? result.paymentIntent : null;
    if (
      paymentIntent &&
      typeof paymentIntent === "object" &&
      "status" in paymentIntent &&
      "id" in paymentIntent &&
      paymentIntent.status === "succeeded" &&
      typeof paymentIntent.id === "string"
    ) {
      window.location.assign(`/checkout/success?payment_intent=${encodeURIComponent(paymentIntent.id)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        size="lg"
        className="w-full bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
      >
        <CreditCard className="h-4 w-4 mr-2" />
        {isSubmitting ? "Processing payment..." : "Pay now"}
      </Button>
      <p className="text-xs text-navy/60">
        Payment options are shown based on Stripe availability for your region and test account setup.
      </p>
    </form>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const items = useCartStore((s) => s.items);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsCheckingSession(false);
      return;
    }

    let isMounted = true;

    const validateSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error || !data.session?.user) {
        navigate("/login", { replace: true });
        return;
      }

      setIsCheckingSession(false);
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0),
    [items],
  );

  useEffect(() => {
    if (isCheckingSession || !supabase || items.length === 0 || !stripePublishableKey) {
      return;
    }

    let isMounted = true;
    // Start a new logical order token whenever checkout initializes for a non-empty cart.
    const orderToken = crypto.randomUUID();
    sessionStorage.setItem(CHECKOUT_ORDER_TOKEN_KEY, orderToken);

    const createPaymentIntent = async () => {
      setIsPreparingPayment(true);
      setClientSecret(null);
      setPaymentFormError(null);

      sessionStorage.setItem(CHECKOUT_SNAPSHOT_KEY, JSON.stringify(items));

      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          clientOrderToken: orderToken,
          items: items.map((item) => ({
            handle: item.handle,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      });

      if (!isMounted) return;

      if (error || !data?.clientSecret) {
        let detail = "";
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json();
            detail = String(body?.details ?? body?.error ?? "");
          } catch {
            // Response body was not JSON; fall through with no detail.
          }
        } else if (data && typeof data === "object" && "details" in data) {
          detail = String((data as { details?: unknown }).details ?? "");
        }

        console.error("create-payment-intent failed", error, detail);
        const message = detail ? `Could not initialize payment form: ${detail}` : "Could not initialize payment form.";
        toast.error(message);
        setPaymentFormError(message);
        setIsPreparingPayment(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setIsPreparingPayment(false);
    };

    void createPaymentIntent();

    return () => {
      isMounted = false;
    };
  }, [isCheckingSession, items, retryToken]);

  if (!stripePublishableKey) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <Card className="border-navy/15 shadow-card bg-white/95">
              <CardContent className="p-8 text-destructive">
                Missing VITE_STRIPE_PUBLISHABLE_KEY in your env file.
              </CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
          <div className="max-w-3xl mx-auto">
            <Card className="border-navy/15 shadow-card bg-white/95">
              <CardContent className="p-8 text-destructive">Unable to initialize Stripe.</CardContent>
            </Card>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const options = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: "stripe" as const,
        },
      }
    : undefined;

  const handleBackToShop = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 bg-gradient-to-b from-sky/20 via-secondary to-background px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy/70 hover:text-orange transition-colors mb-8 font-medium">
            <ArrowLeft className="h-4 w-4" /> Continue shopping
          </Link>

          {isCheckingSession ? (
            <Card className="border-navy/15 shadow-card bg-white/95">
              <CardContent className="p-8 text-navy/70">Checking your secure session...</CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-navy/15 shadow-card bg-white/95">
                <CardHeader>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-3 w-fit">
                    <ShieldCheck className="h-3.5 w-3.5" /> Secure Stripe Checkout
                  </div>
                  <CardTitle className="font-display uppercase text-3xl text-navy">Checkout</CardTitle>
                  <CardDescription>
                    Payments are processed securely by Stripe with encryption and fraud protection.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-navy/15 bg-secondary/40 p-4">
                    <p className="text-sm text-navy/70 leading-relaxed">
                      Enter your payment details below. Stripe securely handles card data and available payment options.
                    </p>
                  </div>

                  {isPreparingPayment ? (
                    <p className="text-sm text-navy/70">Preparing secure payment form...</p>
                  ) : clientSecret && options ? (
                    <Elements stripe={stripePromise} options={options}>
                      <EmbeddedPaymentForm />
                    </Elements>
                  ) : items.length === 0 ? (
                    <p className="text-sm text-destructive">Your cart is empty. Add an item to check out.</p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-destructive">
                        {paymentFormError ?? "Could not load payment form. Please refresh."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-navy/20 text-navy hover:bg-navy/5"
                        onClick={() => setRetryToken((n) => n + 1)}
                      >
                        Try Again
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={handleBackToShop}
                    variant="outline"
                    className="w-full border-navy/20 text-navy hover:bg-navy/5"
                  >
                    Continue Shopping
                  </Button>

                  <div className="flex items-center gap-2 text-xs text-navy/60 uppercase tracking-wider">
                    <Lock className="h-3.5 w-3.5" /> SSL encrypted checkout powered by Stripe
                  </div>
                </CardContent>
              </Card>

              <Card className="border-navy/15 shadow-card bg-white/95">
                <CardHeader>
                  <CardTitle className="font-display uppercase text-xl text-navy">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-sm text-navy/60">Your cart is empty.</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.variantId} className="flex justify-between gap-3 text-sm">
                          <div className="text-navy/70">
                            <p className="font-medium text-navy">{item.title}</p>
                            <p>Qty {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-navy">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                      <div className="border-t border-navy/10 pt-3 flex justify-between items-center">
                        <span className="font-semibold text-navy">Total</span>
                        <span className="font-display text-2xl text-orange">${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Checkout;
