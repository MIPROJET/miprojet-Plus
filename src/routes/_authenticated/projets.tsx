import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, MapPin, Briefcase, Calendar, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projets")({
  head: () => ({ meta: [{ title: "Mes projets · MiProjet+" }] }),
  component: ProjectsPage,
});

const SECTORS = [
  "Commerce",
  "Agriculture",
  "Service",
  "Production",
  "Restauration",
  "Artisanat",
  "Technologie",
  "Transport",
  "Éducation",
  "Santé",
  "Autre",
];
const LEGAL = [
  "Informel",
  "Entreprise individuelle",
  "SARL",
  "SA",
  "Coopérative",
  "Association",
  "Startup",
  "Autre",
];

function ProjectsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-clip p-3 sm:space-y-8 sm:p-6 lg:p-10">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Mes projets</h1>
          <p className="mt-1 text-muted-foreground">
            Chaque activité que vous gérez sur MiProjet+.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto">
              <Plus className="w-4 h-4 mr-1.5" /> Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouveau projet</DialogTitle>
            </DialogHeader>
            <ProjectForm
              userId={user.id}
              onDone={() => {
                setOpen(false);
                qc.invalidateQueries({ queryKey: ["my-projects"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {projectsQ.isLoading ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : (projectsQ.data?.length ?? 0) === 0 ? (
        <div className="rounded-2xl border-2 border-dashed bg-card p-6 text-center sm:rounded-3xl sm:p-12">
          <p className="text-muted-foreground">Aucun projet pour l'instant.</p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {projectsQ.data!.map((p) => {
            const publicSlug = /agri.?capital/i.test(p.title ?? "") ? "agricapital" : null;
            return (
            <Link
              key={p.id}
              to="/finances"
              search={{ project: p.id } as any}
              className="min-w-0 rounded-2xl bg-card border p-4 transition-all hover:shadow-elevated hover:border-primary sm:p-6"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                {p.display_id && (
                  <span className="min-w-0 break-words text-right text-xs font-mono text-muted-foreground">
                    {p.display_id}
                  </span>
                )}
              </div>
              <h3 className="mt-4 break-words text-lg font-semibold sm:truncate">{p.title}</h3>
              {p.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {p.sector && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {p.sector}
                  </span>
                )}
                {p.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {p.city}
                  </span>
                )}
                {p.creation_date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.creation_date).getFullYear()}
                  </span>
                )}
              </div>
              {publicSlug && (
                <a
                  href={`/projets/${publicSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25"
                >
                  Page publique <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    sector: "",
    legal_status: "",
    city: "",
    country: "Côte d'Ivoire",
    creation_date: "",
    employees_count: 0,
    has_accounting: false,
    has_bank_account: false,
    has_business_plan: false,
  });

  const m = useMutation({
    mutationFn: async () => {
      const payload: any = { user_id: userId, ...form };
      if (!payload.creation_date) delete payload.creation_date;
      const { error } = await supabase.from("mp_projects").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Projet créé !");
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
        <Label>Nom du projet / activité *</Label>
        <Input
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="mt-1.5"
          rows={2}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Secteur</Label>
          <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut juridique</Label>
          <Select
            value={form.legal_status}
            onValueChange={(v) => setForm({ ...form, legal_status: v })}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent>
              {LEGAL.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Ville</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Pays</Label>
          <Input
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Date de création</Label>
          <Input
            type="date"
            value={form.creation_date}
            onChange={(e) => setForm({ ...form, creation_date: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Nombre d'employés</Label>
          <Input
            type="number"
            min={0}
            value={form.employees_count}
            onChange={(e) => setForm({ ...form, employees_count: Number(e.target.value) })}
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="space-y-2 pt-2 border-t">
        {[
          ["has_accounting", "Comptabilité tenue"],
          ["has_bank_account", "Compte bancaire actif"],
          ["has_business_plan", "Document de présentation stratégique disponible"],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={(form as any)[key]}
              onCheckedChange={(c) => setForm({ ...form, [key]: !!c } as any)}
            />
            {label}
          </label>
        ))}
      </div>
      <Button
        type="submit"
        disabled={m.isPending}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {m.isPending ? "…" : "Créer le projet"}
      </Button>
    </form>
  );
}
