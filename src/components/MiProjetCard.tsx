import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { formatXOF } from "@/lib/financial-types";
import { cn } from "@/lib/utils";
import { Building2, Cpu, Landmark, Signal, WalletCards } from "lucide-react";

type MiProjetCardProps = {
  ownerName: string;
  projectName?: string;
  score?: number | null;
  level?: string | null;
  balance: number;
  incomes: number;
  expenses: number;
  operationsCount: number;
  className?: string;
};

function maskId(input: string) {
  const raw = input.replace(/\s+/g, "").toUpperCase();
  const last = raw.slice(-4).padStart(4, "0");
  return `**** ${last}`;
}

function financialHealth(balance: number, incomes: number) {
  if (balance > 0 && incomes > 5_000_000) return "Premium";
  if (balance > 0) return "Solide";
  if (balance > -500_000) return "Sous contrôle";
  return "À surveiller";
}

export function MiProjetCard({
  ownerName,
  projectName,
  score,
  level,
  balance,
  incomes,
  expenses,
  operationsCount,
  className,
}: MiProjetCardProps) {
  const cardId = maskId(ownerName);
  const scoreValue = score ?? 0;
  const safeLevel = level ?? "En attente";
  const health = financialHealth(balance, incomes);

  return (
    <section
      className={cn("min-w-0 space-y-3 sm:space-y-4", className)}
      aria-label="Carte MiPROJET+"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold sm:text-xl">Carte MiPROJET+</h2>
          <p className="text-sm text-muted-foreground">
            Identité entrepreneuriale et synthèse financière premium.
          </p>
        </div>
        <Badge className="shrink-0 bg-gold/15 text-gold-foreground border-gold/30">
          Fintech premium
        </Badge>
      </div>

      <Tabs defaultValue="front" className="w-full min-w-0">
        <TabsList className="grid w-full grid-cols-2 h-10 rounded-xl bg-muted/80 p-1">
          <TabsTrigger value="front">Recto</TabsTrigger>
          <TabsTrigger value="back">Verso</TabsTrigger>
        </TabsList>

        <TabsContent value="front" className="mt-4">
          <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(135deg,var(--color-secondary),color-mix(in_oklab,var(--color-secondary)_55%,black),var(--color-primary))] p-3 text-primary-foreground shadow-[0_30px_80px_-30px_color-mix(in_oklab,var(--color-secondary)_50%,transparent)] sm:rounded-[28px] sm:p-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--color-gold)_35%,transparent),transparent_35%),radial-gradient(circle_at_bottom_left,color-mix(in_oklab,var(--color-primary)_25%,transparent),transparent_38%)]" />
            <div className="relative flex min-h-[0] flex-col justify-between gap-4 sm:min-h-[260px] sm:gap-6">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0 space-y-3">
                  <Logo className="h-8 w-auto sm:h-10" plus={false} />
                  <Badge className="max-w-full whitespace-normal break-words border-white/15 bg-white/10 text-white backdrop-blur-sm">
                    {projectName || "Profil Entrepreneur"}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-white/90 sm:gap-3">
                  <Signal className="h-4 w-4" />
                  <span className="text-xs font-medium sm:text-sm">Premium</span>
                </div>
              </div>

              <div className="grid min-w-0 gap-3 sm:gap-5 lg:grid-cols-[1.2fr_0.9fr] xl:grid-cols-[1.4fr_0.8fr]">
                <div className="min-w-0 space-y-3 sm:space-y-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-white/60 sm:text-[11px] sm:tracking-[0.22em]">
                      Titulaire
                    </div>
                    <div className="mt-1.5 break-words text-xl font-semibold leading-tight text-white sm:mt-2 sm:text-2xl">
                      {ownerName}
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3 text-white sm:grid-cols-2 sm:gap-4">
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm sm:p-4">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-white/60 sm:text-[11px] sm:tracking-[0.2em]">
                        Score
                      </div>
                      <div className="mt-2 text-3xl font-bold text-gold sm:text-4xl">
                        {score ? String(scoreValue).padStart(2, "0") : "--"}
                      </div>
                      <div className="mt-1 text-sm text-white/75">{safeLevel}</div>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-sm sm:p-4">
                      <div className="flex items-center justify-between text-white/65">
                        <span className="text-[10px] uppercase tracking-[0.12em] sm:text-[11px] sm:tracking-[0.2em]">
                          Solde
                        </span>
                        <WalletCards className="h-4 w-4" />
                      </div>
                      <div className="mt-2 break-words text-xl font-bold leading-tight sm:mt-3 sm:text-2xl">
                        {formatXOF(balance)}
                      </div>
                      <div className="mt-1 text-sm text-white/75">Santé financière {health}</div>
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-5 rounded-2xl border border-white/10 bg-black/15 p-4 backdrop-blur-sm sm:rounded-[24px] sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Cpu className="h-8 w-8 shrink-0 text-gold sm:h-9 sm:w-9" />
                    <div className="text-right text-[10px] uppercase tracking-[0.12em] text-white/60 sm:text-[11px] sm:tracking-[0.2em]">
                      Carte d’éligibilité
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-white/60">Identifiant</div>
                    <div className="break-words text-lg font-semibold tracking-[0.08em] text-white sm:text-xl sm:tracking-[0.14em]">
                      {cardId}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-white/60 sm:text-[11px] sm:tracking-[0.2em]">
                        Accès
                      </div>
                      <div className="mt-1 text-sm font-medium text-white">
                        Scoring & financement
                      </div>
                    </div>
                    <div className="text-right text-base font-semibold text-white sm:text-lg">
                      MiPROJET+
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="back" className="mt-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border/60 bg-[linear-gradient(160deg,color-mix(in_oklab,var(--color-card)_92%,var(--color-secondary)_8%),color-mix(in_oklab,var(--color-card)_96%,black_4%))] p-3 shadow-[0_24px_70px_-32px_color-mix(in_oklab,var(--color-secondary)_25%,transparent)] sm:rounded-[28px] sm:p-6">
            <div className="h-12 rounded-xl bg-foreground/95" />
            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="min-w-0 space-y-4 rounded-2xl border bg-background/70 p-4 backdrop-blur-sm sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">
                      État financier
                    </div>
                    <div className="mt-1 text-lg font-semibold">Synthèse détaillée</div>
                  </div>
                  <Building2 className="h-5 w-5 shrink-0 text-primary" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Encaissements" value={formatXOF(incomes)} tone="positive" />
                  <Metric label="Décaissements" value={formatXOF(expenses)} tone="negative" />
                  <Metric label="Opérations" value={String(operationsCount)} />
                  <Metric label="Niveau" value={safeLevel} tone="neutral" />
                </div>
              </div>

              <div className="min-w-0 rounded-2xl border bg-background/80 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">
                      Lecture financeur
                    </div>
                    <div className="mt-1 text-lg font-semibold">Profil de solvabilité</div>
                  </div>
                  <Landmark className="h-5 w-5 shrink-0 text-secondary" />
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score global</span>
                      <span className="font-semibold">
                        {score ? `${scoreValue}/100` : "En calcul"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-secondary via-primary to-gold"
                        style={{ width: `${Math.max(8, Math.min(scoreValue, 100))}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 text-sm">
                    <Row label="Solde disponible" value={formatXOF(balance)} />
                    <Row label="Capacité actuelle" value={health} />
                    <Row label="Projet principal" value={projectName || "Non renseigné"} />
                    <Row label="Titulaire" value={ownerName} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-primary"
      : tone === "negative"
        ? "text-destructive"
        : "text-foreground";

  return (
    <div className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-2 break-words text-base font-semibold sm:text-lg", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-3 text-sm last:border-b-0 last:pb-0 sm:items-center">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}
