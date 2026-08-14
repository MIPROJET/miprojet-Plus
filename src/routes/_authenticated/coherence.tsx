import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/coherence")({
  head: () => ({
    meta: [
      { title: "Cohérence & tests d'accès · MiProjet+" },
      {
        name: "description",
        content:
          "Contrôle de cohérence entre le scoring MiProjet+ calculé et les données exposées à l'écosystème MiPROJET Invest, avec tests automatisés des règles d'accès.",
      },
      { property: "og:title", content: "Cohérence & tests d'accès · MiProjet+" },
      {
        property: "og:description",
        content:
          "Écarts scoring/maturité, état de synchronisation écosystème et tests RLS automatisés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoherencePage,
});

type CoherenceRow = {
  project_id: string;
  title: string | null;
  is_public: boolean | null;
  score_calcule: number | null;
  niveau_calcule: string | null;
  maturite_calculee: string | null;
  maturite_projet: string | null;
  score_invest: number | null;
  score_evaluation: number | null;
  computed_at: string | null;
  manque_score: boolean;
  ecart_invest: boolean;
  ecart_maturite: boolean;
  manque_publication: boolean;
  etat: "ok" | "attention" | "critique" | "obsolete";
};

type TestRow = {
  suite: string;
  test_name: string;
  expected: string;
  passed: boolean;
  details: string;
};

const ETAT_META: Record<
  CoherenceRow["etat"],
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ok: {
    label: "Synchronisé",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  attention: {
    label: "Écart détecté",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    Icon: AlertTriangle,
  },
  critique: {
    label: "Score manquant",
    className: "bg-destructive/15 text-destructive",
    Icon: XCircle,
  },
  obsolete: {
    label: "Calcul obsolète",
    className: "bg-muted text-muted-foreground",
    Icon: Clock,
  },
};

function CoherencePage() {
  const [rows, setRows] = useState<CoherenceRow[]>([]);
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState(false);

  async function loadCoherence() {
    const { data, error } = await supabase
      .from("v_mp_scoring_coherence" as never)
      .select("*")
      .order("etat", { ascending: true });
    if (error) {
      toast.error("Impossible de charger la cohérence : " + error.message);
      return;
    }
    setRows((data ?? []) as unknown as CoherenceRow[]);
  }

  async function runTests() {
    setTesting(true);
    const { data, error } = await supabase.rpc("mp_rls_test_report" as never);
    setTesting(false);
    if (error) {
      toast.error("Tests d'accès indisponibles : " + error.message);
      return;
    }
    setTests((data ?? []) as unknown as TestRow[]);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadCoherence(), runTests()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resync(projectId?: string) {
    setSyncing(true);
    const { error } = await supabase.rpc("mp_resync_scoring" as never, {
      _project_id: projectId ?? null,
    } as never);
    if (error) toast.error("Resynchronisation échouée : " + error.message);
    else
      toast.success(
        projectId
          ? "Projet resynchronisé avec l'écosystème."
          : "Scoring et maturité resynchronisés.",
      );
    await loadCoherence();
    setSyncing(false);
  }

  function diffsOf(r: CoherenceRow) {
    const d: { champ: string; calcule: string; expose: string }[] = [];
    if (r.manque_score)
      d.push({
        champ: "Scoring",
        calcule: "non calculé",
        expose: String(r.score_invest ?? "—"),
      });
    if (r.ecart_invest)
      d.push({
        champ: "Score exposé (MiPROJET Invest)",
        calcule: String(r.score_calcule ?? "—"),
        expose: String(r.score_invest ?? "non publié"),
      });
    if (r.ecart_maturite)
      d.push({
        champ: "Niveau de maturité",
        calcule: r.maturite_calculee ?? "—",
        expose: r.maturite_projet ?? "—",
      });
    if (r.manque_publication)
      d.push({
        champ: "Publication écosystème",
        calcule: "éligible à la publication",
        expose: r.is_public ? "publié sans score" : "non publié",
      });
    if (r.score_evaluation != null && r.score_evaluation !== r.score_calcule)
      d.push({
        champ: "Score évaluation manuelle",
        calcule: String(r.score_calcule ?? "—"),
        expose: String(r.score_evaluation),
      });
    if (r.etat === "obsolete")
      d.push({
        champ: "Dernier calcul",
        calcule: "recalcul requis",
        expose: r.computed_at
          ? new Date(r.computed_at).toLocaleString("fr-FR")
          : "jamais",
      });
    return d;
  }


  const alerts = rows.filter((r) => r.etat !== "ok");
  const failed = tests.filter((t) => !t.passed);
  const globalState: CoherenceRow["etat"] =
    rows.some((r) => r.etat === "critique") || failed.length > 0
      ? "critique"
      : alerts.length > 0
        ? "attention"
        : "ok";
  const GlobalIcon = ETAT_META[globalState].Icon;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Cohérence & conformité</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Écarts entre le scoring/maturité calculés par MiPROJET+ et les données
            exposées à l'écosystème MiPROJET Invest, et tests automatisés des règles
            d'accès (admin lecture/écriture, équipe et écosystème en lecture seule).
          </p>
        </div>
        <Button onClick={() => void resync()} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          Resynchroniser
        </Button>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${ETAT_META[globalState].className}`}
          >
            <GlobalIcon className="h-4 w-4" />
            {globalState === "ok"
              ? "Écosystème synchronisé"
              : globalState === "attention"
                ? `${alerts.length} écart(s) à traiter`
                : "Anomalies critiques détectées"}
          </div>
          <div className="text-sm text-muted-foreground">
            {rows.length} projet(s) suivis · {tests.length - failed.length}/
            {tests.length} tests d'accès conformes
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" /> Alertes de cohérence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun projet à contrôler.</p>
          )}
          {rows.map((r) => {
            const meta = ETAT_META[r.etat];
            const Icon = meta.Icon;
            const diffs = diffsOf(r);
            return (
              <div key={r.project_id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.title ?? "Projet"}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Score calculé : {r.score_calcule ?? "—"}</span>
                      <span>Niveau : {r.niveau_calcule ?? "—"}</span>
                      <span>Maturité : {r.maturite_calculee ?? "—"}</span>
                      <span>Invest : {r.score_invest ?? "non publié"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-2 rounded-md px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </div>
                    {r.etat !== "ok" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncing}
                        onClick={() => void resync(r.project_id)}
                      >
                        <RefreshCw
                          className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
                        />
                        Resynchroniser
                      </Button>
                    )}
                  </div>
                </div>

                {diffs.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-md border bg-muted/30">
                    <table className="w-full min-w-[520px] text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b">
                          <th className="px-3 py-2 text-left font-medium">Champ</th>
                          <th className="px-3 py-2 text-left font-medium">
                            Valeur calculée (MiPROJET+)
                          </th>
                          <th className="px-3 py-2 text-left font-medium">
                            Valeur exposée (écosystème)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffs.map((d) => (
                          <tr key={d.champ} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium">{d.champ}</td>
                            <td className="px-3 py-2 text-emerald-700 dark:text-emerald-400">
                              {d.calcule}
                            </td>
                            <td className="px-3 py-2 text-destructive">{d.expose}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Tests automatisés des règles d'accès
          </CardTitle>
          <Button variant="outline" size="sm" onClick={runTests} disabled={testing}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
            Relancer
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {tests.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun test exécuté.</p>
          )}
          {tests.map((t) => (
            <div
              key={t.suite + t.test_name}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">{t.test_name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.suite} · attendu : {t.expected}
                </div>
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  t.passed
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }`}
              >
                {t.passed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {t.passed ? "Conforme" : "Non conforme"}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
