import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopifyProduct, STOREFRONT_QUERY, storefrontApiRequest } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import dadCapImg from "@/assets/products/father-figure-logo-product.webp";

const IMAGE_OVERRIDES: Record<string, string> = {};

export const ApparelGrid = () => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  useEffect(() => {
    (async () => {
      try {
        const data = await storefrontApiRequest(STOREFRONT_QUERY, {
          first: 24,
          query: "tag:apparel",
        });
        setProducts(data?.data?.products?.edges || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section id="apparel" className="relative py-24 px-6 bg-navy overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-sky/20 rounded-full pointer-events-none z-0 animate-orb-1" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-orange/20 rounded-full pointer-events-none z-0 animate-orb-2" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs uppercase tracking-widest font-semibold mb-4">
            <Shirt className="h-3.5 w-3.5" />
            The Uniform
          </div>
          <h2 className="font-display text-4xl md:text-5xl uppercase mb-3 text-white">
            Father Figure <span className="text-orange">Apparel</span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Heavyweight basics, varsity outerwear, and signature caps. Wear the mission.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-orange animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const variant = p.node.variants.edges[0]?.node;
              const image = p.node.images.edges[0]?.node;
              const imageOverride = IMAGE_OVERRIDES[p.node.handle] ?? dadCapImg;

              const handleAdd = async () => {
                if (!variant) return;
                await addItem({
                  productId: p.node.id,
                  handle: p.node.handle,
                  title: p.node.title,
                  image: { url: imageOverride ?? image?.url ?? "", altText: image?.altText ?? p.node.title },
                  variantId: variant.id,
                  price: variant.price.amount,
                  currencyCode: variant.price.currencyCode,
                  quantity: 1,
                });
                toast.success("Added to cart", {
                  description: p.node.title,
                  position: "top-center",
                });
              };

              return (
                <div
                  key={p.node.id}
                  className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-card hover:border-orange/50 transition-all hover:-translate-y-1 duration-300"
                >
                  <Link
                    to={`/product/${p.node.handle}`}
                    className="block aspect-square overflow-hidden bg-gradient-to-br from-secondary/40 to-background flex items-center justify-center p-8"
                  >
                    {image || imageOverride ? (
                      <img
                        src={imageOverride ?? image!.url}
                        alt={image?.altText || p.node.title}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_10px_30px_hsl(var(--primary)/0.25)]"
                      />
                    ) : (
                      <div className="text-muted-foreground">No image</div>
                    )}
                  </Link>
                  <div className="p-5 bg-[#0D1B2A]">
                    <Link to={`/product/${p.node.handle}`}>
                      <h3 className="font-display text-xl uppercase tracking-wide mb-1 text-white hover:text-orange transition-colors">
                        {p.node.title}
                      </h3>
                    </Link>
                    <p className="text-xs uppercase tracking-widest text-white/40 mb-4">
                      Apparel
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl text-orange">
                        ${parseFloat(p.node.priceRange.minVariantPrice.amount).toFixed(2)}
                      </span>
                      <Button
                        onClick={handleAdd}
                        disabled={isLoading || !variant?.availableForSale}
                        className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
