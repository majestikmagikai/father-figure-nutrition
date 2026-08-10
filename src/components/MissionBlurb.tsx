import { Compass, Target, Users } from "lucide-react";

export const MissionBlurb = () => {
  return (
    <section id="mission" aria-label="Our mission" className="relative py-24 px-6 border-t border-border bg-gradient-hero">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      <div className="relative max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold border-2 border-accent text-primary text-xs uppercase tracking-widest font-bold mb-5 shadow-cta">
            <Compass className="h-3.5 w-3.5" />
            Our Mission
          </div>
          <h2 className="font-display text-4xl md:text-6xl uppercase mb-3 leading-[0.95]">
            From <span className="italic text-muted-foreground">"Dad Bod"</span> <br />
            to <span className="text-gradient-primary">Discipline.</span>
          </h2>
        </div>

        <div className="space-y-6 text-base md:text-lg text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">
          <p>
            At <span className="text-foreground font-semibold">Father Figure Nutrition</span>, we
            believe performance isn't just about looking better — it's about showing up stronger
            for yourself, your family, and your future.
          </p>
          <p>
            Our mission is to create simple, effective men's nutrition products that support
            everyday strength, energy, consistency, and confidence — without unnecessary fillers
            or complicated routines.
          </p>
          <p>
            We built Father Figure Nutrition for hardworking men balancing real life — long days,
            responsibilities, and personal goals — because taking care of yourself should feel
            achievable, not overwhelming.
          </p>
          <p>
            Whether you're getting back into the gym, rebuilding discipline, or simply trying to
            feel better every day, we're here to support the process.
          </p>
        </div>

        <p className="text-center font-display uppercase tracking-widest text-xl md:text-2xl mt-12 text-gradient-primary">
          Performance supplements for men who lead.
        </p>

        <div className="grid md:grid-cols-3 gap-4 mt-14">
          {[
            { icon: Target, title: "Simple", text: "No fillers. No complicated routines." },
            { icon: Users, title: "Built for Real Life", text: "For dads, professionals, and busy men." },
            { icon: Compass, title: "Consistency First", text: "Daily habits that compound into results." },
          ].map((c) => (
            <div key={c.title} className="bg-card border-t-4 border-accent rounded-xl p-5 text-center shadow-card hover:-translate-y-1 transition-transform">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-gold mx-auto mb-2" aria-hidden="true">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="font-display uppercase tracking-wider text-sm mb-1 text-primary">{c.title}</div>
              <p className="text-xs text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
