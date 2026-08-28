import { Shield, Star, ArrowRight, Instagram, Linkedin } from "lucide-react";
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
          <ul className="space-y-2.5 text-sm text-white/60 mb-6">
            {["Made in USA", "GMP Certified", "Quality Tested", "60-Day Money Back"].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Star className="h-3 w-3 text-orange fill-current shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-white/50 hover:text-orange transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-white/50 hover:text-orange transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-white/50 hover:text-orange transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-white/50 hover:text-orange transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
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
