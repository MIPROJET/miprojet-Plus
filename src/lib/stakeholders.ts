import { supabase } from "@/integrations/supabase/client";

export type Stakeholder = {
  id: string;
  project_id: string;
  name: string;
  stakeholder_type: string;
  role: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  capital_share: number | null;
  notes: string | null;
};

export const STAKEHOLDER_TYPES = [
  { value: "associe", label: "Associé / Fondateur" },
  { value: "investisseur", label: "Investisseur" },
  { value: "banque", label: "Banque / Institution financière" },
  { value: "partenaire", label: "Partenaire" },
  { value: "donateur", label: "Donateur / Bailleur" },
  { value: "client", label: "Client majeur" },
  { value: "autre", label: "Autre acteur" },
] as const;

export function stakeholderTypeLabel(v: string) {
  return STAKEHOLDER_TYPES.find((t) => t.value === v)?.label ?? v;
}

/** Types d'opérations qui impliquent obligatoirement une partie prenante. */
export const PARTY_RECORD_TYPES = [
  "apport_associe",
  "pret",
  "don",
  "investissement",
  "remboursement",
];

export async function fetchStakeholders(projectId: string): Promise<Stakeholder[]> {
  if (!projectId) return [];
  const { data, error } = await supabase
    .from("mp_project_stakeholders" as any)
    .select("*")
    .eq("project_id", projectId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Stakeholder[];
}

/** Retourne l'acteur correspondant au nom, en le créant si nécessaire. */
export async function ensureStakeholder(
  projectId: string,
  userId: string,
  name: string,
  stakeholderType = "associe",
): Promise<string | null> {
  const clean = name.trim();
  if (!projectId || !clean) return null;
  const existing = await fetchStakeholders(projectId);
  const found = existing.find((s) => s.name.toLowerCase() === clean.toLowerCase());
  if (found) return found.id;
  const { data, error } = await supabase
    .from("mp_project_stakeholders" as any)
    .insert({
      project_id: projectId,
      user_id: userId,
      name: clean,
      stakeholder_type: stakeholderType,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any)?.id ?? null;
}
