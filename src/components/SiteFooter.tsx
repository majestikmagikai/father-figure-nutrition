import { Shield, Star } from "lucide-react";
import logo from "@/assets/logo.png";

export const SiteFooter = () => {
  return (
    <footer className="border-t-4 border-accent bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={logo} alt="" className="h-9 w-9" />
            <span className="font-display text-lg uppercase">Father Figure Nutrition</span>
          </div>
          <p className="text-sm text-primary-foreground/75 max-w-xs">
            Performance supplements for men who lead. From "dad bod" to discipline — simple,
            effective nutrition for hardworking men.
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs text-gold font-bold">
            <Shield className="h-4 w-4" />
            <span className="uppercase tracking-widest">Veteran Owned · 80% Organic</span>
          </div>
        </div>

        <div>
          <h4 className="font-display uppercase text-sm tracking-wider mb-3 text-gold">
            Shop
          </h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li><a href="/#shop" className="hover:text-gold transition-colors">All Supplements</a></li>
            <li><a href="/#bundle" className="hover:text-gold transition-colors">The Father Figure Starter Stack</a></li>
            <li><a href="/#mission" className="hover:text-gold transition-colors">Our Mission</a></li>
            <li><a href="/#faq" className="hover:text-gold transition-colors">FAQ</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display uppercase text-sm tracking-wider mb-3 text-gold">
            Promise
          </h4>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li className="flex items-center gap-2"><Star className="h-3 w-3 text-gold fill-current" /> Made in USA</li>
            <li className="flex items-center gap-2"><Star className="h-3 w-3 text-gold fill-current" /> GMP Certified</li>
            <li className="flex items-center gap-2"><Star className="h-3 w-3 text-gold fill-current" /> Quality Tested</li>
            <li className="flex items-center gap-2"><Star className="h-3 w-3 text-gold fill-current" /> 60-Day Money Back</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-accent/40 py-5 px-6 text-center text-xs text-primary-foreground/70 space-y-2">
        <p className="max-w-3xl mx-auto italic">
          *These statements have not been evaluated by the FDA. This product is not intended to
          diagnose, treat, cure, or prevent any disease.
        </p>
        <p>© {new Date().getFullYear()} Father Figure Nutrition. Veteran owned. Family built.</p>
      </div>
    </footer>
  );
};
