import { FlaskConical, Info } from "lucide-react";

export const IngredientsPanel = ({ handle }: { handle: string }) => {
  void handle;
  return (
    <section id="ingredients-sourcing" className="mt-12 border-t border-border pt-10">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs uppercase tracking-widest font-semibold mb-3">
        <FlaskConical className="h-3.5 w-3.5" /> Ingredients & Sourcing
      </div>
      <h2 className="font-display text-3xl uppercase mb-2">What's Inside & Where It Comes From</h2>
      <div className="flex gap-3 p-4 rounded-lg border border-border bg-card/40 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          Full ingredient research and sourcing details coming soon. Every active ingredient is
          cross-referenced against the NIH, Examine.com, PubMed, and Mayo Clinic.
        </p>
      </div>
    </section>
  );
};
