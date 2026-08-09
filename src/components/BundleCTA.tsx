import { Button } from "@/components/ui/button";
import { CheckCircle2, Package } from "lucide-react";

export const BundleCTA = () => {
  return (
    <section
      id="bundle"
      className="relative py-24 px-6 overflow-hidden border-y border-border bg-gradient-hero"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 pointer-events-none" />
      <div className="relative max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-xs uppercase tracking-widest font-semibold mb-5">
          <Package className="h-3.5 w-3.5" />
          The Father Figure Stack
        </div>
        <h2 className="font-display text-4xl md:text-6xl uppercase mb-4 leading-[0.95]">
          Stack & <br />
          <span className="text-gradient-primary">Save.</span>
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Two ways to stack: the <strong>Performance Stack</strong> (Creatine + Multivitamin, $34.99)
          and the <strong>Transformation Bundle</strong> (Multi + Cleanse + Creatine, $44.99).
        </p>

        <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-10 text-left">
          {["Multi Vitamin Plus — Daily Foundation", "15 Day Fresh Start Cleanse — Reset", "Creatine Hardbody — Strength & Recovery"].map((f) => (
            <div key={f} className="flex items-start gap-2 bg-card/60 border border-border rounded-lg p-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>

        <Button
          asChild
          size="lg"
          className="bg-gradient-primary hover:opacity-95 shadow-cta font-display uppercase tracking-wider text-base"
        >
          <a href="#shop">Build Your Stack</a>
        </Button>
        <p className="text-xs text-muted-foreground mt-3 uppercase tracking-widest">
          60-day money back guarantee
        </p>
      </div>
    </section>
  );
};
