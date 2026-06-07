import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, fetchAllUserRecords } from "@/lib/data";
import { RECORD_TYPES, formatXOF, recordFlow, recordLabel } from "@/lib/financial-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { useRef } from "react";

export const Route = createFileRoute("/_authenticated/finances")({
  head: () => ({ meta: [{ title: "Finances · MiProjet+" }] }),
  component: FinancesPage,
});

function FinancesPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });
  const recordsQ = useQuery({
    queryKey: ["all-records", user.id],
    queryFn: () => fetchAllUserRecords(user.id),
  });

  const projects = projectsQ.data ?? [];
  const records = (recordsQ.data ?? [])
    .filter((r) => filterProject === "all" || r.project_id === filterProject)
    .filter((r) => filterType === "all" || r.record_type === filterType)
    .sort((a, b) => (a.record_date < b.record_date ? -1 : 1)); // chronologique

  const entrees = records
    .filter((r) => recordFlow(r.record_type) === "in")
    .reduce((s, r) => s + Number(r.amount), 0);
  const sorties = records
    .filter((r) => recordFlow(r.record_type) === "out")
    .reduce((s, r) => s + Number(r.amount), 0);

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mp_financial_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-records"] });
      toast.success("Opération supprimée");
    },
  });

  if (projects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-4 text-center sm:p-10">
        <h1 className="text-2xl font-bold">Créez d'abord un projet</h1>
        <p className="mt-2 text-muted-foreground">
          Vous devez créer une activité avant d'enregistrer des opérations.
        </p>
        <Link to="/projets" className="inline-block mt-6">
          <Button>Aller aux projets</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-clip p-3 sm:p-6 lg:p-10">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Finances</h1>
          <p className="mt-1 text-muted-foreground">
            Vos recettes, dépenses et apports. Chaque saisie alimente votre score.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:flex sm:items-center">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-full sm:w-56">
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
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              <SelectItem value="apport_associe">Apports</SelectItem>
              <SelectItem value="don">Dons</SelectItem>
              <SelectItem value="achat">Achats</SelectItem>
              <SelectItem value="depense">Dépenses</SelectItem>
              <SelectItem value="vente">Ventes</SelectItem>
              <SelectItem value="pret">Prêts</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-1.5" /> Importer XLSX
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Importer un journal des opérations (XLSX)</DialogTitle>
              </DialogHeader>
              <XlsxImporter
                userId={user.id}
                projects={projects}
                defaultProject={filterProject !== "all" ? filterProject : projects[0]?.id}
                onDone={() => {
                  setImportOpen(false);
                  qc.invalidateQueries({ queryKey: ["all-records"] });
                }}
              />
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
                <Plus className="w-4 h-4 mr-1.5" /> Nouvelle opération
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enregistrer une opération</DialogTitle>
              </DialogHeader>
              <RecordForm
                userId={user.id}
                projects={projects}
                defaultProject={filterProject !== "all" ? filterProject : projects[0]?.id}
                onDone={() => {
                  setOpen(false);
                  qc.invalidateQueries({ queryKey: ["all-records"] });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <KPI label="Entrées" value={formatXOF(entrees)} color="text-success" icon={ArrowUpRight} />
        <KPI
          label="Sorties"
          value={formatXOF(sorties)}
          color="text-destructive"
          icon={ArrowDownRight}
        />
        <KPI
          label="Solde"
          value={formatXOF(entrees - sorties)}
          color={entrees - sorties >= 0 ? "text-primary" : "text-destructive"}
        />
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl bg-card border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="w-24 px-3 py-3 font-semibold sm:px-4">Date</th>
              <th className="hidden px-3 py-3 font-semibold sm:table-cell sm:px-4">Type</th>
              <th className="px-3 py-3 font-semibold sm:px-4">Description</th>
              <th className="hidden px-3 py-3 font-semibold lg:table-cell sm:px-4">Catégorie</th>
              <th className="w-28 px-3 py-3 text-right font-semibold sm:w-36 sm:px-4">Montant</th>
              <th className="w-9 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Aucune opération.
                </td>
              </tr>
            ) : (
              records.map((r) => {
                const isIn = recordFlow(r.record_type) === "in";
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-3 text-xs text-muted-foreground sm:px-4 sm:text-sm">
                      {new Date(r.record_date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell sm:px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${isIn ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                      >
                        {recordLabel(r.record_type)}
                      </span>
                    </td>
                    <td className="min-w-0 break-words px-3 py-3 text-xs sm:px-4 sm:text-sm">
                      {r.description || "—"}
                    </td>
                    <td className="hidden px-3 py-3 text-muted-foreground lg:table-cell sm:px-4">
                      {r.category || "—"}
                    </td>
                    <td
                      className={`break-words px-3 py-3 text-right text-xs font-semibold sm:px-4 sm:text-sm ${isIn ? "text-success" : "text-destructive"}`}
                    >
                      {isIn ? "+" : "−"} {formatXOF(Number(r.amount))}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={() => {
                          if (confirm("Supprimer ?")) deleteM.mutate(r.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  icon?: any;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-card border p-4 sm:p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${color}`} />}
      </div>
      <div className={`mt-2 break-words text-xl font-bold leading-tight sm:text-2xl ${color}`}>
        {value}
      </div>
    </div>
  );
}

function RecordForm({
  userId,
  projects,
  defaultProject,
  onDone,
}: {
  userId: string;
  projects: any[];
  defaultProject?: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    project_id: defaultProject ?? "",
    record_type: "vente",
    category: "",
    description: "",
    amount: "",
    record_date: new Date().toISOString().slice(0, 10),
    party_name: "",
  });
  const needsParty = ["apport_associe", "pret", "don", "investissement"].includes(form.record_type);

  const m = useMutation({
    mutationFn: async () => {
      const desc =
        needsParty && form.party_name
          ? `${form.description ? form.description + " — " : ""}Source : ${form.party_name}`
          : form.description;
      const { error } = await supabase.from("mp_financial_records").insert({
        user_id: userId,
        project_id: form.project_id,
        record_type: form.record_type,
        category: form.category || null,
        description: desc || null,
        amount: Number(form.amount),
        record_date: form.record_date,
        currency: "XOF",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Opération enregistrée");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
      className="space-y-4"
    >
      <div>
        <Label>Projet *</Label>
        <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Choisir un projet…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Type d'opération *</Label>
        <Select
          value={form.record_type}
          onValueChange={(v) => setForm({ ...form, record_type: v })}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECORD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className={t.flow === "in" ? "text-success" : "text-destructive"}>
                  {t.flow === "in" ? "↑" : "↓"}
                </span>{" "}
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {needsParty && (
        <div>
          <Label>Nom de la source (personne ou structure) *</Label>
          <Input
            required
            value={form.party_name}
            onChange={(e) => setForm({ ...form, party_name: e.target.value })}
            className="mt-1.5"
            placeholder="ex: Konan Marcel · ou BICICI"
          />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Montant (FCFA) *</Label>
          <Input
            required
            type="number"
            min={0}
            step="any"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Date *</Label>
          <Input
            required
            type="date"
            value={form.record_date}
            onChange={(e) => setForm({ ...form, record_date: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label>Catégorie (optionnel)</Label>
        <Input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="mt-1.5"
          placeholder="ex: Matières premières, Loyer, Salaire…"
        />
      </div>
      <div>
        <Label>Description (optionnel)</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1.5"
          rows={2}
        />
      </div>
      <Button
        type="submit"
        disabled={m.isPending || !form.project_id}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {m.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

// ----- XLSX Importer (journal des opérations) -----
const TYPE_MAP_FR: Record<string, string> = {
  "apport gérant": "apport_associe",
  "apport gerant": "apport_associe",
  "apport d'associé": "apport_associe",
  "apport d'associe": "apport_associe",
  "apport associé": "apport_associe",
  "apport": "apport_associe",
  "don": "don",
  "don / subvention": "don",
  "subvention": "don",
  "achat / approv.": "achat",
  "achat": "achat",
  "approvisionnement": "achat",
  "dépense opérationnelle": "depense",
  "depense operationnelle": "depense",
  "dépense": "depense",
  "depense": "depense",
  "vente": "vente",
  "encaissement": "encaissement",
  "prêt": "pret",
  "pret": "pret",
};

function stripCodes(s: string): string {
  return (s || "").replace(/\s*\[[A-Z]{1,3}\d{1,3}\]\s*/g, " ").replace(/\s+/g, " ").trim();
}

function parseSheet(buf: ArrayBuffer): Array<{
  date: string; type: string; category: string | null; description: string | null; amount: number;
}> {
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<any>(ws, { defval: null, header: 1 });
  // detect header row
  let headerIdx = raw.findIndex((row: any[]) =>
    row?.some?.((c) => typeof c === "string" && /Date/i.test(c)) &&
    row?.some?.((c) => typeof c === "string" && /Type/i.test(c)),
  );
  if (headerIdx < 0) headerIdx = 0;
  const headers = (raw[headerIdx] as any[]).map((h) => (h ?? "").toString().toLowerCase());
  const idx = {
    date: headers.findIndex((h) => /date/.test(h)),
    type: headers.findIndex((h) => /type/.test(h)),
    desc: headers.findIndex((h) => /description|libell/.test(h)),
    cat: headers.findIndex((h) => /source|cat/.test(h)),
    debit: headers.findIndex((h) => /d[ée]bit/.test(h)),
    credit: headers.findIndex((h) => /cr[ée]dit/.test(h)),
    amount: headers.findIndex((h) => /montant|amount/.test(h)),
  };
  const rows: any[] = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i] as any[];
    if (!r) continue;
    const d = r[idx.date];
    if (!d) continue;
    let dateStr: string;
    if (d instanceof Date) dateStr = d.toISOString().slice(0, 10);
    else dateStr = new Date(d).toISOString().slice(0, 10);
    if (Number.isNaN(new Date(dateStr).getTime())) continue;
    const typRaw = (r[idx.type] ?? "").toString().trim().toLowerCase();
    const type = TYPE_MAP_FR[typRaw] ?? "depense";
    const debit = idx.debit >= 0 ? Number(r[idx.debit]) || 0 : 0;
    const credit = idx.credit >= 0 ? Number(r[idx.credit]) || 0 : 0;
    const amount = idx.amount >= 0 ? Number(r[idx.amount]) || 0 : credit || debit;
    if (!amount) continue;
    rows.push({
      date: dateStr,
      type,
      category: stripCodes(r[idx.cat] ?? "") || null,
      description: stripCodes(r[idx.desc] ?? "") || null,
      amount,
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows;
}

function XlsxImporter({
  userId,
  projects,
  defaultProject,
  onDone,
}: {
  userId: string;
  projects: any[];
  defaultProject?: string;
  onDone: () => void;
}) {
  const [projectId, setProjectId] = useState(defaultProject ?? "");
  const [replaceMode, setReplaceMode] = useState(true);
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [filename, setFilename] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const totals = parsed
    ? parsed.reduce(
        (acc, r) => {
          const inFlow = ["apport_associe", "don", "vente", "encaissement", "pret", "investissement"].includes(r.type);
          if (inFlow) acc.entrees += r.amount;
          else acc.sorties += r.amount;
          return acc;
        },
        { entrees: 0, sorties: 0 },
      )
    : { entrees: 0, sorties: 0 };
  const solde = totals.entrees - totals.sorties;

  const importM = useMutation({
    mutationFn: async () => {
      if (!parsed || !projectId) throw new Error("Fichier ou projet manquant");
      if (replaceMode) {
        const { error: delErr } = await supabase
          .from("mp_financial_records")
          .delete()
          .eq("project_id", projectId);
        if (delErr) throw delErr;
      }
      // chunked insert
      const chunkSize = 50;
      for (let i = 0; i < parsed.length; i += chunkSize) {
        const slice = parsed.slice(i, i + chunkSize).map((r) => ({
          user_id: userId,
          project_id: projectId,
          record_type: r.type,
          category: r.category,
          description: r.description,
          amount: r.amount,
          currency: "XOF",
          record_date: r.date,
        }));
        const { error } = await supabase.from("mp_financial_records").insert(slice);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`${parsed?.length ?? 0} opérations importées · Solde ${formatXOF(solde)}`);
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Projet cible *</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Choisir un projet…" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Fichier XLSX</Label>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="mt-1.5 block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFilename(f.name);
            try {
              const buf = await f.arrayBuffer();
              const rows = parseSheet(buf);
              setParsed(rows);
              if (!rows.length) toast.error("Aucune opération détectée dans le fichier");
            } catch (err: any) {
              toast.error("Erreur de lecture : " + err.message);
            }
          }}
        />
        {filename && <p className="mt-1 text-xs text-muted-foreground">📄 {filename}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={replaceMode}
          onChange={(e) => setReplaceMode(e.target.checked)}
        />
        Remplacer toutes les opérations existantes du projet (sinon ajouter)
      </label>
      {parsed && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
          <div className="flex justify-between"><span>Opérations détectées</span><strong>{parsed.length}</strong></div>
          <div className="flex justify-between text-success"><span>Entrées</span><strong>{formatXOF(totals.entrees)}</strong></div>
          <div className="flex justify-between text-destructive"><span>Sorties</span><strong>{formatXOF(totals.sorties)}</strong></div>
          <div className={`flex justify-between border-t pt-2 ${solde === 0 ? "text-success" : "text-warning"}`}>
            <span className="flex items-center gap-1">
              {solde === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              Solde de contrôle
            </span>
            <strong>{formatXOF(solde)}</strong>
          </div>
          {solde !== 0 && (
            <p className="text-xs text-warning">⚠ Entrées ≠ Sorties — vérifiez votre journal avant d'importer.</p>
          )}
        </div>
      )}
      <Button
        type="button"
        disabled={!parsed || !projectId || importM.isPending}
        onClick={() => importM.mutate()}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {importM.isPending ? "Import en cours…" : `Importer ${parsed?.length ?? 0} opérations`}
      </Button>
    </div>
  );
}
