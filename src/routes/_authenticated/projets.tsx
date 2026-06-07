import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects } from "@/lib/data";
import { uploadProjectMedia, uploadProjectMediaPath, publicUrlFor } from "@/lib/upload";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, MapPin, Briefcase, Calendar, ExternalLink, Pencil, Upload, ImageIcon,
  X, Eye, Video as VideoIcon, Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projets")({
  head: () => ({ meta: [{ title: "Mes projets · MiProjet+" }] }),
  component: ProjectsPage,
});

const SECTORS = [
  "Commerce", "Agriculture", "Service", "Production", "Restauration",
  "Artisanat", "Technologie", "Transport", "Éducation", "Santé", "Autre",
];
const LEGAL = [
  "Informel", "Entreprise individuelle", "SARL", "SA",
  "Coopérative", "Association", "Startup", "Autre",
];

function ProjectsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

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
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={() => setEditing(null)}>
              <Plus className="w-4 h-4 mr-1.5" /> Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
            </DialogHeader>
            <ProjectForm
              userId={user.id}
              initial={editing}
              onDone={() => {
                setOpen(false);
                setEditing(null);
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
          {projectsQ.data!.map((p: any) => {
            const publicSlug = /agri.?capital/i.test(p.title ?? "") ? "agricapital" : null;
            return (
              <div
                key={p.id}
                className="min-w-0 overflow-hidden rounded-2xl bg-card border transition-all hover:shadow-elevated hover:border-primary"
              >
                {p.cover_url ? (
                  <div className="h-32 w-full overflow-hidden bg-muted">
                    <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <Link
                  to="/finances"
                  search={{ project: p.id } as any}
                  className="block p-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover border" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                    )}
                    {p.display_id && (
                      <span className="min-w-0 break-words text-right text-xs font-mono text-muted-foreground">
                        {p.display_id}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 break-words text-lg font-semibold">{p.title}</h3>
                  {p.short_pitch || p.description ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {p.short_pitch || p.description}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {p.sector && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />{p.sector}
                      </span>
                    )}
                    {p.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{p.city}
                      </span>
                    )}
                    {p.creation_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{new Date(p.creation_date).getFullYear()}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 border-t px-4 py-2.5 sm:px-5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditing(p); setOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Enrichir
                  </Button>
                  {publicSlug && (
                    <a
                      href={`/projets/${publicSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25"
                    >
                      Page publique <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectForm({
  userId,
  initial,
  onDone,
}: {
  userId: string;
  initial?: any;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    sector: initial?.sector ?? "",
    legal_status: initial?.legal_status ?? "",
    city: initial?.city ?? "",
    country: initial?.country ?? "Côte d'Ivoire",
    creation_date: initial?.creation_date ?? "",
    employees_count: initial?.employees_count ?? 0,
    has_accounting: initial?.has_accounting ?? false,
    has_bank_account: initial?.has_bank_account ?? false,
    has_business_plan: initial?.has_business_plan ?? false,
    logo_url: initial?.logo_url ?? "",
    cover_url: initial?.cover_url ?? "",
    short_pitch: initial?.short_pitch ?? "",
    product_description: initial?.product_description ?? "",
    commercialization: initial?.commercialization ?? "",
    target_customers: initial?.target_customers ?? "",
    monitoring_evaluation: initial?.monitoring_evaluation ?? "",
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const m = useMutation({
    mutationFn: async () => {
      const payload: any = { user_id: userId, ...form };
      if (!payload.creation_date) delete payload.creation_date;
      if (initial?.id) {
        const { error } = await supabase.from("mp_projects").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mp_projects").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(initial ? "Projet mis à jour !" : "Projet créé !");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
      className="space-y-4"
    >
      <Tabs defaultValue="identite" className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto">
          <TabsTrigger value="identite">Identité</TabsTrigger>
          <TabsTrigger value="pitch">Pitch</TabsTrigger>
          <TabsTrigger value="produit">Produit</TabsTrigger>
          <TabsTrigger value="marche">Marché</TabsTrigger>
          <TabsTrigger value="suivi">Suivi</TabsTrigger>
          <TabsTrigger value="docs">Visuels</TabsTrigger>
        </TabsList>

        <TabsContent value="identite" className="space-y-4">
          <div>
            <Label>Nom du projet / activité *</Label>
            <Input required value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Description courte</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1.5" rows={2} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Secteur</Label>
              <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut juridique</Label>
              <Select value={form.legal_status} onValueChange={(v) => set("legal_status", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{LEGAL.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Ville</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1.5" /></div>
            <div><Label>Pays</Label><Input value={form.country} onChange={(e) => set("country", e.target.value)} className="mt-1.5" /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Date de création</Label><Input type="date" value={form.creation_date} onChange={(e) => set("creation_date", e.target.value)} className="mt-1.5" /></div>
            <div><Label>Nombre d'employés</Label><Input type="number" min={0} value={form.employees_count} onChange={(e) => set("employees_count", Number(e.target.value))} className="mt-1.5" /></div>
          </div>
          <div className="space-y-2 pt-2 border-t">
            {[
              ["has_accounting", "Comptabilité tenue"],
              ["has_bank_account", "Compte bancaire actif"],
              ["has_business_plan", "Document de présentation stratégique disponible"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <Checkbox checked={(form as any)[key]} onCheckedChange={(c) => set(key as string, !!c)} />
                {label}
              </label>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pitch" className="space-y-4">
          <div>
            <Label>Pitch (1–2 phrases percutantes) *</Label>
            <Textarea
              value={form.short_pitch}
              onChange={(e) => set("short_pitch", e.target.value)}
              className="mt-1.5"
              rows={4}
              placeholder="ex: AgriCapital reconnecte la finance à la terre — investissement nature à rendement durable."
            />
            <p className="mt-1 text-xs text-muted-foreground">Affiché en première ligne sur votre fiche projet et page publique.</p>
          </div>
        </TabsContent>

        <TabsContent value="produit" className="space-y-4">
          <div>
            <Label>Produit / Service proposé</Label>
            <Textarea
              value={form.product_description}
              onChange={(e) => set("product_description", e.target.value)}
              className="mt-1.5"
              rows={5}
              placeholder="Décrivez ce que vous vendez ou produisez : caractéristiques, prix, différenciation…"
            />
          </div>
        </TabsContent>

        <TabsContent value="marche" className="space-y-4">
          <div>
            <Label>Cible (marché et clients)</Label>
            <Textarea
              value={form.target_customers}
              onChange={(e) => set("target_customers", e.target.value)}
              className="mt-1.5"
              rows={3}
              placeholder="Qui sont vos clients ? Quelle taille de marché ?"
            />
          </div>
          <div>
            <Label>Commercialisation (canaux, distribution)</Label>
            <Textarea
              value={form.commercialization}
              onChange={(e) => set("commercialization", e.target.value)}
              className="mt-1.5"
              rows={3}
              placeholder="Comment atteignez-vous vos clients ? Boutique, en ligne, distributeurs, B2B…"
            />
          </div>
        </TabsContent>

        <TabsContent value="suivi" className="space-y-4">
          <div>
            <Label>Suivi & Évaluation</Label>
            <Textarea
              value={form.monitoring_evaluation}
              onChange={(e) => set("monitoring_evaluation", e.target.value)}
              className="mt-1.5"
              rows={5}
              placeholder="Quels indicateurs suivez-vous ? Quelle fréquence ? Résultats récents…"
            />
          </div>
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <ImageField
            label="Logo du projet"
            value={form.logo_url}
            userId={userId}
            folder="logos"
            onChange={(url) => set("logo_url", url)}
            aspect="square"
          />
          <ImageField
            label="Image de couverture (bannière)"
            value={form.cover_url}
            userId={userId}
            folder="covers"
            onChange={(url) => set("cover_url", url)}
            aspect="wide"
          />
        </TabsContent>
      </Tabs>

      <Button type="submit" disabled={m.isPending} className="w-full bg-primary hover:bg-primary/90">
        {m.isPending ? "…" : initial ? "Mettre à jour" : "Créer le projet"}
      </Button>
    </form>
  );
}

function ImageField({
  label, value, userId, folder, onChange, aspect,
}: {
  label: string;
  value: string;
  userId: string;
  folder: string;
  onChange: (url: string) => void;
  aspect: "square" | "wide";
}) {
  const [busy, setBusy] = useState(false);
  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Image uniquement");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max 5 Mo");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadProjectMedia(userId, folder, file);
      onChange(url);
      toast.success("Image téléversée");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 flex items-start gap-4">
        <div
          className={
            "shrink-0 overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 flex items-center justify-center " +
            (aspect === "square" ? "h-24 w-24" : "h-24 w-40")
          }
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" />
            {busy ? "Téléversement…" : value ? "Remplacer" : "Téléverser"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="block text-xs text-muted-foreground hover:text-destructive"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
