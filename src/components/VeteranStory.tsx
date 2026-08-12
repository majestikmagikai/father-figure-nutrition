import { Shield, Medal, Leaf, HeartHandshake } from "lucide-react";

export const VeteranStory = () => {
  return (
    <section id="about" className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-widest font-semibold mb-4">
            <Medal className="h-3.5 w-3.5" />
            Our Mission
          </div>
          <h2 className="font-display text-4xl md:text-5xl uppercase mb-4">
            Built by a Veteran. <span className="text-gradient-primary">For Every Father.</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            After serving my country, I came home to the hardest mission of all: being the father
            my family deserves. Father Figure Nutrition was built so no dad has to choose between
            his health and his family.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Veteran Owned",
              text: "Founded and operated by a U.S. military veteran. Discipline, integrity, and accountability in every bottle.",
            },
            {
              icon: Leaf,
              title: "80% Organic",
              text: "Every formula is sourced from at least 80% certified organic ingredients. No fillers. No shortcuts.",
            },
            {
              icon: HeartHandshake,
              title: "Family First",
              text: "Built for fathers who want strength, energy, and longevity. Show up for the people who count on you.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group relative bg-card border border-border rounded-xl p-7 shadow-card hover:border-primary/50 transition-all"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 mb-4 group-hover:bg-primary/20 transition-colors">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-xl uppercase mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
