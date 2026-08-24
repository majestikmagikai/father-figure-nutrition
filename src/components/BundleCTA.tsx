import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Package } from "lucide-react";
import bottleCreatine from "@/assets/products/creatine-bottle.webp";
import bottleMulti from "@/assets/products/multi-bottle.webp";
import bottleCleanse from "@/assets/products/cleanse-bottle.webp";
import { fetchActiveBundles, type Bundle } from "@/lib/bundles";
import { fetchStorefrontProducts, type LocalProduct } from "@/lib/products";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const productShots = [
  { name: "Creatine Hardbody", src: bottleCreatine },
  { name: "Multi Vitamin Plus", src: bottleMulti },
  { name: "15 Day Fresh Start Cleanse", src: bottleCleanse },
];

const createInstanceId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `bundle-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const BundleCTA = () => {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [productsByHandle, setProductsByHandle] = useState<Map<string, LocalProduct>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [addingHandle, setAddingHandle] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const [nextBundles, nextProducts] = await Promise.all([
        fetchActiveBundles(),
        fetchStorefrontProducts(),
      ]);

      if (!isMounted) return;

      setBundles(nextBundles);
      setProductsByHandle(new Map(nextProducts.map((product) => [product.handle, product])));
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddBundle = (bundle: Bundle) => {
    const products = bundle.product_handles.map((handle) => productsByHandle.get(handle));
    const missing = products.some((product) => !product || !product.availableForSale);

    if (missing) {
      toast.error("This bundle isn't available right now.", { position: "top-center" });
      return;
    }

    setAddingHandle(bundle.handle);
    const bundleInstanceId = createInstanceId();

    for (const product of products) {
      if (!product) continue;
      addItem({
        productId: product.id,
        handle: product.handle,
        title: product.title,
        image: product.images[0] ?? { url: "", altText: product.title },
        variantId: product.variantId,
        price: product.price,
        currencyCode: product.currencyCode,
        bundleInstanceId,
        bundleHandle: bundle.handle,
        bundleName: bundle.name,
      });
    }

    toast.success(`${bundle.name} added. Discount will be applied at checkout.`, {
      position: "top-center",
    });
    setAddingHandle(null);
  };

  if (!isLoading && bundles.length === 0) {
    return null;
  }

  return (
    <section id="bundle" aria-label="Bundle offers" className="relative py-24 px-6 overflow-hidden bg-secondary">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-secondary to-orange/5 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-5">
          <Package className="h-3.5 w-3.5" />
          The Father Figure Stack
        </div>
        <p className="text-xs uppercase tracking-[0.32em] text-navy/60 font-semibold mb-3">
          COMPLETE ROUTINE
        </p>
        <h2 className="font-display text-4xl md:text-6xl uppercase mb-4 leading-[0.95] text-navy">
          Stack &amp; <span className="text-orange">Save.</span>
        </h2>
        <p className="text-navy/50 max-w-xl mx-auto mb-10">
          Two ways to stack. One mission: show up stronger every day.
        </p>

        <div className="flex flex-wrap items-end justify-center gap-4 md:gap-6 mb-10">
          {productShots.map((product) => (
            <div key={product.name} className="flex flex-col items-center gap-2">
              <div className="bg-white border border-navy/10 rounded-2xl p-3 shadow-card w-[120px] h-[150px] flex items-center justify-center">
                <img src={product.src} alt={product.name} className="w-full h-full object-contain" />
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-navy/60 font-medium">{product.name}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 text-navy/60 mb-10">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading bundles...
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10 text-left">
            {bundles.map((b) => {
              const itemTitles = b.product_handles.map(
                (handle) => productsByHandle.get(handle)?.title ?? handle,
              );

              return (
                <div key={b.handle} className="relative bg-white border border-navy/10 rounded-2xl p-6 hover:border-orange/50 transition-all shadow-card">
                  {b.tag && (
                    <span className="absolute -top-3 left-4 bg-orange text-white text-[10px] font-display uppercase tracking-widest px-3 py-1 rounded-full">
                      {b.tag}
                    </span>
                  )}
                  <h3 className="font-display text-xl uppercase text-navy mb-1">{b.name}</h3>
                  <p className="text-orange font-display text-3xl mb-4">
                    {b.currency_code} {b.price.toFixed(2)}
                  </p>
                  {b.description && (
                    <p className="text-sm text-navy/65 mb-4 leading-relaxed">{b.description}</p>
                  )}
                  <div className="text-xs uppercase tracking-[0.18em] text-navy/70 font-semibold mb-3">What's Inside?</div>
                  <ul className="space-y-2 mb-5">
                    {itemTitles.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-navy/60">
                        <CheckCircle2 className="h-4 w-4 text-orange shrink-0" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handleAddBundle(b)}
                    disabled={addingHandle === b.handle}
                    className="w-full bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                  >
                    {addingHandle === b.handle ? "Adding..." : "Add Bundle to Cart"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-navy/40 mt-3 uppercase tracking-widest">
          60-day money back guarantee
        </p>
      </div>
    </section>
  );
};
