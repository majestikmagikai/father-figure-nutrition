import { Link } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRODUCTS, LocalProduct } from "@/lib/products";
import { useCartStore } from "@/stores/cartStore";
import { VeteranBadge } from "@/components/VeteranBadge";
import { toast } from "sonner";

export const ProductGrid = () => (
  <section id="shop" className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-widest font-semibold mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          The Arsenal
        </div>
        <h2 className="font-display text-4xl md:text-5xl uppercase mb-3">
          Shop the <span className="text-gradient-primary">Mission Stack</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
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
    <div className="group relative bg-card border border-border rounded-xl overflow-hidden shadow-card hover:border-primary/50 transition-all hover:-translate-y-1 duration-300">
      <Link to={`/product/${product.handle}`} className="block aspect-square overflow-hidden bg-secondary/30 relative">
        <img
          src={image.url}
          alt={image.altText}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <VeteranBadge />
        </div>
      </Link>
      <div className="p-5">
        <Link to={`/product/${product.handle}`}>
          <h3 className="font-display text-xl uppercase tracking-wide mb-1 hover:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
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
            className="bg-gradient-primary hover:opacity-95 shadow-cta font-display uppercase tracking-wider"
          >
            <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
};
