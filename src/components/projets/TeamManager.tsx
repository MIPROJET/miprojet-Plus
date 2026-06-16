import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadProjectMedia } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SmartImage } from "@/components/SmartImage";
import { Plus, Trash2, Pencil, Upload, X } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id?: string;
  full_name: string;
  role_title: string;
  expertise: string;
  bio: string;
  photo_url: string;
  contact_email: string;
  contact_phone: string;
  is_external: boolean;
  organization: string;
  sort_order: number;
};

const empty = (): Member => ({
  full_name: "", role_title: "", expertise: "", bio: "",
  photo_url: "", contact_email: "", contact_phone: "",
  is_external: false, organization: "", sort_order: 0,
});

export function TeamManager({ userId, projectId }: { userId: string; projectId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Member | null>(null);

  const q = useQuery({
    queryKey: ["mp_project_team", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_project_team")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const save = useMutation({
    mutationFn: async (m: Member) => {
      const payload: any = { ...m, project_id: projectId, user_id: userId };
      if (m.id) {
        const { error } = await supabase.from("mp_project_team").update(payload).eq("id", m.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("mp_project_team").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Membre enregistré");
      qc.invalidateQueries({ queryKey: ["mp_project_team", projectId] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mp_project_team").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membre supprimé");
      qc.invalidateQueries({ queryKey: ["mp_project_team", projectId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Équipe affichée publiquement sur la vitrine du projet.
        </p>
        <Button type="button" size="sm" onClick={() => setEditing(empty())}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un membre
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(q.data ?? []).map((m) => (
          <div key={m.id} className="flex gap-3 rounded-xl border p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-muted">
              <SmartImage src={m.photo_url} alt={m.full_name} fallbackText={m.full_name} fit="cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{m.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">{m.role_title}</div>
              {m.organization && (
                <div className="text-xs text-primary truncate">{m.organization}</div>
              )}
              <div className="mt-2 flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(m)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => del.mutate(m.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && (
          <div className="col-span-full rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
            Aucun membre. Cliquez « Ajouter un membre ».
          </div>
        )}
      </div>

      {editing && (
        <MemberEditor
          value={editing}
          userId={userId}
          onCancel={() => setEditing(null)}
          onSave={(m) => save.mutate(m)}
          busy={save.isPending}
        />
      )}
    </div>
  );
}

function MemberEditor({
  value, userId, onCancel, onSave, busy,
}: {
  value: Member;
  userId: string;
  onCancel: () => void;
  onSave: (m: Member) => void;
  busy: boolean;
}) {
  const [m, setM] = useState<Member>(value);
  const set = (k: keyof Member, v: any) => setM((p) => ({ ...p, [k]: v }));
  const [uploading, setUploading] = useState(false);

  const onPhoto = async (f: File) => {
    if (!f.type.startsWith("image/")) return toast.error("Image uniquement");
    if (f.size > 5 * 1024 * 1024) return toast.error("Max 5 Mo");
    setUploading(true);
    try {
      const url = await uploadProjectMedia(userId, "team", f);
      set("photo_url", url);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">{m.id ? "Modifier" : "Nouveau membre"}</h4>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-background">
          <SmartImage src={m.photo_url} alt={m.full_name} fallbackText={m.full_name} fit="cover" />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-md border bg-background px-3 py-2 text-xs hover:bg-accent">
          <Upload className="h-3 w-3" />
          {uploading ? "…" : "Photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nom complet *</Label>
          <Input value={m.full_name} onChange={(e) => set("full_name", e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Rôle / Titre</Label>
          <Input value={m.role_title} onChange={(e) => set("role_title", e.target.value)} placeholder="ex: Directeur Général" className="mt-1.5" />
        </div>
        <div>
          <Label>Expertise</Label>
          <Input value={m.expertise} onChange={(e) => set("expertise", e.target.value)} placeholder="ex: Finance, Agronomie" className="mt-1.5" />
        </div>
        <div>
          <Label>Organisation</Label>
          <Input value={m.organization} onChange={(e) => set("organization", e.target.value)} placeholder="ex: AgriCapital" className="mt-1.5" />
        </div>
        <div>
          <Label>Email contact (privé)</Label>
          <Input type="email" value={m.contact_email} onChange={(e) => set("contact_email", e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Téléphone (privé)</Label>
          <Input value={m.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} className="mt-1.5" />
        </div>
      </div>

      <div>
        <Label>Bio courte</Label>
        <Textarea value={m.bio} onChange={(e) => set("bio", e.target.value)} rows={3} className="mt-1.5" placeholder="Parcours, réalisations clés…" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={m.is_external} onCheckedChange={(c) => set("is_external", !!c)} />
          Membre externe / consultant
        </label>
        <div>
          <Label>Ordre d'affichage</Label>
          <Input type="number" min={0} value={m.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} className="mt-1.5" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button type="button" size="sm" disabled={busy || !m.full_name} onClick={() => onSave(m)}>
          {busy ? "…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
