export const RECORD_TYPES = [
  { value: "vente", label: "Vente / Recette", flow: "in" },
  { value: "encaissement", label: "Encaissement", flow: "in" },
  { value: "apport_associe", label: "Apport d'associé", flow: "in" },
  { value: "pret", label: "Prêt reçu", flow: "in" },
  { value: "don", label: "Don / Subvention", flow: "in" },
  { value: "investissement", label: "Investissement reçu", flow: "in" },
  { value: "achat", label: "Achat / Approvisionnement", flow: "out" },
  { value: "depense", label: "Dépense opérationnelle", flow: "out" },
  { value: "paiement", label: "Paiement / Salaire", flow: "out" },
  { value: "remboursement", label: "Remboursement de prêt", flow: "out" },
] as const;

export type RecordType = (typeof RECORD_TYPES)[number]["value"];

export function recordFlow(type: string): "in" | "out" {
  return RECORD_TYPES.find((r) => r.value === type)?.flow ?? "out";
}

export function recordLabel(type: string): string {
  return RECORD_TYPES.find((r) => r.value === type)?.label ?? type;
}

export function formatXOF(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount).replace(/\s/g, " ")} FCFA`;
}
