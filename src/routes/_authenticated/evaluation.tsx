import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Gauge, TrendingUp, Save, Rocket, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evaluation")({
  head: () => ({
    meta: [
      { title: "Évaluation & maturité · MiProjet+" },
      {
        name: "description",
        content:
          "Évaluez la maturité de votre projet sur 6 axes, obtenez un score automatique et déclenchez la publication vers MiPROJET Invest.",
      },
      { property: "og:title", content: "Évaluation & maturité · MiProjet+" },
      {
        property: "og:description",
        content: "Score de maturité automatique et publication vers MiPROJET Invest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EvalPage,
});

const AXES = [
  { key: "gouvernance", label: "Gouvernance", desc: "Structure, statuts, décisions, comités" },
  { key: "finance", label: "Finance", desc: "Comptes, trésorerie, historique financier" },
  { key: "organisation", label: "Organisation", desc: "Processus, outils, structuration interne" },
  { key: "marche", label: "Marché", desc: "Client, positionnement, traction commerciale" },
  { key: "equipe", label: "Équipe", desc: "Compétences, expérience, complémentarité" },
  { key: "potentiel_croissance", label: "Potentiel de croissance", desc: "Scalabilité, marché, ambitions" },
] as const;

type AxeKey = typeof AXES[number]["key"];
type Eval = {
  id?: string; user_id?: string; org_id?: string | null; project_id?: string | null;
  gouvernance: number; finance: number; organisation: number;
  marche: number; equipe: number; potentiel_croissance: number;
  score_global?: number; niveau?: string; notes?: string | null;
  published_to_invest?: boolean;
};

const empty: Eval = { gouvernance: 0, finance: 0, organisation: 0, marche: 0, equipe: 0, potentiel_croissance: 0, notes: "" };

function EvalPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [auto, setAuto] = useState<Record<string, number> | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [current, setCurrent] = useState<Eval>(empty);
  const [history, setHistory] = useState<Eval[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: orgs } = await supabase.from("mp_organizations" as never).select("id").eq("owner_id", u.user.id).limit(1);
    const oid = ((orgs as Array<{id:string}> | null)?.[0]?.id) ?? null;
    setOrgId(oid);
    const { data: projs } = await supabase
      .from("mp_projects" as never)
      .select("id, title")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    const plist = (projs as Array<{ id: string; title: string }> | null) ?? [];
    setProjects(plist);
    const pid = projectId ?? plist[0]?.id ?? null;
    setProjectId(pid);

    const { data } = await supabase.from("mp_evaluations" as never).select("*")
      .eq("user_id", u.user.id).order("created_at", { ascending: false });
    const list = (data as Eval[] | null) ?? [];
    setHistory(list);
    const forProject = pid ? list.find((e) => e.project_id === pid) : list[0];
    if (forProject) setCurrent({ ...forProject });

    if (pid) {
      const { data: sc } = await supabase
        .from("mp_scoring_results" as never)
        .select("*")
        .eq("project_id", pid)
        .maybeSingle();
      const row = sc as Record<string, number> | null;
      if (row) {
        const mapped = {
          gouvernance: Number(row.score_juridique ?? 0),
          finance: Number(row.score_financier ?? 0),
          organisation: Number(row.score_technique ?? 0),
          marche: Number(row.score_marche ?? 0),
          equipe: Number(row.score_equipe ?? 0),
          potentiel_croissance: Number(row.score_impact ?? 0),
        };
        setAuto(mapped);
        if (!forProject) setCurrent((c) => ({ ...c, ...mapped }));
      } else setAuto(null);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [projectId]);

  async function resync() {
    setSyncing(true);
    const { error } = await supabase.rpc("mp_resync_scoring" as never,
      (projectId ? { _project_id: projectId } : {}) as never);
    setSyncing(false);
    if (error) toast.error(error.message);
    else { toast.success("Scoring recalculé et synchronisé"); await load(); }
  }

  function applyAuto() {
    if (!auto) return;
    setCurrent((c) => ({ ...c, ...auto }));
    toast.success("Valeurs calculées appliquées");
  }

  const score = Math.round(AXES.reduce((s, a) => s + (current[a.key] as number), 0) / AXES.length);
  const niveau = score >= 80 ? "Finançable" : score >= 60 ? "Structuré" : score >= 40 ? "En construction" : "Émergent";
  const niveauColor = score >= 80 ? "bg-secondary text-secondary-foreground" : score >= 60 ? "bg-primary text-primary-foreground" : score >= 40 ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground";

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload = {
      user_id: u.user.id, org_id: orgId, project_id: projectId,
      gouvernance: current.gouvernance, finance: current.finance,
      organisation: current.organisation, marche: current.marche,
      equipe: current.equipe, potentiel_croissance: current.potentiel_croissance,
      notes: current.notes ?? null,
    };
    const { error } = await supabase.from("mp_evaluations" as never).insert(payload as never);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success(`Évaluation enregistrée — niveau ${niveau}`); await load(); }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Gauge className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Évaluation & maturité</h1>
          <p className="text-sm text-muted-foreground">6 axes → score → publication automatique vers MiPROJET Invest.</p>
        </div>
      </div>

      {projects.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <div className="min-w-[220px] flex-1">
              <Select value={projectId ?? ""} onValueChange={(v) => setProjectId(v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={resync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Recalculer automatiquement
            </Button>
            {auto && (
              <Button variant="ghost" onClick={applyAuto}>Appliquer les valeurs calculées</Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Score global</CardTitle>
            <Badge className={niveauColor}>{niveau}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-primary">{score}</div>
            <div className="flex-1"><Progress value={score} className="h-3" /></div>
          </div>
          {score >= 80 && (
            <p className="mt-3 flex items-center gap-2 text-sm text-secondary">
              <Rocket className="h-4 w-4" /> Votre organisation est éligible à la publication automatique sur MiPROJET Invest.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {AXES.map((a) => (
          <Card key={a.key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>{a.label}</span>
                <span className="text-lg font-bold text-primary">{current[a.key] as number}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {a.desc}
                {auto ? ` · calculé : ${auto[a.key]}` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <input type="range" min={0} max={100} step={5} value={current[a.key] as number}
                onChange={(e) => setCurrent({ ...current, [a.key as AxeKey]: Number(e.target.value) })}
                className="w-full accent-[oklch(0.58_0.14_50)]" />
              <Progress value={current[a.key] as number} className="mt-2 h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={4} value={current.notes ?? ""} onChange={(e) => setCurrent({ ...current, notes: e.target.value })} placeholder="Contexte, éléments clés, priorités…" />
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" /> Enregistrer l'évaluation</Button>
          </div>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Historique</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {history.slice(0, 10).map((h, i) => (
              <div key={h.id ?? i} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="text-muted-foreground">{h.id ? "Évaluation" : "Brouillon"}</div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{h.niveau}</Badge>
                  <span className="font-bold">{h.score_global}/100</span>
                  {h.published_to_invest && <Badge className="bg-secondary text-secondary-foreground">Publié</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
