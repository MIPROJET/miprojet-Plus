import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type Organe = { name: string; role: string; legal_status: string };
export type Governance = {
  decision_mode: string;
  organes: Organe[];
  juridique_organes: string;
};

export function emptyGovernance(g?: any): Governance {
  return {
    decision_mode: g?.decision_mode ?? "",
    organes: Array.isArray(g?.organes) ? g.organes : [],
    juridique_organes: g?.juridique_organes ?? "",
  };
}

export function GovernanceEditor({
  value, onChange,
}: { value: Governance; onChange: (g: Governance) => void }) {
  const [g, setG] = useState<Governance>(value);
  const update = (next: Governance) => { setG(next); onChange(next); };

  const addOrgane = () =>
    update({ ...g, organes: [...g.organes, { name: "", role: "", legal_status: "" }] });
  const updOrgane = (i: number, k: keyof Organe, v: string) => {
    const arr = g.organes.slice();
    arr[i] = { ...arr[i], [k]: v };
    update({ ...g, organes: arr });
  };
  const delOrgane = (i: number) =>
    update({ ...g, organes: g.organes.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div>
        <Label>Mode de prise de décision</Label>
        <Textarea
          value={g.decision_mode}
          onChange={(e) => update({ ...g, decision_mode: e.target.value })}
          rows={2}
          className="mt-1.5"
          placeholder="ex: Conseil d'administration mensuel, AG annuelle, vote majoritaire…"
        />
      </div>

      <div>
        <Label>Statut juridique des organes</Label>
        <Textarea
          value={g.juridique_organes}
          onChange={(e) => update({ ...g, juridique_organes: e.target.value })}
          rows={2}
          className="mt-1.5"
          placeholder="ex: SARL avec gérant unique, conseil consultatif non statutaire…"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Organes / Comités</Label>
          <Button type="button" size="sm" variant="outline" onClick={addOrgane}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter
          </Button>
        </div>
        {g.organes.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucun organe. Ajoutez un Conseil d'administration, comité stratégique, etc.
          </p>
        )}
        {g.organes.map((o, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr,1fr,1fr,auto]">
            <Input placeholder="Nom (ex: CA)" value={o.name} onChange={(e) => updOrgane(i, "name", e.target.value)} />
            <Input placeholder="Rôle / mission" value={o.role} onChange={(e) => updOrgane(i, "role", e.target.value)} />
            <Input placeholder="Statut (statutaire, consultatif…)" value={o.legal_status} onChange={(e) => updOrgane(i, "legal_status", e.target.value)} />
            <Button type="button" variant="ghost" size="sm" onClick={() => delOrgane(i)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
