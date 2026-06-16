import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProjects, fetchProjectRecords } from "@/lib/data";
import { computeScore, niveauColor } from "@/lib/scoring";
import { formatXOF } from "@/lib/financial-types";
import { detectProfile, PROFILE_META, computeMilestones } from "@/lib/project-profile";
import { runAutoDiagnostic, SEVERITY_META, CATEGORY_LABEL } from "@/lib/diagnostic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles, ShoppingBag, ListChecks, Handshake, CheckCircle2,
  Clock, X, Plus, Trophy, Target, LifeBuoy, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/accompagnement")({
  head: () => ({ meta: [{ title: "Accompagnement · MiProjet+" }] }),
  component: AccompagnementPage,
});

const STATUS_META: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  pending: { label: "En attente", cls: "bg-muted text-muted-foreground", icon: Clock },
  reviewing: { label: "En revue", cls: "bg-primary/10 text-primary", icon: Clock },
  accepted: { label: "Acceptée", cls: "bg-success/10 text-success", icon: CheckCircle2 },
  in_progress: { label: "En cours", cls: "bg-primary/10 text-primary", icon: Clock },
  matched: { label: "Match trouvé", cls: "bg-gold/10 text-gold", icon: Handshake },
  introduced: { label: "Introduit", cls: "bg-success/10 text-success", icon: Handshake },
  completed: { label: "Terminée", cls: "bg-success/10 text-success", icon: CheckCircle2 },
  closed: { label: "Clôturée", cls: "bg-muted text-muted-foreground", icon: CheckCircle2 },
  cancelled: { label: "Annulée", cls: "bg-muted text-muted-foreground", icon: X },
  rejected: { label: "Refusée", cls: "bg-destructive/10 text-destructive", icon: X },
};

function AccompagnementPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");

  const projectsQ = useQuery({
    queryKey: ["my-projects", user.id],
    queryFn: () => fetchMyProjects(user.id),
  });
  const projects = projectsQ.data ?? [];
  const selected = projects.find((p) => p.id === selectedId) ?? projects[0];
  const projectId = selected?.id ?? "";

  const recordsQ = useQuery({
    queryKey: ["records", projectId],
    queryFn: () => fetchProjectRecords(projectId),
    enabled: !!projectId,
  });

  const teamQ = useQuery({
    queryKey: ["team", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_project_team").select("id").eq("project_id", projectId);
      if (error) throw error; return data ?? [];
    },
    enabled: !!projectId,
  });

  const recosQ = useQuery({
    queryKey: ["recos", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_recommendations").select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
    enabled: !!projectId,
  });

  const catalogQ = useQuery({
    queryKey: ["service-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_service_catalog").select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error; return data ?? [];
    },
  });

  const requestsQ = useQuery({
    queryKey: ["service-requests", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_user_service_requests")
        .select("*, mp_service_catalog(title, price, currency)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const introsQ = useQuery({
    queryKey: ["introductions", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_introductions").select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error; return data ?? [];
    },
  });

  const score = useMemo(() => {
    if (!selected) return null;
    return computeScore(selected as any, recordsQ.data ?? []);
  }, [selected, recordsQ.data]);

  const profile = useMemo(
    () => (selected ? detectProfile(selected as any) : "micro"),
    [selected],
  );

  const milestones = useMemo(() => {
    if (!selected || !score) return [];
    return computeMilestones(profile, {
      project: selected as any,
      recordsCount: recordsQ.data?.length ?? 0,
      teamCount: teamQ.data?.length ?? 0,
      scoreGlobal: score.score_global,
      introductionsCount: introsQ.data?.length ?? 0,
    });
  }, [profile, selected, score, recordsQ.data, teamQ.data, introsQ.data]);

  const xpTotal = useMemo(() => {
    const def = PROFILE_META[profile].milestones;
    const done = new Set(milestones.filter((m) => m.done).map((m) => m.id));
    return {
      gained: def.filter((m) => done.has(m.id)).reduce((s, m) => s + m.xp, 0),
      total: def.reduce((s, m) => s + m.xp, 0),
    };
  }, [milestones, profile]);

  // ===== Mutations
  const runDiagnostic = useMutation({
    mutationFn: async () => {
      if (!selected || !score) throw new Error("Projet introuvable");
      const recos = runAutoDiagnostic({
        project: selected as any,
        score,
        profile,
        teamCount: teamQ.data?.length ?? 0,
      });
      // Reset les autos existantes "open" puis insère
      await supabase
        .from("mp_recommendations")
        .delete()
        .eq("project_id", projectId)
        .eq("source", "auto")
        .eq("status", "open");
      if (recos.length > 0) {
        const rows = recos.map((r) => ({
          project_id: projectId,
          user_id: user.id,
          source: "auto",
          ...r,
        }));
        const { error } = await supabase.from("mp_recommendations").insert(rows);
        if (error) throw error;
      }
      return recos.length;
    },
    onSuccess: (n) => {
      toast.success(`Diagnostic terminé · ${n} recommandation(s)`);
      qc.invalidateQueries({ queryKey: ["recos", projectId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Échec diagnostic"),
  });

  const toggleReco = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("mp_recommendations")
        .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recos", projectId] }),
  });

  const requestService = useMutation({
    mutationFn: async ({ serviceId, message }: { serviceId: string; message: string }) => {
      const { error } = await supabase.from("mp_user_service_requests").insert({
        user_id: user.id,
        project_id: projectId || null,
        service_id: serviceId,
        message,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée — un conseiller vous contactera.");
      qc.invalidateQueries({ queryKey: ["service-requests", user.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Échec envoi"),
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mp_user_service_requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande annulée");
      qc.invalidateQueries({ queryKey: ["service-requests", user.id] });
    },
  });

  const createIntro = useMutation({
    mutationFn: async (payload: {
      target_type: string; target_name: string; target_sector: string; needs: string; amount_requested: string;
    }) => {
      const { error } = await supabase.from("mp_introductions").insert({
        user_id: user.id,
        project_id: projectId,
        target_type: payload.target_type,
        target_name: payload.target_name || null,
        target_sector: payload.target_sector || null,
        needs: payload.needs,
        amount_requested: payload.amount_requested ? Number(payload.amount_requested) : null,
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande de mise en relation envoyée");
      qc.invalidateQueries({ queryKey: ["introductions", user.id] });
    },
    onError: (e: any) => toast.error(e.message ?? "Échec"),
  });

  // ===== Filtres catalogue
  const [catFilter, setCatFilter] = useState<string>("all");
  const [catSearch, setCatSearch] = useState("");
  const filteredCatalog = (catalogQ.data ?? []).filter((s) =>
    (catFilter === "all" || s.category === catFilter) &&
    (catSearch === "" || s.title.toLowerCase().includes(catSearch.toLowerCase())),
  );
  const categories = Array.from(new Set((catalogQ.data ?? []).map((s) => s.category)));

  if (projectsQ.isLoading) return <div className="p-6">Chargement…</div>;
  if (projects.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
        <Sparkles className="w-12 h-12 mx-auto text-primary" />
        <h1 className="text-2xl font-bold">Accompagnement</h1>
        <p className="text-muted-foreground">
          Créez d'abord un projet pour bénéficier du diagnostic automatique et du catalogue de services.
        </p>
        <Link to="/projets"><Button>Créer un projet</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Accompagnement
          </h1>
          <p className="text-muted-foreground text-sm">
            Diagnostic, recommandations, services et mise en relation pour faire grandir votre projet.
          </p>
        </div>
        <Link to="/support" className="text-sm text-primary hover:underline flex items-center gap-1">
          <LifeBuoy className="w-4 h-4" /> Support technique
        </Link>
      </div>

      {/* Sélecteur projet + profil */}
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-sm">Projet :</Label>
          <Select value={projectId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[280px]"><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {score && (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${niveauColor(score.niveau)}`}>
              Score {score.score_global}/100 · {score.niveau}
            </span>
          )}
        </div>

        {/* Profil + gamification */}
        {selected && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-muted/40 p-4">
              <div className="text-xs uppercase text-muted-foreground">Profil détecté</div>
              <div className="font-bold text-lg mt-1">{PROFILE_META[profile].label}</div>
              <div className="text-xs text-muted-foreground mt-1">{PROFILE_META[profile].description}</div>
              <div className="mt-3 flex flex-wrap gap-1">
                {PROFILE_META[profile].focus.map((f) => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{f}</span>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Progression
                </div>
                <div className="text-sm font-semibold">{xpTotal.gained} / {xpTotal.total} XP</div>
              </div>
              <Progress value={xpTotal.total ? (xpTotal.gained / xpTotal.total) * 100 : 0} className="mt-2" />
              <ul className="mt-3 grid sm:grid-cols-2 gap-1.5">
                {PROFILE_META[profile].milestones.map((m) => {
                  const done = milestones.find((x) => x.id === m.id)?.done;
                  return (
                    <li key={m.id} className="flex items-center gap-2 text-xs">
                      {done ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Target className="w-4 h-4 text-muted-foreground" />}
                      <span className={done ? "text-foreground" : "text-muted-foreground"}>{m.label}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">+{m.xp}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="diagnostic">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="diagnostic"><Sparkles className="w-4 h-4 mr-1.5" />Diagnostic</TabsTrigger>
          <TabsTrigger value="catalog"><ShoppingBag className="w-4 h-4 mr-1.5" />Catalogue</TabsTrigger>
          <TabsTrigger value="tracking"><ListChecks className="w-4 h-4 mr-1.5" />Mes demandes</TabsTrigger>
          <TabsTrigger value="intro"><Handshake className="w-4 h-4 mr-1.5" />Mise en relation</TabsTrigger>
        </TabsList>

        {/* === DIAGNOSTIC === */}
        <TabsContent value="diagnostic" className="space-y-4 mt-4">
          <div className="rounded-2xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Diagnostic automatique</div>
              <div className="text-xs text-muted-foreground">Génère des recommandations basées sur l'état actuel du projet et son score.</div>
            </div>
            <Button onClick={() => runDiagnostic.mutate()} disabled={runDiagnostic.isPending || !projectId}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              {runDiagnostic.isPending ? "Analyse…" : "Lancer le diagnostic"}
            </Button>
          </div>

          {recosQ.data && recosQ.data.length === 0 && (
            <div className="rounded-2xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              Aucune recommandation pour l'instant. Lancez le diagnostic ci-dessus.
            </div>
          )}

          <div className="grid gap-3">
            {(recosQ.data ?? []).map((r) => {
              const sev = SEVERITY_META[r.severity] ?? SEVERITY_META.info;
              return (
                <div key={r.id} className="rounded-2xl border bg-card p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sev.cls}`}>{sev.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                        {r.source === "auto" && <span className="text-[10px] text-muted-foreground">auto</span>}
                      </div>
                      <h3 className={`font-semibold mt-1 ${r.status === "done" ? "line-through text-muted-foreground" : ""}`}>{r.title}</h3>
                      {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                      {r.recommended_action && (
                        <p className="text-xs mt-1.5"><span className="font-semibold">Action : </span>{r.recommended_action}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {r.status !== "done" ? (
                        <Button size="sm" variant="outline" onClick={() => toggleReco.mutate({ id: r.id, status: "done" })}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />Fait
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => toggleReco.mutate({ id: r.id, status: "open" })}>
                          Rouvrir
                        </Button>
                      )}
                      {r.related_service_code && (
                        <Button size="sm" variant="secondary" onClick={() => {
                          const tab = document.querySelector('[value="catalog"]') as HTMLElement;
                          tab?.click();
                          setCatSearch(r.related_service_code ?? "");
                        }}>
                          Voir service <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* === CATALOGUE === */}
        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Rechercher un service…"
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCatalog.map((s) => (
              <ServiceCard
                key={s.id}
                service={s}
                onRequest={(message) => requestService.mutate({ serviceId: s.id, message })}
                disabled={!projectId}
              />
            ))}
            {filteredCatalog.length === 0 && (
              <div className="col-span-full rounded-2xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Aucun service ne correspond.
              </div>
            )}
          </div>
        </TabsContent>

        {/* === SUIVI DEMANDES === */}
        <TabsContent value="tracking" className="space-y-3 mt-4">
          {(requestsQ.data ?? []).length === 0 && (
            <div className="rounded-2xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
              Aucune demande pour l'instant.
            </div>
          )}
          {(requestsQ.data ?? []).map((r: any) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <div key={r.id} className="rounded-2xl border bg-card p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.cls}`}>
                      <Icon className="w-3 h-3" />{meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div className="font-semibold mt-1">{r.mp_service_catalog?.title ?? "Service"}</div>
                  {r.message && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.message}</p>}
                  {r.admin_notes && (
                    <p className="text-xs mt-1.5 p-2 rounded bg-muted/50">
                      <span className="font-semibold">Réponse : </span>{r.admin_notes}
                    </p>
                  )}
                  {r.amount_quoted != null && (
                    <p className="text-xs mt-1 font-semibold text-primary">Devis : {formatXOF(r.amount_quoted)}</p>
                  )}
                </div>
                {r.status === "pending" && (
                  <Button size="sm" variant="ghost" onClick={() => cancelRequest.mutate(r.id)}>
                    Annuler
                  </Button>
                )}
              </div>
            );
          })}
        </TabsContent>

        {/* === MISE EN RELATION === */}
        <TabsContent value="intro" className="space-y-4 mt-4">
          <IntroForm
            disabled={!projectId}
            onSubmit={(payload) => createIntro.mutate(payload)}
            isPending={createIntro.isPending}
          />
          <div className="grid gap-3">
            {(introsQ.data ?? []).length === 0 && (
              <div className="rounded-2xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Aucune demande de mise en relation pour l'instant.
              </div>
            )}
            {(introsQ.data ?? []).map((i) => {
              const meta = STATUS_META[i.status] ?? STATUS_META.pending;
              const Icon = meta.icon;
              return (
                <div key={i.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${meta.cls}`}>
                      <Icon className="w-3 h-3" />{meta.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted">{i.target_type}</span>
                    {i.target_name && <span className="text-sm font-semibold">{i.target_name}</span>}
                    {i.amount_requested != null && (
                      <span className="text-xs text-primary font-semibold ml-auto">{formatXOF(Number(i.amount_requested))}</span>
                    )}
                  </div>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{i.needs}</p>
                  {i.admin_notes && (
                    <p className="text-xs mt-2 p-2 rounded bg-muted/50">
                      <span className="font-semibold">Réponse équipe : </span>{i.admin_notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===== Service Card with request dialog
function ServiceCard({ service, onRequest, disabled }: {
  service: any; onRequest: (message: string) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div className="rounded-2xl border bg-card p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{service.category}</span>
        {service.duration && <span className="text-[10px] text-muted-foreground">{service.duration}</span>}
      </div>
      <h3 className="font-bold">{service.title}</h3>
      {service.short_description && (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-3 flex-1">{service.short_description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-lg font-bold text-primary">
          {service.price > 0 ? `${formatXOF(service.price)}` : "Gratuit"}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={disabled}>Demander</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{service.title}</DialogTitle>
              <DialogDescription>
                {service.description ?? service.short_description}
                {service.price > 0 && (
                  <span className="block mt-2 font-semibold text-primary">Tarif : {formatXOF(service.price)}</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="msg">Précisez votre besoin (optionnel)</Label>
              <Textarea id="msg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={4}
                placeholder="Ex. j'ai besoin d'un BP pour soumettre à une banque d'ici 1 mois…" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={() => { onRequest(msg); setMsg(""); setOpen(false); }}>
                Envoyer la demande
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ===== Introduction request form
function IntroForm({ disabled, onSubmit, isPending }: {
  disabled: boolean;
  onSubmit: (p: { target_type: string; target_name: string; target_sector: string; needs: string; amount_requested: string }) => void;
  isPending: boolean;
}) {
  const [target_type, setT] = useState("investor");
  const [target_name, setN] = useState("");
  const [target_sector, setS] = useState("");
  const [needs, setNd] = useState("");
  const [amount_requested, setA] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!needs.trim()) { toast.error("Décrivez votre besoin"); return; }
        onSubmit({ target_type, target_name, target_sector, needs, amount_requested });
        setN(""); setS(""); setNd(""); setA("");
      }}
      className="rounded-2xl border bg-card p-4 space-y-3"
    >
      <div className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />Nouvelle mise en relation</div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Type de contact</Label>
          <Select value={target_type} onValueChange={setT}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investor">Investisseur</SelectItem>
              <SelectItem value="mentor">Mentor</SelectItem>
              <SelectItem value="partner">Partenaire</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="supplier">Fournisseur</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Montant recherché (XOF, optionnel)</Label>
          <Input type="number" value={amount_requested} onChange={(e) => setA(e.target.value)} />
        </div>
        <div>
          <Label>Nom cible (optionnel)</Label>
          <Input value={target_name} onChange={(e) => setN(e.target.value)} placeholder="Ex. BNI, Orange Ventures…" />
        </div>
        <div>
          <Label>Secteur (optionnel)</Label>
          <Input value={target_sector} onChange={(e) => setS(e.target.value)} placeholder="Agro, Tech…" />
        </div>
      </div>
      <div>
        <Label>Décrivez votre besoin *</Label>
        <Textarea value={needs} onChange={(e) => setNd(e.target.value)} rows={3}
          placeholder="Quel type d'introduction, pour quel objectif, avec quel calendrier ?" />
      </div>
      <Button type="submit" disabled={disabled || isPending}>
        {isPending ? "Envoi…" : "Demander une mise en relation"}
      </Button>
    </form>
  );
}
