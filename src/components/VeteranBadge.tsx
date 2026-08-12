import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface VeteranBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

export const VeteranBadge = ({ variant = "compact", className }: VeteranBadgeProps) => {
  if (variant === "full") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border-2 border-navy bg-gradient-to-br from-navy/10 to-navy/5 p-3 shadow-[0_4px_20px_-4px_hsl(var(--navy)/0.2)]",
          className,
        )}
      >
        <div className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-md bg-navy border border-navy">
          <Shield className="h-4.5 w-4.5 text-sky" />
        </div>
        <div className="min-w-0">
          <div className="font-display uppercase tracking-widest text-[1rem] text-navy mb-0.5">
            Veteran Owned · Family Built
          </div>
          <p className="text-xs text-muted-foreground leading-snug">
            Founded by a U.S. military veteran. Simple, effective men's nutrition for
            hardworking dads. No fillers, no nonsense.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gold border border-accent text-navy text-[10px] uppercase tracking-widest font-bold shadow-sm",
        className,
      )}
      title="Veteran Owned · Family Built"
    >
      <Shield className="h-3 w-3" />
      Veteran Owned
    </div>
  );
};
