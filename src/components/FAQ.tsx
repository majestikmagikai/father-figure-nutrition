import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is the Father Figure Starter Stack?",
    a: (
      <>
        The Father Figure Starter Stack combines <strong>Creatine Gummies</strong> and{" "}
        <strong>Adult Multivitamin Gummies</strong>. It's designed to support daily performance,
        consistency, energy, and recovery in one simple routine.
      </>
    ),
  },
  {
    q: "Who are these products made for?",
    a: "Father Figure Nutrition is designed for busy men, dads, professionals, gym beginners, and active lifestyles. Anyone looking for a convenient daily nutrition routine can benefit.",
  },
  {
    q: "What are creatine gummies used for?",
    a: "Creatine is commonly used to support strength, workout performance, muscle recovery, and training consistency. Our gummy format offers a convenient alternative to powders.",
  },
  {
    q: "Why take a multivitamin daily?",
    a: "A multivitamin helps support daily nutrient intake, energy production, overall wellness, and active lifestyles. It's an easy way to help fill nutritional gaps.",
  },
  {
    q: "When should I take the gummies?",
    a: "Take your multivitamin daily with food. Take creatine gummies daily, preferably around workouts or anytime during the day. Consistency matters more than timing.",
  },
  {
    q: "How long before I notice results?",
    a: "Everyone is different, but many people report noticing benefits from consistent use within several weeks combined with proper hydration, exercise, nutrition, and sleep.",
  },
  {
    q: "Are the products third-party tested?",
    a: "Our products are manufactured in facilities that follow GMP (Good Manufacturing Practices) standards and are produced with quality and consistency in mind.",
  },
  {
    q: "Do the gummies contain unnecessary fillers?",
    a: "Father Figure Nutrition focuses on creating simple, convenient products designed to fit into everyday routines.",
  },
  {
    q: "Can I take both products together?",
    a: "Yes. The Father Figure Starter Stack is designed to be used together as part of a daily routine.",
  },
  {
    q: "Are these products intended to diagnose or treat medical conditions?",
    a: "No. These products are dietary supplements and are not intended to diagnose, treat, cure, or prevent any disease.",
  },
  {
    q: "Do I need to work out to use these products?",
    a: "No. While active lifestyles can complement supplementation, many customers use the products simply to support consistency, nutrition, and daily wellness routines.",
  },
  {
    q: "How should I store the gummies?",
    a: "Store in a cool, dry place away from direct sunlight and keep the lid tightly sealed after opening.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" aria-label="Frequently asked questions" className="py-24 px-6 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/30 text-navy text-xs uppercase tracking-widest font-semibold mb-4">
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </div>
          <h2 className="font-display text-4xl md:text-5xl uppercase mb-3">
            Frequently Asked <span className="text-orange">Questions</span>
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about the Starter Stack and daily routine.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border">
              <AccordionTrigger className="text-left font-display uppercase tracking-wide text-base hover:text-primary hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
