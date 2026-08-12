import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Leaf } from "lucide-react";
import brandLogo from "@/assets/father-figure-logo-official-640.webp";
import heroBg from "@/assets/hero-father.webp";

export const Hero = () => {
  const [offset, setOffset] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      setOffset(window.scrollY * 0.4);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden" aria-label="Hero">
      {/* Parallax background */}
      <div
        className="absolute inset-0 w-full h-[180%] -top-[10%]"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `translateY(${offset}px)`,
          willChange: "transform",
        }}
      />
      {/* Overlay so text stays readable */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative max-w-7xl mx-auto px-6 pt-0 pb-8 md:pb-10 grid md:grid-cols-2 gap-10 items-start">
        <div>
          <div className="relative mb-10 -mx-6 pt-20">
            
            <div className="absolute bottom-0 px-6 translate-y-1/2 left-0">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border-2 border-accent/80 text-primary text-xs uppercase tracking-widest font-bold shadow-cta whitespace-nowrap">
                <Shield className="h-4 w-4" />
                Veteran Owned · 80% Organic
              </div>
            </div>
          </div>

          <h1 className="font-display uppercase tracking-tight text-[2rem] md:text-[4.5rem] leading-none text-foreground mb-2 max-w-xl drop-shadow-[4px_4px_0px_rgba(255,255,255,1)]">
            From<span className="italic">"Dad Bod"</span>, to {" "}
            <span className="text-primary">Discip</span><span className="text-orange">line.</span>
          </h1>
          <p className="text-sm md:text-base text-foreground/80 mb-2 max-w-xl">
            Simple, effective men's nutrition that supports everyday strength, energy, consistency,
            and confidence without unnecessary fillers or complicated routines.
          </p>
          <p className="font-sans uppercase tracking-widest text-sm md:text-md text-primary mb-8 font-bold">
            Performance supplements for men who lead.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-95 shadow-cta font-display uppercase tracking-wider text-base">
              <a href="#shop">
                Start Your Mission <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border font-display uppercase tracking-wider text-base">
              <a href="#about">My Story</a>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-12 max-w-md" role="list" aria-label="Brand highlights">
            {[
              { v: "80%", l: "Organic" },
              { v: "100%", l: "USA Made" },
              { v: "60d", l: "Guarantee" },
            ].map((s) => (
              <div key={s.l} role="listitem" className="border-l-2 border-accent pl-3">
                <div className="font-display text-3xl text-gold drop-shadow-[0_2px_8px_hsl(var(--accent)/0.4)]" aria-label={`${s.v} ${s.l}`}>{s.v}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground" aria-hidden="true">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:flex justify-end items-center pt-32">

            <div className="relative bg-card/90 backdrop-blur-sm border-2 border-accent rounded-2xl p-6 shadow-card max-w-xs">
              <div className="absolute -top-3 -right-3 bg-gradient-gold text-navy text-[16px] font-display uppercase tracking-widest px-2 py-1 rounded-full shadow-cta">
                Veteran Built
              </div>
              <Leaf className="h-7 w-7 text-gold mb-3" />
              <h3 className="font-display uppercase text-[1.75rem] leading-tight mb-2 text-navy">
                Built by a Veteran. <br />Trusted by Fathers.
              </h3>
              <p className="text-sm text-muted-foreground">
                Every batch is sourced 80% organic and third-party tested. Your family is
                non-negotiable.
              </p>
            </div>
        </div>
      </div>
    </section>
  );
};
