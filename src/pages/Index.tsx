import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { ProductGrid } from "@/components/ProductGrid";
import { BundleCTA } from "@/components/BundleCTA";
import { ApparelGrid } from "@/components/ApparelGrid";
import { VeteranStory } from "@/components/VeteranStory";
import { PartnershipSection } from "@/components/PartnershipSection";
import { MissionBlurb } from "@/components/MissionBlurb";
import { FAQ } from "@/components/FAQ";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Father Figure Nutrition — Performance Supplements for Men Who Lead";
    const desc = "From dad bod to discipline. Simple, effective men's nutrition — creatine gummies, multivitamins and the Starter Stack — built for hardworking men, dads, and pros.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <ProductGrid />
        <BundleCTA />
        <MissionBlurb />
        <ApparelGrid />
        <VeteranStory />
        <PartnershipSection />
        <FAQ />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
