import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/use-plan";
import type { PlanFeatures } from "@/lib/plan";

interface Props {
  userId: string;
  require: (f: PlanFeatures) => boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function PlanGate({ userId, require, title, description, children }: Props) {
  const { features, tier } = usePlan(userId);
  if (require(features)) return <>{children}</>;
  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-accent/40 p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
        <Lock className="w-5 h-5" />
      </div>
      <h3 className="mt-3 text-lg font-semibold">{title ?? "Réservé au plan Croissance"}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
        {description ?? "Cette fonctionnalité est incluse dans le plan Croissance."}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">Plan actuel : <span className="font-medium capitalize">{tier}</span></p>
      <Link to="/" hash="pricing">
        <Button className="mt-4 bg-primary hover:bg-primary/90">
          <Sparkles className="w-4 h-4 mr-1.5" /> Voir les plans
        </Button>
      </Link>
    </div>
  );
}
