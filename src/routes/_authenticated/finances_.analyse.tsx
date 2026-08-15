import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  fetchMyProjects,
  fetchProjectRecords,
  fetchAllUserRecords,
} from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import {
  byCategory,
  byParty,
  bySource,
  byPeriod,
  overallTotals,
  DISCLAIMER,
  type Period,
} from "@/lib/financial-analytics";
import { formatXOF } from "@/lib/financial-types";
import { exportExcel, exportPDF, exportPNG } from "@/lib/financial-export";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Users,
  Tags,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/finances_/analyse")({
  head: () => ({ meta: [{ title: "Analyse financière · MiProjet+" }] }),
  component: AnalysePage,
});

const COLORS = ["#F39424", "#4CAF50", "#2196F3", "#9C27B0", "#FF5722", "#607D8B", "#795548", "#009688"];

function AnalysePage() {
  const { user } = Route.useRouteContext();
  const [projectId, setProjectId] = useState<string>("all");
  const [period, setPeriod] = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const reportRef = useRef<HTMLDivElement>(null);

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });
  const projects = projectsQ.data ?? [];

  const recordsQ = useQuery({
    queryKey: ["fin-analyse", user.id, projectId],
    queryFn: () =>
      projectId === "all" ? fetchAllUserRecords(user.id) : fetchProjectRecords(projectId),
    enabled: projects.length > 0,
  });

  const orgQ = useQuery({
    queryKey: ["primary-org", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mp_organizations")
        .select("id,name,logo_url")
        .eq("owner_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const filtered = useMemo(() => {
    let list = (recordsQ.data ?? []).map((r) => ({
      id: r.id,
      project_id: r.project_id,
      record_type: r.record_type,
      amount: Number(r.amount),
      record_date: r.record_date,
      description: r.description,
      category: r.category,
      party_name: (r as any).party_name ?? null,
      stakeholder_id: (r as any).stakeholder_id ?? null,
    }));
    if (period === "custom" && customFrom) list = list.filter((r) => r.record_date >= customFrom);
    if (period === "custom" && customTo) list = list.filter((r) => r.record_date <= customTo);
    return list;
  }, [recordsQ.data, period, customFrom, customTo]);

  const totals = overallTotals(filtered);
  const parties = byParty(filtered);
  const cats = byCategory(filtered);
  const srcs = bySource(filtered);
  const per = byPeriod(filtered, period === "custom" ? "day" : period);

  const projectTitle =
    projectId === "all"
      ? "Tous les projets"
      : (projects.find((p) => p.id === projectId)?.title ?? "Projet");

  const ctx = {
    projectTitle,
    organizationName: orgQ.data?.name,
    period,
    records: filtered,
  };

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center sm:p-10">
        <h1 className="text-2xl font-bold">Créez d'abord un projet</h1>
        <Link to="/projets" className="inline-block mt-6">
          <Button>Aller aux projets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-3 sm:p-6 lg:p-10">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            to="/finances"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux finances
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <BarChart3 className="h-7 w-7 text-primary" /> Analyse financière
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Répartition automatique par associé, catégorie, source et période.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:items-center">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les projets</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Par jour</SelectItem>
              <SelectItem value="week">Par semaine</SelectItem>
              <SelectItem value="month">Par mois</SelectItem>
              <SelectItem value="quarter">Par trimestre</SelectItem>
              <SelectItem value="year">Par année</SelectItem>
              <SelectItem value="custom">Personnalisée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row">
          <div className="flex-1">
            <Label>Du</Label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label>Au</Label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Exports */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => exportPDF(ctx)} variant="outline">
          <FileText className="mr-2 h-4 w-4" /> Exporter PDF
        </Button>
        <Button onClick={() => exportExcel(ctx)} variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Exporter Excel
        </Button>
        <Button
          onClick={() => reportRef.current && exportPNG(reportRef.current, projectTitle)}
          variant="outline"
        >
          <ImageIcon className="mr-2 h-4 w-4" /> Exporter Image PNG
        </Button>
      </div>

      {/* Zone exportable */}
      <div ref={reportRef} className="space-y-6 rounded-2xl bg-background p-4">
        {/* En-tête rapport */}
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-auto" />
            <div>
              <div className="text-lg font-bold">{projectTitle}</div>
              <div className="text-xs text-muted-foreground">
                {orgQ.data?.name ?? "Organisation à renseigner"} · Généré le{" "}
                {new Date().toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>MiProjet+ Rapport financier</div>
            <div>Réf. MP-{Date.now().toString().slice(-8)}</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPI label="Entrées" value={formatXOF(totals.entrees)} color="text-success" />
          <KPI label="Sorties" value={formatXOF(totals.sorties)} color="text-destructive" />
          <KPI
            label="Solde"
            value={formatXOF(totals.solde)}
            color={totals.solde >= 0 ? "text-primary" : "text-destructive"}
          />
          <KPI label="Opérations" value={String(totals.operations)} color="text-foreground" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Répartition par contributeur" icon={Users}>
            {parties.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={parties}
                    dataKey="total"
                    nameKey="name"
                    outerRadius={90}
                    label={(e) => `${e.name} (${e.percent.toFixed(0)}%)`}
                  >
                    {parties.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatXOF(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Sources de financement" icon={Wallet}>
            {srcs.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={srcs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatXOF(Number(v))} />
                  <Bar dataKey="total" fill="#F39424" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Dépenses par catégorie" icon={Tags}>
            {cats.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v: any) => formatXOF(Number(v))} />
                  <Bar dataKey="total" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title={`Évolution (${period})`} icon={BarChart3}>
            {per.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={per}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatXOF(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="in" name="Entrées" stroke="#4CAF50" strokeWidth={2} />
                  <Line type="monotone" dataKey="out" name="Sorties" stroke="#E53935" strokeWidth={2} />
                  <Line type="monotone" dataKey="balance" name="Solde" stroke="#F39424" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        {/* Table associés */}
        <Card title="Détail par contributeur (associés, banques, partenaires)" icon={Users}>
          {parties.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Contributeur</th>
                    <th className="px-3 py-2">Types</th>
                    <th className="px-3 py-2 text-right">Nb</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">% estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {parties.map((p) => (
                    <tr key={p.name} className="border-t">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {p.kinds.join(", ")}
                      </td>
                      <td className="px-3 py-2 text-right">{p.count}</td>
                      <td className="px-3 py-2 text-right font-semibold text-success">
                        {formatXOF(p.total)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {p.percent.toFixed(1)} %
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Disclaimer */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
          <strong>Avertissement :</strong> {DISCLAIMER}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 break-words text-lg font-bold sm:text-xl ${color}`}>{value}</div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Pas encore de données.
    </div>
  );
}
