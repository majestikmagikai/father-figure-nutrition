import { CheckCircle2, ShieldCheck, FlaskConical, Truck } from "lucide-react";

const items = [
  { icon: CheckCircle2, label: "Made in USA" },
  { icon: ShieldCheck, label: "GMP Certified" },
  { icon: FlaskConical, label: "Third Party Tested" },
  { icon: Truck, label: "60-Day Guarantee" },
];

export const TrustBar = () => (
    <section aria-label="Trust indicators" className="py-10 px-6 border-y border-border bg-card/30">
    <div className="max-w-5xl mx-auto">
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-6 list-none">
        {items.map((i) => (
          <li key={i.label} className="flex items-center justify-center gap-2 text-muted-foreground">
            <i.icon className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="font-display uppercase text-sm tracking-wider">{i.label}</span>
          </li>
        ))}
      </ul>
    </div>
  </section>
);
