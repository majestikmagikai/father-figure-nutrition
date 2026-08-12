import { Button } from "@/components/ui/button";
import { CheckCircle2, Package } from "lucide-react";

const bundles = [
  {
    name: "Performance Stack",
    price: "$34.99",
    items: ["Creatine Hardbody", "Multi Vitamin Plus"],
    tag: "Most Popular",
  },
  {
    name: "Transformation Bundle",
    price: "$44.99",
    items: ["Creatine Hardbody", "Multi Vitamin Plus", "15 Day Fresh Start Cleanse"],
    tag: "Best Value",
  },
];

export const BundleCTA = () => {
  return (
    <section id="bundle" aria-label="Bundle offers" className="relative py-24 px-6 overflow-hidden bg-secondary">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-secondary to-orange/5 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-semibold mb-5">
          <Package className="h-3.5 w-3.5" />
          The Father Figure Stack
        </div>
        <h2 className="font-display text-4xl md:text-6xl uppercase mb-4 leading-[0.95] text-navy">
          Stack &amp; <span className="text-orange">Save.</span>
        </h2>
        <p className="text-navy/50 max-w-xl mx-auto mb-10">
          Two ways to stack. One mission: show up stronger every day.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10 text-left">
          {bundles.map((b) => (
            <div key={b.name} className="relative bg-white border border-navy/10 rounded-2xl p-6 hover:border-orange/50 transition-all shadow-card">
              <span className="absolute -top-3 left-4 bg-orange text-white text-[10px] font-display uppercase tracking-widest px-3 py-1 rounded-full">
                {b.tag}
              </span>
              <h3 className="font-display text-xl uppercase text-navy mb-1">{b.name}</h3>
              <p className="text-orange font-display text-3xl mb-4">{b.price}</p>
              <ul className="space-y-2">
                {b.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-navy/60">
                    <CheckCircle2 className="h-4 w-4 text-orange shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Button
          asChild
          size="lg"
          className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider text-base"
        >
          <a href="#shop" onClick={(e) => { e.preventDefault(); const el = document.getElementById('shop'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}>Build Your Stack</a>
        </Button>
        <p className="text-xs text-navy/40 mt-3 uppercase tracking-widest">
          60-day money back guarantee
        </p>
      </div>
    </section>
  );
};
