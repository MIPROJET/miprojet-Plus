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
  Plus, MapPin, Briefcase, Calendar, ExternalLink, Pencil, Upload,
  X, Eye, Video as VideoIcon, Trash2, Store, Building2, Rocket, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { SmartImage } from "@/components/SmartImage";

type ProfileKind = "micro" | "pme" | "startup";
type Journey = "existing" | "project";

const PROFILE_PRESETS: Record<
  ProfileKind,
  { label: string; description: string; journey: Journey; complexity: "simple" | "intermediate" | "advanced"; icon: typeof Store; examples: string }
> = {
  micro: {
    label: "Micro-activité",
    description: "Vente au marché, vente ambulante, mototaxi, petit commerce, atelier informel…",
    journey: "existing",
    complexity: "simple",
    icon: Store,
    examples: "Formulaire ultra-court · suivi simple recettes/dépenses",
  },
  pme: {
    label: "PME / Commerce / Coopérative",
    description: "PME, commerce structuré, coopérative, association, agriculteur en activité.",
    journey: "existing",
    complexity: "intermediate",
    icon: Building2,
    examples: "Formulaire complet · suivi financier détaillé · score PME",
  },
  startup: {
    label: "Startup / Porteur de projet",
    description: "Idée ou projet en création, entrepreneur en lancement, startup.",
    journey: "project",
    complexity: "intermediate",
    icon: Rocket,
    examples: "Pitch · BMC · équipe · suivi financier obligatoire (prévisionnel + réel)",
  },
};

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
  const [pendingKind, setPendingKind] = useState<ProfileKind | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });

  const startNew = () => {
    setEditing(null);
    setPendingKind(null);
    setWizardOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6 overflow-x-clip p-3 sm:space-y-8 sm:p-6 lg:p-10">
      <div className="flex min-w-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Mes projets</h1>
          <p className="mt-1 text-muted-foreground">
            Chaque activité que vous gérez sur MiProjet+.
          </p>
        </div>
        <Button className="w-full bg-primary hover:bg-primary/90 sm:w-auto" onClick={startNew}>
          <Plus className="w-4 h-4 mr-1.5" /> Nouveau projet
        </Button>

        {/* Étape 0 : choix du type d'activité */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Quel type d'activité enregistrez-vous ?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Choisissez le profil le plus proche. Le formulaire, le tableau de bord
              et le score s'adapteront automatiquement à votre réalité.
            </p>
            <div className="mt-3 grid gap-3">
              {(Object.keys(PROFILE_PRESETS) as ProfileKind[]).map((k) => {
                const p = PROFILE_PRESETS[k];
                const Icon = p.icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setPendingKind(k);
                      setWizardOpen(false);
                      setOpen(true);
                    }}
                    className="group flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-elevated"
                  >
                    <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{p.label}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                      <p className="mt-2 text-xs font-medium text-primary">{p.examples}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        {/* Formulaire (adapté au profil choisi) */}
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setPendingKind(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Modifier le projet" : `Nouveau projet · ${pendingKind ? PROFILE_PRESETS[pendingKind].label : ""}`}
              </DialogTitle>
            </DialogHeader>
            <ProjectForm
              userId={user.id}
              initial={editing}
              kind={editing ? ((editing.profile_kind as ProfileKind) ?? "pme") : (pendingKind ?? "pme")}
              onDone={() => {
                setOpen(false);
                setEditing(null);
                setPendingKind(null);
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
            const isAgri = /agri.?capital/i.test(p.title ?? "");
            const publicSlug = isAgri ? "agricapital" : (p.is_public ? (p.display_id ?? p.id) : null);
            return (
              <div
                key={p.id}
                className="min-w-0 overflow-hidden rounded-2xl bg-card border transition-all hover:shadow-elevated hover:border-primary"
              >
                <div className="h-32 w-full overflow-hidden bg-muted">
                  <SmartImage
                    src={p.cover_url}
                    alt={p.title ?? ""}
                    fallbackText={p.title ?? "Projet"}
                    className="h-full w-full"
                  />
                </div>
                <Link
                  to="/finances"
                  search={{ project: p.id } as any}
                  className="block p-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border bg-card">
                      <SmartImage
                        src={p.logo_url}
                        alt={p.title ?? ""}
                        fallbackText={p.title ?? "P"}
                        rounded="rounded-xl"
                      />
                    </div>

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
                  {publicSlug ? (
                    <button
                      type="button"
                      onClick={() => setPreviewSlug(publicSlug)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/25"
                    >
                      <Eye className="h-3 w-3" /> Page publique
                    </button>
                  ) : (
                    <span className="ml-auto text-xs text-muted-foreground italic">
                      Vitrine privée — activez la visibilité dans « Enrichir » → Visuels
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!previewSlug} onOpenChange={(o) => !o && setPreviewSlug(null)}>
        <DialogContent
          className="!max-w-[100vw] !w-screen !h-[100dvh] !p-0 !rounded-none !border-0 !bg-background sm:!max-w-[96vw] sm:!w-[96vw] sm:!h-[94vh] sm:!rounded-2xl sm:!border flex flex-col gap-0"
        >
          <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b px-4 py-3 pr-12 sm:px-6 sm:pr-14 space-y-0">
            <DialogTitle className="truncate text-base sm:text-lg">
              Aperçu vitrine publique
            </DialogTitle>
          </DialogHeader>
          {previewSlug && (
            <iframe
              src={`/projets/${previewSlug}`}
              className="h-full w-full flex-1 bg-background"
              title="Page publique"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectForm({
  userId,
  initial,
  kind,
  onDone,
}: {
  userId: string;
  initial?: any;
  kind: ProfileKind;
  onDone: () => void;
}) {
  const preset = PROFILE_PRESETS[kind];
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
    profile_kind: (initial?.profile_kind as ProfileKind) ?? kind,
    journey: (initial?.journey as Journey) ?? preset.journey,
    complexity_level: initial?.complexity_level ?? preset.complexity,
    is_public: (initial?.is_public as boolean) ?? false,
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

  // Onglets adaptatifs selon le profil
  const showPitch = kind !== "micro";
  const showProduit = true;
  const showMarche = kind !== "micro";
  const showSuivi = kind === "pme" || kind === "startup";
  const tabs = [
    { value: "identite", label: "Identité" },
    showPitch && { value: "pitch", label: kind === "startup" ? "Pitch ★" : "Pitch" },
    showProduit && { value: "produit", label: "Produit" },
    showMarche && { value: "marche", label: "Marché" },
    showSuivi && { value: "suivi", label: "Suivi" },
    { value: "docs", label: "Visuels" },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); m.mutate(); }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs">
        <preset.icon className="h-4 w-4 text-primary" />
        <span className="font-medium">{preset.label}</span>
        <span className="text-muted-foreground">· {preset.examples}</span>
      </div>
      <Tabs defaultValue="identite" className="w-full">
        <TabsList className="grid w-full h-auto" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
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

        {showPitch && (
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
        )}

        {showProduit && (
          <TabsContent value="produit" className="space-y-4">
            <div>
              <Label>{kind === "micro" ? "Que vendez-vous ?" : "Produit / Service proposé"}</Label>
              <Textarea
                value={form.product_description}
                onChange={(e) => set("product_description", e.target.value)}
                className="mt-1.5"
                rows={kind === "micro" ? 3 : 5}
                placeholder={kind === "micro"
                  ? "ex: Vente de bissap, ngalakh et jus naturels au marché de Treichville."
                  : "Décrivez ce que vous vendez ou produisez : caractéristiques, prix, différenciation…"}
              />
            </div>
          </TabsContent>
        )}

        {showMarche && (
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
        )}

        {showSuivi && (
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
        )}


        <TabsContent value="docs" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Colonne 1 — identité visuelle */}
            <div className="space-y-6">
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
            </div>

            {/* Colonne 2 — médias riches */}
            <div className="space-y-6">
              {initial?.id ? (
                <>
                  <GalleryField userId={userId} projectId={initial.id} />
                  <VideoField userId={userId} projectId={initial.id} />
                </>
              ) : (
                <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 p-6 text-center">
                  <VideoIcon className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Galerie terrain & vidéo</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Enregistrez d'abord le projet pour activer les uploads
                    multiples (jusqu'à 25 photos · 1 vidéo 200 Mo).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Toggle visibilité publique */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox
                checked={form.is_public}
                onCheckedChange={(c) => set("is_public", !!c)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Rendre la page publique accessible</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  La vitrine professionnelle de ce projet sera consultable par tout visiteur
                  (logo, couverture, pitch, galerie, vidéo). Aucune donnée financière,
                  ni offre commerciale n'est exposée — elles restent strictement réservées
                  à vous et à l'équipe MiProjet+.
                </span>
              </span>
            </label>
          </div>
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
            "shrink-0 overflow-hidden rounded-xl border bg-muted/30 " +
            (aspect === "square" ? "h-24 w-24" : "h-24 w-40")
          }
        >
          <SmartImage
            src={value}
            alt={label}
            fallbackText={label}
            fit={aspect === "square" ? "cover" : "cover"}
          />
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

/* ------------------------------------------------------------------ */
/*  Gallery (up to 25 images, 10MB each)                              */
/* ------------------------------------------------------------------ */
function GalleryField({ userId, projectId }: { userId: string; projectId: string }) {
  const qc = useQueryClient();
  const MAX_FILES = 25;
  const MAX_SIZE = 10 * 1024 * 1024;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const q = useQuery({
    queryKey: ["mp_project_media", projectId, "gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_project_media")
        .select("id, storage_path, caption, created_at")
        .eq("project_id", projectId)
        .eq("kind", "gallery")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = q.data ?? [];

  const upload = async (files: FileList) => {
    const remaining = MAX_FILES - items.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} images`);
      return;
    }
    const list = Array.from(files).slice(0, remaining);
    setBusy(true);
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    for (const file of list) {
      try {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} : image uniquement`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name} : max 10 Mo`);
          continue;
        }
        const path = await uploadProjectMediaPath(userId, "gallery", file);
        const { error } = await supabase
          .from("mp_project_media")
          .insert({ user_id: userId, project_id: projectId, kind: "gallery", storage_path: path });
        if (error) throw error;
        ok++;
        setProgress({ done: ok, total: list.length });
      } catch (e: any) {
        toast.error(e.message);
      }
    }
    setBusy(false);
    setProgress(null);
    qc.invalidateQueries({ queryKey: ["mp_project_media", projectId, "gallery"] });
    if (ok > 0) toast.success(`${ok} image${ok > 1 ? "s" : ""} ajoutée${ok > 1 ? "s" : ""}`);
  };

  const remove = async (id: string, path: string) => {
    try {
      await supabase.storage.from("project-media").remove([path]);
      await supabase.from("mp_project_media").delete().eq("id", id);
      qc.invalidateQueries({ queryKey: ["mp_project_media", projectId, "gallery"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Galerie terrain ({items.length}/{MAX_FILES})</Label>
        <span className="text-xs text-muted-foreground">JPG/PNG · 10 Mo max / image</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {items.map((it: any) => (
          <div key={it.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <SmartImage src={publicUrlFor(it.storage_path)} alt="" className="h-full w-full" />
            <button
              type="button"
              onClick={() => remove(it.id, it.storage_path)}
              className="absolute right-1 top-1 rounded-md bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        ))}
        {items.length < MAX_FILES && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50">
            {busy ? (
              <span>{progress ? `${progress.done}/${progress.total}` : "…"}</span>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                <span className="mt-1">Ajouter</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.currentTarget.value = ""; }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Video (1 file, 200 MB)                                            */
/* ------------------------------------------------------------------ */
function VideoField({ userId, projectId }: { userId: string; projectId: string }) {
  const qc = useQueryClient();
  const MAX_SIZE = 200 * 1024 * 1024;
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["mp_project_media", projectId, "video"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_project_media")
        .select("id, storage_path, created_at")
        .eq("project_id", projectId)
        .eq("kind", "video")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const upload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Vidéo uniquement");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Max 200 Mo");
      return;
    }
    setBusy(true);
    try {
      // remove existing
      if (q.data) {
        await supabase.storage.from("project-media").remove([q.data.storage_path]);
        await supabase.from("mp_project_media").delete().eq("id", q.data.id);
      }
      const path = await uploadProjectMediaPath(userId, "videos", file);
      const { error } = await supabase
        .from("mp_project_media")
        .insert({ user_id: userId, project_id: projectId, kind: "video", storage_path: path });
      if (error) throw error;
      toast.success("Vidéo téléversée");
      qc.invalidateQueries({ queryKey: ["mp_project_media", projectId, "video"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!q.data) return;
    try {
      await supabase.storage.from("project-media").remove([q.data.storage_path]);
      await supabase.from("mp_project_media").delete().eq("id", q.data.id);
      qc.invalidateQueries({ queryKey: ["mp_project_media", projectId, "video"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>Vidéo de présentation</Label>
        <span className="text-xs text-muted-foreground">MP4/WEBM/MOV · 200 Mo max</span>
      </div>
      <div className="mt-2 space-y-3">
        {q.data ? (
          <div className="overflow-hidden rounded-xl border bg-muted">
            <video
              src={publicUrlFor(q.data.storage_path)}
              controls
              className="aspect-video w-full bg-black"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 text-muted-foreground">
            <VideoIcon className="h-8 w-8" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" />
            {busy ? "Téléversement…" : q.data ? "Remplacer la vidéo" : "Téléverser une vidéo"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
            />
          </label>
          {q.data && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
