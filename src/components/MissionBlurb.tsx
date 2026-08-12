import { Compass, Target, Users, Shield, Leaf, HeartHandshake } from "lucide-react";

export const MissionBlurb = () => {
  return (
    <section id="mission" aria-label="Our mission" className="relative py-24 px-6 bg-white overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto">

        {/* Two-column: heading left, body right */}
        <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy/10 border border-navy/20 text-navy text-xs uppercase tracking-widest font-bold mb-5">
              <Compass className="h-3.5 w-3.5" />
              Our Mission
            </div>
            <h2 className="font-display text-5xl md:text-7xl uppercase leading-[0.9] text-navy mb-6">
              Built for <span className="text-orange">Fathers.</span><br />
              <span className="italic text-navy/40">Trusted by Men.</span>
            </h2>
          </div>

          <div className="space-y-5 text-base text-navy/60 leading-relaxed pt-2">
            <p>
              At <span className="text-navy font-semibold">Father Figure Nutrition</span>, we believe performance isn't just about looking better. It's about showing up stronger for yourself, your family, and your future.
            </p>
            <p>
              Our mission is to create simple, effective men's nutrition products that support everyday strength, energy, consistency, and confidence. No unnecessary fillers or complicated routines.
            </p>
            <p>
              We built Father Figure Nutrition for hardworking men balancing real life. Long days, responsibilities, and personal goals. Taking care of yourself should feel achievable, not overwhelming.
            </p>
          </div>
        </div>

        {/* Pillars */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Simple", text: "No fillers. No complicated routines." },
            { icon: Users, title: "Built for Real Life", text: "For dads, professionals, and busy men." },
            { icon: Compass, title: "Consistency First", text: "Daily habits that compound into results." },
          ].map((c) => (
            <div key={c.title} className="group bg-secondary border border-navy/10 rounded-2xl p-8 hover:border-orange/40 hover:-translate-y-1 transition-all shadow-card">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-navy mb-5" aria-hidden="true">
                <c.icon className="h-7 w-7 text-orange" />
              </div>
              <h3 className="font-display uppercase tracking-wider text-xl mb-2 text-navy">{c.title}</h3>
              <p className="text-base text-navy/50">{c.text}</p>
            </div>
          ))}
        </div>

        {/* About / Veteran section */}
        <div className="mt-16 pt-16 border-t border-navy/10">
          <div className="text-center mb-10">
            <h2 className="font-display text-4xl md:text-5xl uppercase text-navy mb-4">
              Built by a Veteran. <span className="text-orange">For Every Father.</span>
            </h2>
            <p className="max-w-2xl mx-auto text-navy/60">
              After serving my country, I came home to the hardest mission of all: being the father
              my family deserves. Father Figure Nutrition was built so no dad has to choose between
              his health and his family.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Veteran Owned", text: "Founded and operated by a U.S. military veteran. Discipline, integrity, and accountability in every bottle." },
              { icon: Leaf, title: "80% Organic", text: "Every formula is sourced from at least 80% certified organic ingredients. No fillers. No shortcuts." },
              { icon: HeartHandshake, title: "Family First", text: "Built for fathers who want strength, energy, and longevity. Show up for the people who count on you." },
            ].map((card) => (
              <div key={card.title} className="group bg-secondary border border-navy/10 rounded-2xl p-8 hover:border-orange/40 hover:-translate-y-1 transition-all shadow-card">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-navy mb-5">
                  <card.icon className="h-7 w-7 text-orange" />
                </div>
                <h3 className="font-display text-xl uppercase mb-2 text-navy">{card.title}</h3>
                <p className="text-base text-navy/50">{card.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
