import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, Trash2, Pencil, X, Users } from "lucide-react";
import { toast } from "sonner";
import {
  fetchStakeholders,
  STAKEHOLDER_TYPES,
  stakeholderTypeLabel,
  type Stakeholder,
} from "@/lib/stakeholders";

type Draft = Partial<Stakeholder> & { name: string };

const empty = (): Draft => ({
  name: "",
  stakeholder_type: "associe",
  role: "",
  organization: "",
  email: "",
  phone: "",
  capital_share: null,
  notes: "",
});

export function StakeholdersManager({
  userId,
  projectId,
}: {
  userId: string;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);

  const q = useQuery({
    queryKey: ["mp_stakeholders", projectId],
    queryFn: () => fetchStakeholders(projectId),
  });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const payload: any = {
        project_id: projectId,
        user_id: userId,
        name: d.name.trim(),
        stakeholder_type: d.stakeholder_type ?? "associe",
        role: d.role || null,
        organization: d.organization || null,
        email: d.email || null,
        phone: d.phone || null,
        capital_share:
          d.capital_share === null || d.capital_share === undefined || (d.capital_share as any) === ""
            ? null
            : Number(d.capital_share),
        notes: d.notes || null,
      };
      if (d.id) {
        const { error } = await supabase
          .from("mp_project_stakeholders" as any)
          .update(payload)
          .eq("id", d.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mp_project_stakeholders" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Partie prenante enregistrée");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["mp_stakeholders", projectId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mp_project_stakeholders" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Supprimée");
      qc.invalidateQueries({ queryKey: ["mp_stakeholders", projectId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const list = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4 text-primary" /> Parties prenantes / Acteurs
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(empty())}>
          <Plus className="mr-1 h-4 w-4" /> Ajouter un acteur
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Associés, investisseurs, banques, partenaires ou donateurs. Ils apparaissent
        automatiquement dans le formulaire « Enregistrer une opération » et dans les exports
        financiers par associé.
      </p>

      {editing && (
        <div className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {editing.id ? "Modifier l'acteur" : "Nouvel acteur"}
            </div>
            <Button type="button" size="icon" variant="ghost" onClick={() => setEditing(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Nom *</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="mt-1.5"
                placeholder="ex : Koffi Innocent · BICICI"
              />
            </div>
            <div>
              <Label>Type d'acteur</Label>
              <Select
                value={editing.stakeholder_type ?? "associe"}
                onValueChange={(v) => setEditing({ ...editing, stakeholder_type: v })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut / Fonction</Label>
              <Input
                value={editing.role ?? ""}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                className="mt-1.5"
                placeholder="ex : Gérant, Associé majoritaire"
              />
            </div>
            <div>
              <Label>Structure</Label>
              <Input
                value={editing.organization ?? ""}
                onChange={(e) => setEditing({ ...editing, organization: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={editing.email ?? ""}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={editing.phone ?? ""}
                onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Part de capital estimée (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="any"
                value={editing.capital_share ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, capital_share: e.target.value as any })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              rows={2}
              value={editing.notes ?? ""}
              onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              className="mt-1.5"
            />
          </div>
          <Button
            type="button"
            disabled={!editing.name.trim() || save.isPending}
            onClick={() => save.mutate(editing)}
          >
            {save.isPending ? "Enregistrement…" : "Enregistrer l'acteur"}
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune partie prenante enregistrée.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2 text-right">Part %</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {stakeholderTypeLabel(s.stakeholder_type)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.role || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {s.capital_share != null ? `${Number(s.capital_share)} %` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditing(s as any)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => del.mutate(s.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
