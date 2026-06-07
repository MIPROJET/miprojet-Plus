import { useEffect, useState } from "react";
import { ArrowRight, Mic, Wallet, Gauge, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { icon: Wallet, title: "1. Enregistrez votre activité", text: "Chaque vente, chaque dépense. À l'écrit ou à la voix." },
  { icon: Mic, title: "2. Parlez, on transcrit", text: "Appuyez sur le micro pour saisir sans taper." },
  { icon: Gauge, title: "3. Recevez votre score", text: "Votre MIPROJET SCORE évalue votre finançabilité." },
];

const KEY = "mp-onboarding-seen-v1";

export function MobileOnboarding() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(KEY) && window.innerWidth < 1024) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function close() {
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, "1");
    setOpen(false);
  }

  if (!open) return null;
  const Step = STEPS[i];
  const Icon = Step.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col p-6 lg:hidden">
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={close} aria-label="Fermer"><X className="w-4 h-4" /></Button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
        <div className="w-24 h-24 rounded-3xl gradient-hero text-primary-foreground flex items-center justify-center shadow-elevated">
          <Icon className="w-12 h-12" />
        </div>
        <h2 className="mt-8 text-2xl font-bold">{Step.title}</h2>
        <p className="mt-3 text-muted-foreground">{Step.text}</p>
        <div className="mt-6 flex gap-1.5">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-primary" : "w-1.5 bg-muted"}`} />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pb-4">
        <Button variant="ghost" onClick={close} className="flex-1">Passer</Button>
        <Button
          onClick={() => (i < STEPS.length - 1 ? setI(i + 1) : close())}
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          {i < STEPS.length - 1 ? "Suivant" : "Commencer"} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
