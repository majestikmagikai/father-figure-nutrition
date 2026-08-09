import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, RotateCw, Shield } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { IngredientsPanel } from "@/components/IngredientsPanel";
import { VeteranBadge } from "@/components/VeteranBadge";
import { BottleSpin360 } from "@/components/BottleSpin360";
import { Button } from "@/components/ui/button";
import { getProductByHandle } from "@/lib/products";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

const ProductDetail = () => {
  const { handle } = useParams<{ handle: string }>();
  const product = handle ? getProductByHandle(handle) : undefined;
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (product) document.title = `${product.title} — Father Figure Nutrition`;
  }, [product]);

  const labelImage = useMemo(() => {
    if (!product) return null;
    return product.images.find((i) => /label/i.test(i.altText)) ?? product.images[product.images.length - 1];
  }, [product]);

  const [view, setView] = useState<"spin" | number>("spin");

  useEffect(() => { setView("spin"); }, [handle]);

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
        <Link to="/#shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>

        {!product ? (
          <div className="text-center py-32">
            <h1 className="font-display text-3xl uppercase mb-2">Product not found</h1>
            <p className="text-muted-foreground">Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-10">
            <div className="relative">
              <div className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full" />
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-card border border-border shadow-card">
                {view === "spin" && labelImage ? (
                  <BottleSpin360
                    labelUrl={labelImage.url}
                    capColor={product.cap}
                    fillColor={product.fill}
                  />
                ) : typeof view === "number" && product.images[view] ? (
                  <img
                    src={product.images[view].url}
                    alt={product.images[view].altText}
                    className="w-full h-full object-contain bg-card"
                  />
                ) : null}
              </div>

              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => setView("spin")}
                  className={`relative h-16 w-16 rounded-lg overflow-hidden border-2 transition-all flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 ${
                    view === "spin" ? "border-primary shadow-cta" : "border-border hover:border-primary/50"
                  }`}
                  title="360° spinning bottle"
                >
                  <RotateCw className="h-5 w-5 text-primary" />
                  <span className="absolute bottom-0 inset-x-0 text-[8px] uppercase tracking-widest text-primary font-bold bg-background/80 py-0.5">
                    360°
                  </span>
                </button>
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setView(i)}
                    className={`h-16 w-16 rounded-lg overflow-hidden border-2 transition-all bg-card ${
                      view === i ? "border-primary shadow-cta" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={img.url} alt={img.altText} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-widest font-semibold mb-4">
                <Shield className="h-3.5 w-3.5" /> Veteran Owned · 80% Organic
              </div>
              <h1 className="font-display text-4xl md:text-5xl uppercase mb-3 leading-tight">{product.title}</h1>
              <div className="font-display text-3xl text-primary mb-6">
                ${parseFloat(product.price).toFixed(2)}
              </div>
              <p className="text-muted-foreground mb-6">{product.description}</p>
              <VeteranBadge variant="full" className="mb-6" />
              <Button
                onClick={handleAdd}
                disabled={!product.availableForSale}
                size="lg"
                className="bg-gradient-primary hover:opacity-95 shadow-cta font-display uppercase tracking-wider"
              >
                <Plus className="h-4 w-4 mr-2" /> Add to Cart
              </Button>
            </div>

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
