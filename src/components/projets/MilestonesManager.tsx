import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, X, Flag } from "lucide-react";
import { toast } from "sonner";

export const MILESTONE_KINDS = [
  { value: "lancement", label: "Lancement / présentation publique" },
  { value: "bureau", label: "Ouverture de bureau / antenne" },
  { value: "formation", label: "Formation d'une cohorte / équipe" },
  { value: "recrutement", label: "Recrutement / renfort d'équipe" },
  { value: "partenariat", label: "Partenariat signé" },
  { value: "production", label: "Mise en production / capacité" },
  { value: "certification", label: "Certification / agrément" },
  { value: "financement", label: "Financement obtenu" },
  { value: "autre", label: "Autre réalisation" },
] as const;

export type Milestone = {
  id?: string;
  kind: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  participants_count: string | number | null;
  is_public: boolean;
  sort_order: number;
};

const empty = (): Milestone => ({
  kind: "autre",
  title: "",
  description: "",
  event_date: new Date().toISOString().slice(0, 10),
  location: "",
  participants_count: "",
  is_public: true,
  sort_order: 0,
});

export function kindLabel(k: string) {
  return MILESTONE_KINDS.find((x) => x.value === k)?.label ?? "Réalisation";
}

export function MilestonesManager({ userId, projectId }: { userId: string; projectId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Milestone | null>(null);

  const q = useQuery({
    queryKey: ["mp_project_milestones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_project_milestones" as never)
        .select("*")
        .eq("project_id", projectId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Milestone[];
    },
  });

  const save = useMutation({
    mutationFn: async (m: Milestone) => {
      const payload = {
        project_id: projectId,
        user_id: userId,
        kind: m.kind,
        title: m.title,
        description: m.description || null,
        event_date: m.event_date,
        location: m.location || null,
        participants_count:
          m.participants_count === "" || m.participants_count === null
            ? null
            : Number(m.participants_count),
        is_public: m.is_public,
        sort_order: Number(m.sort_order) || 0,
      };
      if (m.id) {
        const { error } = await supabase
          .from("mp_project_milestones" as never)
          .update(payload as never)
          .eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mp_project_milestones" as never)
          .insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Jalon enregistré — score recalculé");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["mp_project_milestones", projectId] });
      qc.invalidateQueries({ queryKey: ["scoring"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mp_project_milestones" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Jalon supprimé");
      qc.invalidateQueries({ queryKey: ["mp_project_milestones", projectId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Jalons & réalisations ({list.length})</span>
        </div>
        {!editing && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(empty())}>
            <Plus className="mr-1.5 h-4 w-4" /> Ajouter un jalon
          </Button>
        )}
      </div>

      {editing && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Type de jalon</Label>
              <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MILESTONE_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={editing.event_date}
                onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Titre *</Label>
            <Input
              className="mt-1.5"
              value={editing.title}
              placeholder="Ex. Inauguration du premier bureau de proximité"
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              className="mt-1.5"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Lieu</Label>
              <Input
                className="mt-1.5"
                value={editing.location}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Participants (nombre)</Label>
              <Input
                type="number"
                min={0}
                className="mt-1.5"
                value={editing.participants_count ?? ""}
                onChange={(e) => setEditing({ ...editing, participants_count: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={editing.is_public}
              onCheckedChange={(v) => setEditing({ ...editing, is_public: !!v })}
            />
            Visible sur la page publique et dans l'écosystème MiPROJET
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
              <X className="mr-1.5 h-4 w-4" /> Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!editing.title.trim() || save.isPending}
              onClick={() => save.mutate(editing)}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {list.length === 0 && !editing ? (
        <div className="rounded-xl border-2 border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Aucun jalon. Ajoutez vos réalisations (ouverture de bureau, formation d'équipe,
          partenariats…) : elles renforcent automatiquement votre score et votre maturité.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((mst) => (
            <div key={mst.id} className="flex items-start gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{kindLabel(mst.kind)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(mst.event_date).toLocaleDateString("fr-FR")}
                  </span>
                  {!mst.is_public && <Badge variant="secondary">Privé</Badge>}
                </div>
                <div className="mt-1 text-sm font-medium">{mst.title}</div>
                {mst.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{mst.description}</p>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  {[mst.location, mst.participants_count ? `${mst.participants_count} participants` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setEditing({
                    ...mst,
                    description: mst.description ?? "",
                    location: mst.location ?? "",
                    participants_count: mst.participants_count ?? "",
                  })
                }
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => mst.id && del.mutate(mst.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
