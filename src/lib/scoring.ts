import { recordFlow } from "./financial-types";

interface ProjectInput {
  has_accounting?: boolean | null;
  has_bank_account?: boolean | null;
  has_business_plan?: boolean | null;
  annual_revenue?: number | null;
  employees_count?: number | null;
  creation_date?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  short_pitch?: string | null;
  product_description?: string | null;
  commercialization?: string | null;
  target_customers?: string | null;
  monitoring_evaluation?: string | null;
  project_type?: string | null;
  legal_status?: string | null;
  sector?: string | null;
  city?: string | null;
  country?: string | null;
}

interface RecordInput {
  record_type: string;
  amount: number;
  record_date: string;
}

export interface ScoreResult {
  score_juridique: number;
  score_financier: number;
  score_technique: number;
  score_marche: number;
  score_impact: number;
  score_global: number;
  niveau: "Finançable" | "Prometteur" | "Fragile" | "À renforcer";
  forces: string[];
  faiblesses: string[];
  recommandations: string[];
  totaux: { entrees: number; sorties: number; benefice: number; nbOperations: number };
}

export function computeScore(project: ProjectInput, records: RecordInput[]): ScoreResult {
  const entrees = records.filter((r) => recordFlow(r.record_type) === "in").reduce((s, r) => s + Number(r.amount), 0);
  const sorties = records.filter((r) => recordFlow(r.record_type) === "out").reduce((s, r) => s + Number(r.amount), 0);
  const benefice = entrees - sorties;
  const nbOperations = records.length;
  const monthsActive = project.creation_date
    ? Math.max(0, (Date.now() - new Date(project.creation_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  // Juridique (15%) — formalisation, preuves légales et bancarisation
  let juridique = 10;
  if (project.has_bank_account) juridique += 18;
  if (project.has_business_plan) juridique += 10;
  if (project.legal_status) juridique += 12; // SARL, SA, EI…
  if (project.sector) juridique += 6;
  if (project.city && project.country) juridique += 8; // siège renseigné
  if (project.creation_date) juridique += Math.min(25, monthsActive * 0.6);
  juridique = Math.min(100, juridique);

  // Financier (25%) — progression LENTE : ~5 % par mois d'activité régulière,
  // plafonné. La régularité (≥ 30 lignes étalées + bénéfice + comptabilité)
  // est nécessaire pour passer 60.
  let financier = 5;
  // sub-score : régularité d'enregistrement (max 25)
  financier += Math.min(25, nbOperations * 0.4);
  // sub-score : maturité temporelle (max 20) — 1 pt par mois d'activité
  financier += Math.min(20, monthsActive * 1);
  // sub-score : preuves de gestion (max 20)
  if (project.has_accounting) financier += 12;
  if (project.has_bank_account) financier += 8;
  // sub-score : solidité (max 25) — bénéfice positif OU équilibre + volume d'entrées
  if (benefice > 0) financier += 10;
  else if (entrees > 0 && Math.abs(benefice) <= entrees * 0.05) financier += 8; // équilibré = bon signal
  if (entrees > 500_000) financier += 5;
  if (entrees > 5_000_000) financier += 5;
  if (entrees > 10_000_000) financier += 5;
  financier = Math.min(100, Math.round(financier));

  // Technique (20%) — preuves (business plan, équipe, présentation produit)
  let technique = 10;
  if (project.has_business_plan) technique += 25;
  if ((project.employees_count ?? 0) > 0) technique += Math.min(15, (project.employees_count ?? 0) * 3);
  if (project.product_description && project.product_description.length > 80) technique += 15;
  if (project.monitoring_evaluation && project.monitoring_evaluation.length > 60) technique += 10;
  if (nbOperations > 20) technique += 10;
  technique = Math.min(100, technique);

  // Marché (20%) — pitch, ciblage, commercialisation, chiffre d'affaires
  let marche = 10;
  if (project.short_pitch && project.short_pitch.length > 60) marche += 12;
  if (project.target_customers && project.target_customers.length > 40) marche += 12;
  if (project.commercialization && project.commercialization.length > 60) marche += 12;
  if (entrees > 0) marche += 8;
  if (entrees > 500_000) marche += 10;
  if (entrees > 5_000_000) marche += 10;
  marche = Math.min(100, marche);

  // Impact (20%) — emplois, ancienneté, visuels (logo + cover = présentation)
  let impact = 10;
  impact += Math.min(30, (project.employees_count ?? 0) * 5);
  impact += Math.min(20, monthsActive * 1.2);
  if (project.logo_url) impact += 8;
  if (project.cover_url) impact += 8;
  if (nbOperations > 50) impact += 10;
  impact = Math.min(100, impact);

  const score_global = Math.round(
    juridique * 0.15 + financier * 0.25 + technique * 0.2 + marche * 0.2 + impact * 0.2,
  );

  let niveau: ScoreResult["niveau"];
  if (score_global >= 80) niveau = "Finançable";
  else if (score_global >= 60) niveau = "Prometteur";
  else if (score_global >= 40) niveau = "Fragile";
  else niveau = "À renforcer";

  const forces: string[] = [];
  const faiblesses: string[] = [];
  const recommandations: string[] = [];

  if (project.has_accounting) forces.push("Comptabilité tenue");
  else { faiblesses.push("Pas de comptabilité"); recommandations.push("Activer la comptabilité simplifiée"); }
  if (project.has_bank_account) forces.push("Compte bancaire actif");
  else { faiblesses.push("Pas de compte bancaire"); recommandations.push("Ouvrir un compte bancaire pour la traçabilité"); }
  if (project.has_business_plan) forces.push("Document de présentation stratégique disponible");
  else { faiblesses.push("Pas de document de présentation stratégique"); recommandations.push("Préparer un document de présentation stratégique (vision, offre, modèle, équipe)"); }
  if (nbOperations >= 30) forces.push("Activité régulièrement enregistrée");
  else recommandations.push("Enregistrer vos opérations chaque jour pour bâtir l'historique (régularité = score)");
  if (project.logo_url && project.cover_url) forces.push("Identité visuelle complète");
  else recommandations.push("Ajouter logo + image de couverture pour valoriser le projet");
  if (project.short_pitch) forces.push("Pitch renseigné");
  else recommandations.push("Rédiger un pitch court et convaincant");
  if (benefice > 0) forces.push("Activité bénéficiaire");
  else if (sorties > 0) faiblesses.push("Solde négatif sur la période");

  return {
    score_juridique: Math.round(juridique),
    score_financier: Math.round(financier),
    score_technique: Math.round(technique),
    score_marche: Math.round(marche),
    score_impact: Math.round(impact),
    score_global,
    niveau,
    forces,
    faiblesses,
    recommandations,
    totaux: { entrees, sorties, benefice, nbOperations },
  };
}

export function niveauColor(niveau: string): string {
  if (niveau === "Finançable") return "text-success bg-success/10 border-success/30";
  if (niveau === "Prometteur") return "text-gold bg-gold/10 border-gold/30";
  if (niveau === "Fragile") return "text-warning bg-warning/10 border-warning/30";
  return "text-destructive bg-destructive/10 border-destructive/30";
}
