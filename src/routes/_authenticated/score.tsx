import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, fetchProjectRecords } from "@/lib/data";
import { computeScore, niveauColor } from "@/lib/scoring";
import { formatXOF } from "@/lib/financial-types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Lightbulb, Save, Trophy, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { generateScoreReport } from "@/lib/certificates.functions";
import { usePlan } from "@/hooks/use-plan";

export const Route = createFileRoute("/_authenticated/score")({
  head: () => ({ meta: [{ title: "MiProjet Score · MiProjet+" }] }),
  component: ScorePage,
});

function ScorePage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const { tier } = usePlan(user.id);
  const canCertify = tier === "growth" || tier === "partner";
  const generateReport = useServerFn(generateScoreReport);

  const reportM = useMutation({
    mutationFn: async (projectId: string) => generateReport({ data: { projectId } }),
    onSuccess: (r) => {
      const blob = new Blob(
        [Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0))],
        { type: "application/pdf" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `miprojet-score-${r.shortId ?? "apercu"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        r.certificationType === "certified"
          ? `Certificat émis · ID ${r.shortId}`
          : "Aperçu généré (passez au plan Croissance pour la version certifiée)",
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Erreur de génération"),
  });

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });
  const projects = projectsQ.data ?? [];
  const activeId = selectedId || projects[0]?.id || "";
  const activeProject = projects.find((p) => p.id === activeId);
  const publicSlug =
    activeProject && /agri.?capital/i.test(activeProject.title ?? "") ? "agricapital" : null;

  const recordsQ = useQuery({
    queryKey: ["records", activeId],
    queryFn: () => fetchProjectRecords(activeId),
    enabled: !!activeId,
  });

  const score = useMemo(
    () => (activeProject ? computeScore(activeProject, recordsQ.data ?? []) : null),
    [activeProject, recordsQ.data],
  );

  const saveM = useMutation({
    mutationFn: async () => {
      if (!score || !activeProject) return;
      // deactivate previous active scoring
      await supabase
        .from("mp_scoring_results")
        .update({ is_active: false })
        .eq("project_id", activeProject.id)
        .eq("is_active", true);
      const { error } = await supabase.from("mp_scoring_results").insert({
        user_id: user.id,
        project_id: activeProject.id,
        score_juridique: score.score_juridique,
        score_financier: score.score_financier,
        score_technique: score.score_technique,
        score_marche: score.score_marche,
        score_impact: score.score_impact,
        score_global: score.score_global,
        niveau: score.niveau,
        forces: score.forces,
        faiblesses: score.faiblesses,
        recommandations: score.recommandations,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Score enregistré");
      qc.invalidateQueries({ queryKey: ["scoring"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center sm:p-10">
        <h1 className="text-2xl font-bold">Pas encore de projet</h1>
        <p className="mt-2 text-muted-foreground">Créez un projet pour calculer votre score.</p>
        <Link to="/projets" className="inline-block mt-6">
          <Button>Créer un projet</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-clip p-3 sm:space-y-8 sm:p-6 lg:p-10">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">MiProjet Score</h1>
          <p className="mt-1 text-muted-foreground">
            Votre note de finançabilité, mise à jour en continu.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:flex">
          <Select value={activeId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => saveM.mutate()}
            disabled={saveM.isPending || !score}
            variant="outline"
          >
            <Save className="w-4 h-4 mr-1.5" /> Enregistrer
          </Button>
          <Button
            onClick={() => activeId && reportM.mutate(activeId)}
            disabled={reportM.isPending || !score || !activeId}
            className="bg-gradient-to-r from-gold to-primary text-white"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            {reportM.isPending
              ? "Génération…"
              : canCertify
                ? "Télécharger PDF certifié"
                : "Aperçu PDF (non certifié)"}
          </Button>
        </div>
      </div>

      {score && (
        <>
          {publicSlug && (
            <a
              href={`/projets/${publicSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-2 rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/10 via-primary/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-gold">
                  Vitrine publique
                </div>
                <div className="mt-1 break-words text-sm font-medium">
                  Page projet publiée : affiche, offres PalmInvest / TerraPalm, flyers, partition financière et état des lieux.
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                Ouvrir <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          )}
          <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-6">
            <div className="overflow-hidden rounded-2xl gradient-hero p-5 text-center text-white sm:rounded-3xl sm:p-8 lg:col-span-1">
              <div className="text-xs uppercase tracking-[0.16em] text-white/70">Score global</div>
              <div className="mt-2 text-6xl font-bold text-gradient-gold sm:text-7xl lg:text-8xl">
                {score.score_global}
              </div>
              <div className="mt-4 inline-flex px-4 py-1.5 rounded-full bg-gold text-gold-foreground text-sm font-bold">
                {score.niveau}
              </div>
              {score.niveau === "Finançable" && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gold">
                  <Trophy className="w-4 h-4" /> Éligible au catalogue MiProjet
                </div>
              )}
            </div>
            <div className="min-w-0 rounded-2xl bg-card border p-4 sm:p-6 lg:col-span-2">
              <h2 className="text-lg font-semibold mb-5">Décomposition par axe</h2>
              <div className="space-y-4">
                <ScoreBar label="Juridique" value={score.score_juridique} weight="15%" />
                <ScoreBar label="Financier" value={score.score_financier} weight="25%" />
                <ScoreBar label="Technique" value={score.score_technique} weight="20%" />
                <ScoreBar label="Marché" value={score.score_marche} weight="20%" />
                <ScoreBar label="Impact" value={score.score_impact} weight="20%" />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 border-t pt-6 text-center sm:grid-cols-3 sm:gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Entrées</div>
                  <div className="break-words font-bold text-success">
                    {formatXOF(score.totaux.entrees)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Sorties</div>
                  <div className="break-words font-bold text-destructive">
                    {formatXOF(score.totaux.sorties)}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Bénéfice</div>
                  <div className="break-words font-bold">{formatXOF(score.totaux.benefice)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            <Card
              title="Forces"
              icon={CheckCircle2}
              color="text-success"
              items={score.forces}
              empty="Continuez à enregistrer pour révéler vos forces."
            />
            <Card
              title="Faiblesses"
              icon={AlertTriangle}
              color="text-warning"
              items={score.faiblesses}
              empty="Aucune faiblesse identifiée."
            />
            <Card
              title="Recommandations"
              icon={Lightbulb}
              color="text-gold"
              items={score.recommandations}
              empty="Vous êtes sur la bonne voie."
            />
          </div>
        </>
      )}
    </div>
  );
}

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-start justify-between gap-3 text-sm sm:items-center">
        <span className="min-w-0 break-words font-medium">
          {label} <span className="text-xs text-muted-foreground">· pondération {weight}</span>
        </span>
        <span className="shrink-0 font-bold">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  color,
  items,
  empty,
}: {
  title: string;
  icon: any;
  color: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card border p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <h3 className="font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex min-w-0 gap-2">
              <span className={color}>•</span> <span className="min-w-0 break-words">{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
