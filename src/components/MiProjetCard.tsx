import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { formatXOF } from "@/lib/financial-types";
import { cn } from "@/lib/utils";
import { Building2, Cpu, Landmark, WalletCards } from "lucide-react";

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

/**
 * Format carte bancaire réelle : 85,60 × 53,98 mm — ratio 1,586:1.
 * Le composant .card-ratio garantit la proportion quelle que soit la largeur.
 */
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
    <section className={cn("min-w-0 space-y-3 sm:space-y-4", className)} aria-label="Carte MiPROJET+">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold sm:text-xl">Carte MiPROJET+</h2>
          <p className="text-sm text-muted-foreground">Identité organisation & lecture financière.</p>
        </div>
        <Badge className="shrink-0 bg-primary/10 text-primary border border-primary/20">
          Édition entreprise
        </Badge>
      </div>

      <Tabs defaultValue="front" className="w-full min-w-0">
        <TabsList className="grid w-full grid-cols-2 h-10 rounded-xl bg-muted/80 p-1">
          <TabsTrigger value="front">Recto</TabsTrigger>
          <TabsTrigger value="back">Verso</TabsTrigger>
        </TabsList>

        <TabsContent value="front" className="mt-4">
          <div className="mx-auto w-full max-w-md">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-primary shadow-lg shadow-primary/20"
              style={{ aspectRatio: "1.586 / 1" }}
            >
              <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="rounded-md bg-white/95 px-2 py-1 inline-block">
                      <Logo className="h-5 w-auto sm:h-6" />
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-on-primary-muted">
                      Carte organisation
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md bg-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
                    MiPROJET+
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-on-primary-muted">
                    Chiffre d'affaires cumulé
                  </div>
                  <div className="mt-0.5 truncate text-xl font-bold text-on-primary sm:text-2xl">
                    {formatXOF(incomes)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-on-primary-muted">
                    Solde&nbsp;: <span className="font-semibold text-on-primary-accent">{formatXOF(balance)}</span>
                    <span className="mx-1.5 opacity-40">•</span>
                    {operationsCount} opé.
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-on-primary-muted">
                      Titulaire
                    </div>
                    <div className="truncate text-sm font-semibold text-on-primary sm:text-base">{ownerName}</div>
                    <div className="truncate text-[11px] text-on-primary-muted">
                      {projectName || "Organisation"}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-on-primary-muted">Score</div>
                    <div className="text-2xl font-bold text-gold sm:text-3xl leading-none">
                      {score ? String(scoreValue).padStart(2, "0") : "--"}
                    </div>
                    <div className="text-[10px] text-on-primary-muted">{safeLevel}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[color-mix(in_oklab,var(--on-primary)_20%,transparent)] pt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Cpu className="h-4 w-4 shrink-0 text-gold" />
                    <span className="truncate text-[11px] tracking-[0.14em] font-mono text-on-primary">{cardId}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 text-on-primary">
                    <WalletCards className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium">{health}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="back" className="mt-4">
          <div className="min-w-0 overflow-hidden rounded-2xl border bg-card p-4 sm:p-6">
            <div className="h-10 rounded-md bg-foreground/90" />
            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
              <div className="min-w-0 space-y-4 rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      État financier
                    </div>
                    <div className="mt-1 text-base font-semibold">Synthèse</div>
                  </div>
                  <Building2 className="h-5 w-5 shrink-0 text-primary" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric label="Encaissements" value={formatXOF(incomes)} tone="positive" />
                  <Metric label="Décaissements" value={formatXOF(expenses)} tone="negative" />
                  <Metric label="Opérations" value={String(operationsCount)} />
                  <Metric label="Niveau" value={safeLevel} />
                </div>
              </div>

              <div className="min-w-0 rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Lecture financeur
                    </div>
                    <div className="mt-1 text-base font-semibold">Solvabilité</div>
                  </div>
                  <Landmark className="h-5 w-5 shrink-0 text-secondary" />
                </div>
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Score global</span>
                      <span className="font-semibold">{score ? `${scoreValue}/100` : "En calcul"}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
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
    tone === "positive" ? "text-primary" : tone === "negative" ? "text-destructive" : "text-foreground";
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1.5 break-words text-sm font-semibold sm:text-base", toneClass)}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-2 text-sm last:border-b-0 last:pb-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value}</span>
    </div>
  );
}
