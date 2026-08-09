import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopifyProduct, STOREFRONT_QUERY, storefrontApiRequest } from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";

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
    <section id="apparel" className="py-24 px-6 border-t border-border bg-card/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-widest font-semibold mb-4">
            <Shirt className="h-3.5 w-3.5" />
            The Uniform
          </div>
          <h2 className="font-display text-4xl md:text-5xl uppercase mb-3">
            Father Figure <span className="text-gradient-primary">Apparel</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Heavyweight basics, varsity outerwear, and signature caps. Wear the mission.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const variant = p.node.variants.edges[0]?.node;
              const image = p.node.images.edges[0]?.node;

              const handleAdd = async () => {
                if (!variant) return;
                await addItem({
                  product: p,
                  variantId: variant.id,
                  variantTitle: variant.title,
                  price: variant.price,
                  quantity: 1,
                  selectedOptions: variant.selectedOptions || [],
                });
                toast.success("Added to cart", {
                  description: p.node.title,
                  position: "top-center",
                });
              };

              return (
                <div
                  key={p.node.id}
                  className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-card hover:border-primary/50 transition-all hover:-translate-y-1 duration-300"
                >
                  <Link
                    to={`/product/${p.node.handle}`}
                    className="block aspect-square overflow-hidden bg-gradient-to-br from-secondary/40 to-background flex items-center justify-center p-8"
                  >
                    {image ? (
                      <img
                        src={image.url}
                        alt={image.altText || p.node.title}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_10px_30px_hsl(var(--primary)/0.25)]"
                      />
                    ) : (
                      <div className="text-muted-foreground">No image</div>
                    )}
                  </Link>
                  <div className="p-5">
                    <Link to={`/product/${p.node.handle}`}>
                      <h3 className="font-display text-xl uppercase tracking-wide mb-1 hover:text-primary transition-colors">
                        {p.node.title}
                      </h3>
                    </Link>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                      Apparel
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-display text-2xl text-primary">
                        ${parseFloat(p.node.priceRange.minVariantPrice.amount).toFixed(2)}
                      </span>
                      <Button
                        onClick={handleAdd}
                        disabled={isLoading || !variant?.availableForSale}
                        className="bg-gradient-primary hover:opacity-95 shadow-cta font-display uppercase tracking-wider"
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
