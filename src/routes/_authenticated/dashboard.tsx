import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, fetchAllUserRecords } from "@/lib/data";
import { MiProjetCard } from "@/components/MiProjetCard";
import { formatXOF, recordFlow, recordLabel } from "@/lib/financial-types";
import { computeScore } from "@/lib/scoring";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Plus, TrendingUp, FolderKanban, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord · MiProjet+" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });
  const recordsQ = useQuery({
    queryKey: ["all-records", user.id],
    queryFn: () => fetchAllUserRecords(user.id),
  });

  const projects = projectsQ.data ?? [];
  const records = recordsQ.data ?? [];
  const firstName =
    typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name.trim() : "";
  const lastName =
    typeof user.user_metadata?.last_name === "string" ? user.user_metadata.last_name.trim() : "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    user.email?.split("@")[0] ||
    "Titulaire MiPROJET+";

  const entrees = records
    .filter((r) => recordFlow(r.record_type) === "in")
    .reduce((s, r) => s + Number(r.amount), 0);
  const sorties = records
    .filter((r) => recordFlow(r.record_type) === "out")
    .reduce((s, r) => s + Number(r.amount), 0);
  const benefice = entrees - sorties;

  // Score moyen
  const activeProject = projects[0];
  const score = activeProject
    ? computeScore(
        activeProject,
        records.filter((r) => r.project_id === activeProject.id),
      )
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-clip p-3 sm:space-y-8 sm:p-6 lg:p-10">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
            Bonjour {displayName} 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Voici l'état de votre activité sur MiProjet+.
          </p>
        </div>
        <Link to="/finances" className="w-full sm:w-auto">
          <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" /> Nouvelle opération
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <MiProjetCard
            ownerName={displayName}
            projectName={activeProject?.title}
            score={score?.score_global}
            level={score?.niveau}
            balance={benefice}
            incomes={entrees}
            expenses={sorties}
            operationsCount={records.length}
          />

          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            <KPI
              label="Entrées totales"
              value={formatXOF(entrees)}
              icon={ArrowUpRight}
              color="text-success"
            />
            <KPI
              label="Sorties totales"
              value={formatXOF(sorties)}
              icon={ArrowDownRight}
              color="text-destructive"
            />
            <KPI
              label="Bénéfice net"
              value={formatXOF(benefice)}
              icon={TrendingUp}
              color={benefice >= 0 ? "text-primary" : "text-destructive"}
            />
            <KPI
              label="Projets actifs"
              value={String(projects.length)}
              icon={FolderKanban}
              color="text-secondary"
            />
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="min-w-0 rounded-2xl bg-card border p-4 sm:p-6 lg:col-span-2">
              <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Opérations récentes</h2>
                <Link to="/finances" className="shrink-0 text-sm text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              {records.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  Aucune opération.{" "}
                  <Link to="/finances" className="text-primary underline">
                    Saisir la première
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {records.slice(0, 8).map((r) => {
                    const isIn = recordFlow(r.record_type) === "in";
                    return (
                      <div
                        key={r.id}
                        className="flex min-w-0 items-start justify-between gap-3 py-3 sm:items-center sm:gap-4"
                      >
                        <div className="min-w-0">
                          <div className="break-words text-sm font-medium sm:truncate">
                            {r.description || recordLabel(r.record_type)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {recordLabel(r.record_type)} ·{" "}
                            {new Date(r.record_date).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 text-right text-xs font-semibold sm:text-sm ${isIn ? "text-success" : "text-destructive"}`}
                        >
                          {isIn ? "+" : "−"} {formatXOF(Number(r.amount))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl gradient-hero p-4 text-white sm:p-6">
              <div className="text-xs uppercase tracking-[0.16em] text-white/70">
                MiProjet Score
              </div>
              <div className="mt-3 text-5xl font-bold text-gradient-gold sm:text-6xl">
                {score?.score_global ?? "—"}
              </div>
              <div
                className={`mt-3 inline-flex w-fit px-3 py-1 rounded-full text-xs font-bold ${score ? "bg-gold text-gold-foreground" : "bg-white/15"}`}
              >
                {score?.niveau ?? "En attente"}
              </div>
              <div className="mt-6 min-w-0 break-words text-sm text-white/80">
                {activeProject?.title ?? "Créez un projet pour calculer votre score"}
              </div>
              <Link to="/score" className="mt-auto pt-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Voir le détail
                </Button>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card border p-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 text-sm text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
      </div>
      <div className="mt-2 break-words text-xl font-bold leading-tight sm:text-2xl">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed bg-card p-6 text-center sm:rounded-3xl sm:p-12">
      <Wallet className="w-12 h-12 mx-auto text-primary" />
      <h2 className="mt-4 text-2xl font-bold">Créez votre premier projet</h2>
      <p className="mt-2 text-muted-foreground max-w-md mx-auto">
        Définissez votre activité pour commencer à saisir vos opérations et construire votre score
        de finançabilité.
      </p>
      <Link to="/projets" className="inline-block mt-6">
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Créer un projet
        </Button>
      </Link>
    </div>
  );
}
