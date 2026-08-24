import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

// Asset imports
import fullLogo from "@/assets/father-figure-logo-full.webp";
import heroBg from "@/assets/hero-father.webp";
import fruit1 from "@/assets/father_figure_fruit_001.jpeg";
import fruit2 from "@/assets/father_figure_fruit_002.jpeg";
import workout from "@/assets/father_figure_fruit_003.jpeg";
import meal from "@/assets/father_figure_fruit_004.jpeg";

const slideImages = [fullLogo, heroBg, fruit1, fruit2, workout, meal];

export const Hero = () => {
  const [offset, setOffset] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax scroll effect
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

  // Background slideshow timer (switches every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden" aria-label="Hero">
      {/* Background Slideshow with Parallax */}
      <div
        className="absolute inset-0 w-full h-[180%] -top-[20%]" /* Shifted container top higher */
        style={{
          transform: `translateY(${offset}px)`,
          willChange: "transform",
        }}
      >
        {slideImages.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url(${img})`,
              backgroundSize: "cover",
              backgroundPosition: "center 55%", /* Shifted focus 20% from the top */
            }}
          />
        ))}
      </div>

      {/* Dark overlay so hero text stays completely readable */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-12 md:pb-16 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent border-2 border-accent/80 text-primary text-sm uppercase tracking-widest font-bold shadow-cta">
            <Shield className="h-4 w-4" />
            Father Figure Nutrition
          </div>
        </div>

        {/* Scaled-up Headline */}
        <h1 className="font-display uppercase tracking-tight text-[2.75rem] sm:text-[4rem] md:text-[5.5rem] leading-[0.95] text-foreground mb-4 max-w-4xl drop-shadow-[4px_4px_0px_rgba(255,255,255,1)]">
          <span className="italic">Fuel the Man</span> <br />
          <span className="text-primary">You’re </span>{" "}
          <span className="text-orange">Becoming</span>
        </h1>

        {/* Larger Subheadings */}
        <p className="font-sans uppercase tracking-widest text-base md:text-xl text-primary mb-3 font-bold max-w-2xl">
          Performance supplements for men who lead.
        </p>
        <p className="text-base md:text-lg text-foreground/80 mb-8 max-w-2xl leading-relaxed">
          Daily nutrition designed for men balancing work, family, fitness, and everything in between. Perform better, look better, feel better, and keep up with life.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Button asChild size="lg" className="bg-gradient-primary hover:opacity-95 shadow-cta font-display uppercase tracking-wider text-lg px-8 py-6 group">
            <a href="#shop">
              Start Your Mission <ArrowRight className="ml-2 h-5 w-5 transition-all duration-200 group-hover:translate-x-2 group-hover:[filter:blur(0.6px)_drop-shadow(4px_0_3px_currentColor)]" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border font-display uppercase tracking-wider text-lg px-8 py-6">
            <a href="#bundle">SHOP NOW</a>
          </Button>
        </div>

        {/* Highlight Stats */}
        <div className="flex justify-center gap-8 w-full max-w-md" role="list" aria-label="Brand highlights">
          {[
            { v: "80%", l: "Organic" },
            { v: "60d", l: "Guarantee" },
          ].map((s) => (
            <div key={s.l} role="listitem" className="border-l-2 border-navy pl-4 text-left">
              <div className="font-display text-4xl text-gold drop-shadow-[0_2px_8px_hsl(var(--accent)/0.4)]" aria-label={`${s.v} ${s.l}`}>
                {s.v}
              </div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold" aria-hidden="true">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};