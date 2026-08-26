import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, RotateCw, Shield, X, ZoomIn } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IngredientsPanel } from "@/components/IngredientsPanel";
import { VeteranBadge } from "@/components/VeteranBadge";
import { BottleSpin360 } from "@/components/BottleSpin360";
import { Button } from "@/components/ui/button";
import { fetchStorefrontProductByHandle, type LocalProduct } from "@/lib/products";
import { useCartStore } from "@/stores/cartStore";
import { useJsonLd } from "@/hooks/useJsonLd";
import { toast } from "sonner";

const renderHtmlDescription = (html: string) => ({
  __html: html,
});

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const [product, setProduct] = useState<LocalProduct | undefined>(undefined);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!handle) {
      setProduct(undefined);
      return;
    }

    let isMounted = true;

    const loadProduct = async () => {
      setIsLoadingProduct(true);
      const nextProduct = await fetchStorefrontProductByHandle(handle);
      if (!isMounted) return;
      setProduct(nextProduct);
      setIsLoadingProduct(false);
    };

    void loadProduct();

    const handleFocus = () => {
      void loadProduct();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadProduct();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [handle]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [handle]);

  useEffect(() => {
    if (product) document.title = `${product.title} - Father Figure Nutrition`;
  }, [product]);

  useJsonLd(product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description,
    "image": product.images.map((i) => i.url),
    "sku": product.variantId,
    "brand": {
      "@type": "Brand",
      "name": "Father Figure Nutrition"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://figurefuel.fit/product/${product.handle}`,
      "priceCurrency": product.currencyCode,
      "price": product.price,
      "availability": product.availableForSale
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Father Figure Nutrition"
      }
    },
    "additionalProperty": [
      { "@type": "PropertyValue", "name": "Veteran Owned", "value": "Yes" },
      { "@type": "PropertyValue", "name": "Organic", "value": "80%" },
      { "@type": "PropertyValue", "name": "Interactive 3D Viewer", "value": "360° drag-to-spin CSS cylinder" },
      { "@type": "PropertyValue", "name": "Made In", "value": "USA" },
      { "@type": "PropertyValue", "name": "GMP Certified", "value": "Yes" }
    ]
  } : {});

  const labelImage = useMemo(() => {
    if (!product) return null;
    if (product.labelImageUrl) return { url: product.labelImageUrl, altText: "label" };
    return product.images.find((i) => /label/i.test(i.altText)) ?? product.images[product.images.length - 1];
  }, [product]);

  const [view, setView] = useState<"spin" | number>(0);
  const [zoomed, setZoomed] = useState<string | null>(null);

  useEffect(() => { setView(0); }, [handle]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoomed(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleAdd = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      handle: product.handle,
      title: product.title,
      image: product.images[0],
      variantId: product.variantId,
      price: product.price,
      currencyCode: product.currencyCode,
      quantity: 1,
    });
    toast.success("Added to cart", { description: product.title, position: "top-center" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <Link to="/#shop" className="inline-flex items-center gap-2 text-sm text-navy/60 hover:text-orange transition-colors mb-8 font-medium">
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>

        {isLoadingProduct ? (
          <div className="text-center py-32">
            <h1 className="font-display text-3xl uppercase mb-2">Loading product...</h1>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </div>
        ) : !product ? (
          <div className="text-center py-32">
            <h1 className="font-display text-3xl uppercase mb-2">Product not found</h1>
            <p className="text-muted-foreground">Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-10">
            <div className="relative">
              <div className="absolute -inset-6 bg-orange/10 blur-3xl rounded-full" />
              <div className="relative aspect-square rounded-2xl bg-secondary border border-navy/10 shadow-card">
                {view === "spin" && labelImage && product.enable3dViewer && product.model3dUrl ? (
                                  <BottleSpin360
                                    labelUrl={labelImage.url}
                                    capColor={product.cap}
                                    fillColor={product.fill}
                                    modelUrl={product.model3dUrl}
                                  />
                ) : typeof view === "number" && product.images[view] ? (
                  <div
                    className="relative w-full h-full group cursor-zoom-in"
                    onClick={() => setZoomed(product.images[view as number].url)}
                  >
                    <img
                      src={product.images[view].url}
                      alt={product.images[view].altText}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                      <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setView(i)}
                    className={`group cursor-pointer h-16 w-16 rounded-lg overflow-hidden border-2 transition-all bg-secondary relative ${
                      view === i ? "border-orange shadow-cta" : "border-navy/10 hover:border-orange/50"
                    }`}
                  >
                    <img src={img.url} alt={img.altText} className="w-full h-full object-contain pointer-events-none" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                      <ZoomIn className="h-4 w-4 text-white drop-shadow" />
                    </div>
                  </button>
                ))}
                {product.enable3dViewer && product.model3dUrl && (
                <button
                  onClick={() => setView("spin")}
                  className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center bg-gradient-to-br from-orange/20 to-orange/5 ${
                    view === "spin" ? "border-orange shadow-cta" : "border-navy/10 hover:border-orange/50"
                  }`}
                  title="360° spinning bottle"
                >
                  <RotateCw className="h-5 w-5 text-orange" />
                  <span className="absolute bottom-0 inset-x-0 text-[8px] uppercase tracking-widest text-orange font-bold bg-white/80 py-0.5">
                    360°
                  </span>
                </button>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-start pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-4 w-fit">
                <Shield className="h-3.5 w-3.5" /> Veteran Owned · 80% Organic
              </div>
              <h1 className="font-display text-4xl md:text-5xl uppercase mb-2 leading-tight text-navy">{product.title}</h1>
              <p className="font-display text-4xl text-orange mb-4">
                ${parseFloat(product.price).toFixed(2)}
              </p>
              <div className="w-12 h-1 bg-orange rounded-full mb-4" />
              <p className="text-navy/60 mb-2 text-base leading-relaxed">{product.description}</p>
              <div
                className="mb-6 text-navy/70 text-base leading-relaxed [&_b]:font-semibold [&_b]:text-navy [&_i]:italic [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:mt-3 [&_ul]:mb-3 [&_li]:mb-1"
                dangerouslySetInnerHTML={renderHtmlDescription(product.fullDescription ?? product.description)}
              />
              <VeteranBadge variant="full" className="mb-6" />
              <div className="flex flex-wrap gap-3 items-center">
                <Button
                  onClick={handleAdd}
                  disabled={!product.availableForSale}
                  size="lg"
                  className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add to Cart
                </Button>
                <p className="text-xs text-navy/40 uppercase tracking-widest">60-Day Money Back Guarantee</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8 border-t border-navy/10 pt-6">
                {[
                  { v: "80%", l: "Organic" },
                  { v: "USA", l: "Made In" },
                  { v: "GMP", l: "Certified" },
                ].map((s) => (
                  <div key={s.l} className="border-l-2 border-navy pl-3">
                    <div className="font-display text-2xl text-orange">{s.v}</div>
                    <div className="text-xs uppercase tracking-widest text-navy/50">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zoom overlay */}
            {zoomed && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
                onClick={() => setZoomed(null)}
              >
                <button
                  className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                  onClick={() => setZoomed(null)}
                >
                  <X className="h-5 w-5" />
                </button>
                <img
                  src={zoomed}
                  alt="Zoomed product"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className="md:col-span-2">
              {handle && <IngredientsPanel handle={handle} />}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default ProductDetail;
