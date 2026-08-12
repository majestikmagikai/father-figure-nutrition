import { Link } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCTS, LocalProduct } from "@/lib/products";
import { useCartStore } from "@/stores/cartStore";
import { VeteranBadge } from "@/components/VeteranBadge";
import { toast } from "sonner";

export const ProductGrid = () => (
  <section id="shop" className="relative py-24 px-6 bg-navy overflow-hidden">
    {/* Background orbs */}
    <div className="absolute -top-20 -left-20 w-96 h-96 bg-orange/20 rounded-full pointer-events-none z-0 animate-orb-1" />
    <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-sky/20 rounded-full pointer-events-none z-0 animate-orb-2" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange/10 rounded-full pointer-events-none z-0 animate-orb-3" />
    <div className="relative z-10 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs uppercase tracking-widest font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          The Arsenal
        </div>
        <h2 className="font-display text-4xl md:text-5xl uppercase mb-3 text-white">
          Shop the Mission Stack
        </h2>
        <p className="text-white/60 max-w-full mx-auto">
          Three core supplements engineered to rebuild a father's strength, energy, and edge.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRODUCTS.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  </section>
);

const ProductCard = ({ product }: { product: LocalProduct }) => {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);
  const image = product.images[0];

  const handleAdd = () => {
    addItem({
      productId: product.id,
      handle: product.handle,
      title: product.title,
      image,
      variantId: product.variantId,
      price: product.price,
      currencyCode: product.currencyCode,
      quantity: 1,
    });
    toast.success("Added to cart", { description: product.title, position: "top-center" });
  };

  return (
    <div className="group relative bg-navy-foreground/5 border border-white/10 rounded-xl overflow-hidden shadow-card hover:border-primary/50 transition-all hover:-translate-y-1 duration-300">
      <Link to={`/product/${product.handle}`} className="block aspect-square overflow-hidden bg-secondary/30 relative">
        {/* Orange glow orb behind image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="w-48 h-48 bg-orange/30 rounded-full blur-2xl" />
        </div>
        <img
          src={image.url}
          alt={image.altText}
          loading="lazy"
          className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <VeteranBadge />
        </div>
      </Link>
      <div className="p-5 bg-[#0D1B2A]">
        <Link to={`/product/${product.handle}`}>
          <h3 className="font-display text-xl uppercase tracking-wide mb-1 text-white hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-sm text-white/50 mb-3 line-clamp-2 min-h-[2.5rem]">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="font-display text-2xl text-primary">
            ${parseFloat(product.price).toFixed(2)}
          </span>
          <Button
            onClick={handleAdd}
            disabled={isLoading || !product.availableForSale}
            aria-label={`Add ${product.title} to cart`}
            className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider"
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
