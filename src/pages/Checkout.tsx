import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { Elements, PaymentElement, AddressElement, useElements, useStripe } from "@stripe/react-stripe-js";
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

type ShippingRateOption = { id: string; displayName: string; amount: number; currency: string };

type ShippingAddressValue = {
  name: string;
  phone?: string;
  address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string };
};

type PricingBreakdown = {
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  shippingMethod: string | null;
  taxAmount: number;
  taxRate: number | null;
  totalAmount: number;
};

const EmbeddedPaymentForm = ({
  onAddressChange,
  canSubmit,
}: {
  onAddressChange: (address: ShippingAddressValue | null) => void;
  canSubmit: boolean;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    if (!canSubmit) {
      toast.error("Please choose a shipping method.");
      return;
    }

    const addressElement = elements.getElement(AddressElement);
    let shipping: { name: string; phone?: string; address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string } } | undefined;

    if (addressElement) {
      const { complete, value } = await addressElement.getValue();
      if (!complete) {
        toast.error("Please enter a complete shipping address.");
        return;
      }
      shipping = {
        name: value.name,
        phone: value.phone || undefined,
        address: {
          line1: value.address.line1,
          line2: value.address.line2 || undefined,
          city: value.address.city,
          state: value.address.state,
          postal_code: value.address.postal_code,
          country: value.address.country,
        },
      };
    }

    setIsSubmitting(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        ...(shipping ? { shipping } : {}),
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

  const handleAddressElementChange = (event: {
    complete: boolean;
    value: { name: string; phone?: string; address: { line1: string; line2?: string; city: string; state: string; postal_code: string; country: string } };
  }) => {
    if (!event.complete) {
      onAddressChange(null);
      return;
    }
    onAddressChange({
      name: event.value.name,
      phone: event.value.phone || undefined,
      address: event.value.address,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AddressElement options={{ mode: 'shipping' }} onChange={handleAddressElementChange} />
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || !elements || isSubmitting || !canSubmit}
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
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [shippingRates, setShippingRates] = useState<ShippingRateOption[]>([]);
  const [selectedShippingRateId, setSelectedShippingRateId] = useState<string>("");
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressValue | null>(null);
  const items = useCartStore((s) => s.items);
  const orderTokenRef = useRef<string>("");
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsCheckingSession(false);
      return;
    }

    let isMounted = true;

    const validateSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.user) { sessionStorage.setItem('returnTo', window.location.pathname + window.location.search); }
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

  // Shipping methods are whatever Shipping Rates are configured directly in the Stripe
  // Dashboard — fetched once per session, never hardcoded here.
  useEffect(() => {
    if (isCheckingSession || !supabase) return;

    let isMounted = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: { action: "list-shipping-rates" },
      });
      if (!isMounted || error || !Array.isArray(data?.shippingRates)) return;
      setShippingRates(data.shippingRates as ShippingRateOption[]);
    })();

    return () => {
      isMounted = false;
    };
  }, [isCheckingSession]);

  const applyPricingResponse = (data: {
    clientSecret?: string;
    paymentIntentId?: string;
    subtotalAmount?: number;
    discountAmount?: number;
    shippingAmount?: number;
    shippingMethod?: string | null;
    taxAmount?: number;
    taxRate?: number | null;
    totalAmount?: number;
  }) => {
    if (typeof data.clientSecret === "string") setClientSecret(data.clientSecret);
    if (typeof data.paymentIntentId === "string") setPaymentIntentId(data.paymentIntentId);
    if (
      typeof data.subtotalAmount === "number" &&
      typeof data.discountAmount === "number" &&
      typeof data.totalAmount === "number"
    ) {
      setPricing({
        subtotalAmount: data.subtotalAmount,
        discountAmount: data.discountAmount,
        shippingAmount: data.shippingAmount ?? 0,
        shippingMethod: data.shippingMethod ?? null,
        taxAmount: data.taxAmount ?? 0,
        taxRate: data.taxRate ?? null,
        totalAmount: data.totalAmount,
      });
    }
  };

  const reportPaymentIntentError = async (error: unknown, data: unknown) => {
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
  };

  useEffect(() => {
    if (isCheckingSession || !supabase || items.length === 0 || !stripePublishableKey) {
      return;
    }

    let isMounted = true;
    // Start a new logical order token whenever checkout initializes for a non-empty cart.
    const orderToken = crypto.randomUUID();
    orderTokenRef.current = orderToken;
    sessionStorage.setItem(CHECKOUT_ORDER_TOKEN_KEY, orderToken);

    const createPaymentIntent = async () => {
      setIsPreparingPayment(true);
      setClientSecret(null);
      setPaymentFormError(null);
      setPricing(null);
      setPaymentIntentId(null);

      sessionStorage.setItem(CHECKOUT_SNAPSHOT_KEY, JSON.stringify(items));

      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          clientOrderToken: orderToken,
          items: items.map((item) => ({
            handle: item.handle,
            variantId: item.variantId,
            quantity: item.quantity,
            bundleInstanceId: item.bundleInstanceId,
          })),
          shippingRateId: selectedShippingRateId || undefined,
        },
      });

      if (!isMounted) return;

      if (error || !data?.clientSecret) {
        await reportPaymentIntentError(error, data);
        setIsPreparingPayment(false);
        return;
      }

      applyPricingResponse(data);
      setIsPreparingPayment(false);
    };

    void createPaymentIntent();

    return () => {
      isMounted = false;
    };
  }, [isCheckingSession, items, retryToken]);

  // Re-quotes the existing PaymentIntent's amount whenever the shopper picks a shipping
  // method or finishes entering a destination address, so tax/shipping stay accurate and
  // match what will actually be charged.
  const recalcTotals = async (overrides: { shippingRateId?: string; shippingAddress?: ShippingAddressValue | null }) => {
    if (!supabase || !paymentIntentId || items.length === 0) return;

    const requestId = ++requestIdRef.current;
    const nextShippingRateId = overrides.shippingRateId ?? selectedShippingRateId;
    const nextShippingAddress = overrides.shippingAddress !== undefined ? overrides.shippingAddress : shippingAddress;

    setIsRecalculating(true);
    const { data, error } = await supabase.functions.invoke("create-payment-intent", {
      body: {
        clientOrderToken: orderTokenRef.current,
        paymentIntentId,
        items: items.map((item) => ({
          handle: item.handle,
          variantId: item.variantId,
          quantity: item.quantity,
          bundleInstanceId: item.bundleInstanceId,
        })),
        shippingRateId: nextShippingRateId || undefined,
        shippingAddress: nextShippingAddress?.address ?? undefined,
      },
    });

    if (requestId !== requestIdRef.current) return;

    setIsRecalculating(false);
    if (error || !data?.clientSecret) {
      await reportPaymentIntentError(error, data);
      return;
    }

    applyPricingResponse(data);
  };

  const handleSelectShippingRate = (rateId: string) => {
    setSelectedShippingRateId(rateId);
    void recalcTotals({ shippingRateId: rateId });
  };

  const handleAddressChange = (address: ShippingAddressValue | null) => {
    setShippingAddress(address);
    if (address) {
      void recalcTotals({ shippingAddress: address });
    }
  };



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

                  {shippingRates.length > 0 && (
                    <div className="rounded-lg border border-navy/15 p-4 space-y-2">
                      <p className="text-sm font-semibold text-navy">Shipping Method</p>
                      {shippingRates.map((rate) => (
                        <label
                          key={rate.id}
                          className="flex items-center justify-between gap-3 text-sm text-navy/70 rounded-md border border-navy/10 px-3 py-2 cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="shipping-rate"
                              checked={selectedShippingRateId === rate.id}
                              onChange={() => handleSelectShippingRate(rate.id)}
                            />
                            {rate.displayName}
                          </span>
                          <span className="font-medium text-navy">
                            {rate.amount > 0 ? `$${rate.amount.toFixed(2)}` : "Free"}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {isPreparingPayment ? (
                    <p className="text-sm text-navy/70">Preparing secure payment form...</p>
                  ) : clientSecret && options ? (
                    <Elements stripe={stripePromise} options={options}>
                      <EmbeddedPaymentForm
                        onAddressChange={handleAddressChange}
                        canSubmit={!isRecalculating && (shippingRates.length === 0 || Boolean(selectedShippingRateId))}
                      />
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
                            {item.bundleName && (
                              <p className="text-sm text-orange">Part of {item.bundleName}</p>
                            )}
                            <p>Qty {item.quantity}</p>
                          </div>
                          <p className="font-semibold text-navy">
                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      ))}
                      <div className="border-t border-navy/10 pt-3 space-y-2">
                        <div className="flex justify-between items-center text-sm text-navy/70">
                          <span>Subtotal</span>
                          <span>${(pricing?.subtotalAmount ?? subtotal).toFixed(2)}</span>
                        </div>
                        {pricing && pricing.discountAmount > 0 && (
                          <div className="flex justify-between items-center text-sm text-emerald-700 font-medium">
                            <span>Bundle discount</span>
                            <span>-${pricing.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-sm text-navy/70">
                          <span>Shipping{pricing?.shippingMethod ? ` (${pricing.shippingMethod})` : ""}</span>
                          <span>
                            {pricing && pricing.shippingAmount > 0
                              ? `$${pricing.shippingAmount.toFixed(2)}`
                              : shippingRates.length > 0 && !selectedShippingRateId
                                ? "Select method"
                                : "Free"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-navy/70">
                          <span>Tax{pricing?.taxRate ? ` (${(pricing.taxRate * 100).toFixed(2)}%)` : ""}</span>
                          <span>${(pricing?.taxAmount ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="font-semibold text-navy">Total</span>
                          <span className="font-display text-2xl text-orange">
                            ${(pricing?.totalAmount ?? subtotal).toFixed(2)}
                          </span>
                        </div>
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
