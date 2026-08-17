import { Shield, Star, ArrowRight } from "lucide-react";
import logo from "@/assets/father-figure-logo-official-640.webp";

export const SiteFooter = () => {
  return (
    <footer className="relative bg-navy text-white overflow-hidden">
      {/* Orbs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-20 w-80 h-80 bg-sky/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-10 grid md:grid-cols-4 gap-10">

        {/* Brand col */}
        <div className="md:col-span-2">
          <img src={logo} alt="Father Figure Nutrition" className="h-16 object-contain mb-4" />
          <p className="text-sm text-white/60 max-w-sm leading-relaxed mb-5">
            Performance supplements for men who lead. From dad bod to discipline. Simple, effective nutrition for hardworking men.
          </p>
          <div className="flex items-center gap-2 text-xs text-orange font-bold uppercase tracking-widest">
            <Shield className="h-4 w-4" />
            Veteran Owned · 80% Organic
          </div>
        </div>

        {/* Shop col */}
        <div>
          <h4 className="font-display uppercase text-sm tracking-wider mb-4 text-orange">Shop</h4>
          <ul className="space-y-2.5 text-sm text-white/60">
            {[
              { href: "/#shop", label: "All Supplements" },
              { href: "/#bundle", label: "Starter Stack" },
              { href: "/#mission", label: "Our Mission" },
              { href: "/#apparel", label: "Apparel" },
              { href: "/#faq", label: "FAQ" },
              { href: "/sitemap.xml", label: "Sitemap" },
            ].map((l) => (
              <li key={l.href}>
                <a href={l.href} className="hover:text-orange transition-colors inline-flex items-center gap-1 group">
                  <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Promise col */}
        <div>
          <h4 className="font-display uppercase text-sm tracking-wider mb-4 text-orange">Our Promise</h4>
          <ul className="space-y-2.5 text-sm text-white/60">
            {["Made in USA", "GMP Certified", "Quality Tested", "60-Day Money Back"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Star className="h-3 w-3 text-orange fill-current shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 border-t border-white/10 py-6 px-6 text-center text-xs text-white/40 space-y-2">
        <p className="max-w-3xl mx-auto italic">
          *These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.
        </p>
        <p>© {new Date().getFullYear()} Father Figure Nutrition. Veteran owned. Family built.</p>
        <p>
          Site Designer & Maintainer by{" "}
          <a href="https://majestikmagik.dev" target="_blank" rel="noopener noreferrer" className="hover:text-orange transition-colors underline">
            Majestik Magik
          </a>
        </p>
      </div>
    </footer>
  );
};
