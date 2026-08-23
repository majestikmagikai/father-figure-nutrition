import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchStorefrontProducts } from "@/lib/products";
import { useCartStore } from "@/stores/cartStore";
import { toast } from "sonner";
import dadCapImg from "@/assets/products/father-figure-logo-product.webp";

interface ApparelProduct {
  id: string;
  handle: string;
  title: string;
  price: string;
  currencyCode: string;
  availableForSale: boolean;
  image: { url: string; altText: string };
  variantId: string;
}

const APPAREL: ApparelProduct[] = [
  {
    id: "apparel-dad-cap",
    handle: "father-figure-dad-cap",
    title: "Beanie",
    price: "0.00",
    currencyCode: "USD",
    availableForSale: false,
    image: { url: dadCapImg, altText: "Beanie" },
    variantId: "var-dad-cap-default",
  },
  {
    id: "apparel-letterman-jacket",
    handle: "father-figure-letterman-jacket",
    title: "Exercise Equipment",
    price: "0.00",
    currencyCode: "USD",
    availableForSale: false,
    image: { url: dadCapImg, altText: "Exercise Equipment" },
    variantId: "var-letterman-jacket-default",
  },
  {
    id: "apparel-tshirt",
    handle: "father-figure-tshirt",
    title: "Father Figure T-Shirt",
    price: "0.00",
    currencyCode: "USD",
    availableForSale: false,
    image: { url: dadCapImg, altText: "Father Figure T-Shirt" },
    variantId: "var-tshirt-default",
  },
];

export const ApparelGrid = () => {
  const addItem = useCartStore((s) => s.addItem);
  const [apparel, setApparel] = useState<ApparelProduct[]>(APPAREL);

  useEffect(() => {
    let isMounted = true;
    const loadApparel = async () => {
      try {
        const allProducts = await fetchStorefrontProducts();
        if (!isMounted) return;
        const dbApparel = allProducts.filter((p) => p.handle.startsWith("father-figure-"));
        if (dbApparel.length > 0) {
          const mapped: ApparelProduct[] = dbApparel.map((p) => ({
            id: p.id,
            handle: p.handle,
            title: p.title,
            price: p.price,
            currencyCode: p.currencyCode,
            availableForSale: p.availableForSale,
            image: p.images[0] ?? { url: dadCapImg, altText: p.title },
            variantId: p.variantId,
          }));
          setApparel(mapped);
        }
      } catch {
        // Fallback silently to static placeholder APPAREL
      }
    };
    void loadApparel();
    return () => { isMounted = false; };
  }, []);

  return (
    <section id="apparel" className="relative py-24 px-6 bg-gradient-to-b from-sky to-navy overflow-hidden">
      {/* Background orbs */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-navy/20 rounded-full pointer-events-none z-0 animate-orb-1" />
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apparel.map((p) => (
            <div
              key={p.id}
              className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-card hover:border-orange/50 transition-all hover:-translate-y-1 duration-300"
            >
              <Link
                to={`/product/${p.handle}`}
                className="block aspect-square overflow-hidden bg-gradient-to-br from-secondary/40 to-background flex items-center justify-center p-8"
              >
                <img
                  src={p.image.url}
                  alt={p.image.altText}
                  loading="lazy"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_10px_30px_hsl(var(--primary)/0.25)]"
                />
              </Link>
              <div className="p-5 bg-[#0D1B2A]">
                <Link to={`/product/${p.handle}`}>
                  <h3 className="font-display text-xl uppercase tracking-wide mb-1 text-white hover:text-orange transition-colors">
                    {p.title}
                  </h3>
                </Link>
                <p className="text-xs uppercase tracking-widest text-white/40 mb-4">Apparel</p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-xl text-orange">
                    {p.availableForSale ? `$${parseFloat(p.price).toFixed(2)}` : "Coming Soon"}
                  </span>
                  <Button
                    onClick={() => {
                      if (!p.availableForSale) return;

                      addItem({
                        productId: p.id,
                        handle: p.handle,
                        title: p.title,
                        image: p.image,
                        variantId: p.variantId,
                        price: p.price,
                        currencyCode: p.currencyCode,
                        quantity: 1,
                      });
                      toast.success("Added to cart", {
                        description: p.title,
                        position: "top-center",
                      });
                    }}
                    disabled={!p.availableForSale}
                    className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
                  >
                    {p.availableForSale ? <><Plus className="h-4 w-4 mr-1" /> Add to Cart</> : "Coming Soon"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
