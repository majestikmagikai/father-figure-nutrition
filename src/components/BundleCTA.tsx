import { Button } from "@/components/ui/button";
import { CheckCircle2, Package } from "lucide-react";
import bottleCreatine from "@/assets/products/creatine-bottle.webp";
import bottleMulti from "@/assets/products/multi-bottle.webp";
import bottleCleanse from "@/assets/products/cleanse-bottle.webp";

const productShots = [
  { name: "Creatine Hardbody", src: bottleCreatine },
  { name: "Multi Vitamin Plus", src: bottleMulti },
  { name: "15 Day Fresh Start Cleanse", src: bottleCleanse },
];

const bundles = [
  {
    name: "Performance Stack",
    price: "$34.99",
    description: "Train Harder. Build Your Routine.",
    summary: "The Performance Stack pairs Creatine Hardbody with Multi Vitamin Plus to create a simple two-product foundation for men focused on training and everyday nutrition. Creatine Hardbody supports your performance-focused training routine, while Multi Vitamin Plus helps support your daily nutritional foundation. Together, they're designed for men who want fewer complicated steps and a more consistent supplement routine.",
    items: ["Creatine Hardbody", "Multi Vitamin Plus"],
    tag: "Most Popular",
    cta: "START YOUR TRANSFORMATION",
  },
  {
    name: "Transformation Bundle",
    price: "$44.99",
    description: "Build Your Daily Foundation",
    summary: "Three products. One simple routine.",
    items: ["Performance support", "Daily nutritional support", "15-day fresh-start routine"],
    tag: "Best Value",
    cta: "START YOUR TRANSFORMATION",
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

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10 text-left">
          {bundles.map((b) => (
            <div key={b.name} className="relative bg-white border border-navy/10 rounded-2xl p-6 hover:border-orange/50 transition-all shadow-card">
              <span className="absolute -top-3 left-4 bg-orange text-white text-[10px] font-display uppercase tracking-widest px-3 py-1 rounded-full">
                {b.tag}
              </span>
              <h3 className="font-display text-xl uppercase text-navy mb-1">{b.name}</h3>
              <p className="text-orange font-display text-3xl mb-4">{b.price}</p>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-navy/80 mb-2">{b.description}</p>
              <p className="text-sm text-navy/65 mb-4 leading-relaxed">{b.summary}</p>
              <div className="text-xs uppercase tracking-[0.18em] text-navy/70 font-semibold mb-3">What's Inside?</div>
              <ul className="space-y-2">
                {b.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-navy/60">
                    <CheckCircle2 className="h-4 w-4 text-orange shrink-0" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-5 pt-4 border-t border-navy/10 text-sm text-navy/70 font-medium">
                {b.name === "Performance Stack" ? "Daily Consistency" : "Three products. One simple routine."}
              </div>
              <div className="mt-2 text-sm text-navy/60 leading-relaxed">
                {b.name === "Performance Stack"
                  ? "Your results aren't built in one workout. They're built through the habits you repeat."
                  : ""}
              </div>
            </div>
          ))}
        </div>

        <Button
          asChild
          size="lg"
          className="bg-orange text-white hover:opacity-90 shadow-cta font-display uppercase tracking-wider text-base"
        >
          <a href="#shop" onClick={(e) => { e.preventDefault(); const el = document.getElementById('shop'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}>START YOUR TRANSFORMATION</a>
        </Button>
        <p className="text-xs text-navy/40 mt-3 uppercase tracking-widest">
          60-day money back guarantee
        </p>
      </div>
    </section>
  );
};
