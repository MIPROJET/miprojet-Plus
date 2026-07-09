import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/organisation")({
  head: () => ({ meta: [{ title: "Mon organisation · MiProjet+" }] }),
  component: OrganisationPage,
});

type Org = {
  id: string; owner_id: string; name: string; legal_form: string | null;
  sector: string | null; city: string | null; email: string | null; phone: string | null;
  website: string | null; description: string | null; employees_count: number | null;
  founded_year: number | null;
};
type Member = {
  id: string; org_id: string; user_id: string; role: string; status: string;
  invited_email: string | null; created_at: string;
};

function OrganisationPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: orgs } = await supabase
      .from("mp_organizations" as never).select("*")
      .or(`owner_id.eq.${u.user.id}`)
      .limit(1);
    const first = (orgs as Org[] | null)?.[0] ?? null;
    setOrg(first);
    if (first) {
      const { data: mem } = await supabase
        .from("mp_org_members" as never).select("*").eq("org_id", first.id);
      setMembers((mem as Member[] | null) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const form = new FormData(e.target as HTMLFormElement);
    const { error } = await supabase.from("mp_organizations" as never).insert({
      owner_id: u.user.id,
      name: String(form.get("name") || ""),
      legal_form: String(form.get("legal_form") || "") || null,
      sector: String(form.get("sector") || "") || null,
      city: String(form.get("city") || "") || null,
      email: String(form.get("email") || "") || null,
      phone: String(form.get("phone") || "") || null,
      website: String(form.get("website") || "") || null,
      description: String(form.get("description") || "") || null,
      employees_count: Number(form.get("employees_count")) || null,
      founded_year: Number(form.get("founded_year")) || null,
    } as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Organisation créée");
    await load();
  }

  async function saveOrg() {
    if (!org) return;
    setSaving(true);
    const { error } = await supabase.from("mp_organizations" as never)
      .update({
        name: org.name, legal_form: org.legal_form, sector: org.sector,
        city: org.city, email: org.email, phone: org.phone, website: org.website,
        description: org.description, employees_count: org.employees_count,
        founded_year: org.founded_year,
      } as never).eq("id", org.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Enregistré");
  }

  async function invite() {
    if (!org || !inviteEmail) return;
    // Recherche user existant par email dans profiles
    const { data: p } = await supabase.from("profiles").select("id").eq("email", inviteEmail.toLowerCase()).maybeSingle();
    if (!p?.id) { toast.error("Aucun utilisateur avec cet email — invite-le à s'inscrire d'abord."); return; }
    const { error } = await supabase.from("mp_org_members" as never).insert({
      org_id: org.id, user_id: p.id, role: inviteRole, status: "active",
      invited_email: inviteEmail.toLowerCase(),
    } as never);
    if (error) toast.error(error.message);
    else { toast.success("Membre ajouté"); setInviteEmail(""); await load(); }
  }

  async function removeMember(m: Member) {
    if (m.role === "owner") { toast.error("Impossible de retirer le propriétaire"); return; }
    const { error } = await supabase.from("mp_org_members" as never).delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else { toast.success("Membre retiré"); await load(); }
  }

  async function updateRole(m: Member, role: string) {
    const { error } = await supabase.from("mp_org_members" as never).update({ role } as never).eq("id", m.id);
    if (error) toast.error(error.message);
    else await load();
  }

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;

  if (!org) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Building2 className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold sm:text-3xl">Créer mon organisation</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={createOrg} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nom *</Label><Input name="name" required /></div>
              <div><Label>Forme juridique</Label><Input name="legal_form" placeholder="SARL, SA, Coopérative…" /></div>
              <div><Label>Secteur</Label><Input name="sector" placeholder="Agriculture, Tech…" /></div>
              <div><Label>Ville</Label><Input name="city" /></div>
              <div><Label>Année de création</Label><Input name="founded_year" type="number" /></div>
              <div><Label>Employés</Label><Input name="employees_count" type="number" /></div>
              <div><Label>Email</Label><Input name="email" type="email" /></div>
              <div><Label>Téléphone</Label><Input name="phone" /></div>
              <div className="sm:col-span-2"><Label>Site web</Label><Input name="website" placeholder="https://…" /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea name="description" rows={4} /></div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" /> Créer l'organisation
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div className="flex items-center gap-3">
        <Building2 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{org.name}</h1>
          <p className="text-sm text-muted-foreground">Profil de votre organisation</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Profil</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nom</Label><Input value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></div>
          <div><Label>Forme juridique</Label><Input value={org.legal_form ?? ""} onChange={(e) => setOrg({ ...org, legal_form: e.target.value })} /></div>
          <div><Label>Secteur</Label><Input value={org.sector ?? ""} onChange={(e) => setOrg({ ...org, sector: e.target.value })} /></div>
          <div><Label>Ville</Label><Input value={org.city ?? ""} onChange={(e) => setOrg({ ...org, city: e.target.value })} /></div>
          <div><Label>Année</Label><Input type="number" value={org.founded_year ?? ""} onChange={(e) => setOrg({ ...org, founded_year: Number(e.target.value) || null })} /></div>
          <div><Label>Email</Label><Input value={org.email ?? ""} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></div>
          <div><Label>Téléphone</Label><Input value={org.phone ?? ""} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></div>
          <div><Label>Employés</Label><Input type="number" value={org.employees_count ?? ""} onChange={(e) => setOrg({ ...org, employees_count: Number(e.target.value) || null })} /></div>
          <div><Label>Site web</Label><Input value={org.website ?? ""} onChange={(e) => setOrg({ ...org, website: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={4} value={org.description ?? ""} onChange={(e) => setOrg({ ...org, description: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Button onClick={saveOrg} disabled={saving}><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Équipe & rôles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px_auto]">
            <Input placeholder="email@exemple.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Membre</SelectItem>
                <SelectItem value="viewer">Lecteur</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={invite}><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </div>
          <div className="divide-y rounded-lg border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.invited_email ?? m.user_id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">Depuis {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
                <Badge variant="outline">{m.role}</Badge>
                {m.role !== "owner" && (
                  <>
                    <Select value={m.role} onValueChange={(v) => updateRole(m, v)}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Membre</SelectItem>
                        <SelectItem value="viewer">Lecteur</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeMember(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
