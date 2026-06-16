// Détection profil PME vs Startup + règles de gamification adaptées

export type ProjectProfile = "micro" | "pme" | "startup";

export interface ProjectProfileInput {
  project_type?: string | null;
  maturite?: string | null;
  legal_status?: string | null;
  annual_revenue?: number | null;
  employees_count?: number | null;
  creation_date?: string | null;
}

export function detectProfile(p: ProjectProfileInput): ProjectProfile {
  // 1. Priorité au préset explicite
  const t = (p.project_type ?? "").toLowerCase();
  if (t === "micro") return "micro";
  if (t === "pme") return "pme";
  if (t === "startup") return "startup";

  // 2. Inférence par maturité + revenu
  if (p.maturite === "idee" || p.maturite === "en_developpement") return "startup";
  if ((p.annual_revenue ?? 0) > 5_000_000 || (p.employees_count ?? 0) >= 3) return "pme";
  if (p.legal_status && ["SARL", "SA", "Coopérative"].includes(p.legal_status)) return "pme";
  if (p.maturite === "actif" || p.maturite === "structure") return "pme";
  return "micro";
}

export const PROFILE_META: Record<ProjectProfile, {
  label: string;
  badge: string;
  description: string;
  focus: string[];
  milestones: { id: string; label: string; xp: number }[];
}> = {
  micro: {
    label: "Micro-activité",
    badge: "Solo",
    description: "Objectif : formaliser et bancariser progressivement.",
    focus: ["Régularité des enregistrements", "Bancarisation", "Identité visuelle"],
    milestones: [
      { id: "first_record", label: "1ère opération enregistrée", xp: 10 },
      { id: "bank", label: "Compte bancaire ouvert", xp: 30 },
      { id: "10_records", label: "10 opérations", xp: 20 },
      { id: "logo", label: "Logo ajouté", xp: 15 },
    ],
  },
  pme: {
    label: "PME / Coopérative",
    badge: "Structurée",
    description: "Objectif : démontrer finançabilité et solidité opérationnelle.",
    focus: ["Comptabilité tenue", "Business plan", "Équipe & gouvernance", "Score ≥ 60"],
    milestones: [
      { id: "accounting", label: "Comptabilité activée", xp: 25 },
      { id: "bp", label: "Business plan ajouté", xp: 30 },
      { id: "team_3", label: "3 membres dans l'équipe", xp: 20 },
      { id: "score_60", label: "Score global ≥ 60", xp: 50 },
      { id: "score_80", label: "Score Finançable (≥80)", xp: 100 },
    ],
  },
  startup: {
    label: "Startup / Porteur de projet",
    badge: "Lancement",
    description: "Objectif : pitch clair, MVP/validation, traction et premiers financements.",
    focus: ["Pitch convaincant", "Cible & marché", "Prévisionnel financier", "Mise en relation investisseurs"],
    milestones: [
      { id: "pitch", label: "Pitch rédigé", xp: 20 },
      { id: "target", label: "Cible client définie", xp: 20 },
      { id: "previsionnel", label: "Prévisionnel saisi (≥10 lignes)", xp: 30 },
      { id: "team", label: "Équipe fondatrice ajoutée", xp: 25 },
      { id: "intro", label: "1ère mise en relation", xp: 40 },
    ],
  },
};

export function computeMilestones(
  profile: ProjectProfile,
  context: {
    project: ProjectProfileInput & { logo_url?: string | null; has_accounting?: boolean | null; has_bank_account?: boolean | null; has_business_plan?: boolean | null; short_pitch?: string | null; target_customers?: string | null };
    recordsCount: number;
    teamCount: number;
    scoreGlobal: number;
    introductionsCount: number;
  },
): { id: string; done: boolean }[] {
  const { project, recordsCount, teamCount, scoreGlobal, introductionsCount } = context;
  const checks: Record<string, boolean> = {
    first_record: recordsCount >= 1,
    "10_records": recordsCount >= 10,
    bank: !!project.has_bank_account,
    logo: !!project.logo_url,
    accounting: !!project.has_accounting,
    bp: !!project.has_business_plan,
    team_3: teamCount >= 3,
    score_60: scoreGlobal >= 60,
    score_80: scoreGlobal >= 80,
    pitch: !!project.short_pitch && project.short_pitch.length > 60,
    target: !!project.target_customers && project.target_customers.length > 30,
    previsionnel: recordsCount >= 10,
    team: teamCount >= 2,
    intro: introductionsCount >= 1,
  };
  return PROFILE_META[profile].milestones.map((m) => ({ id: m.id, done: !!checks[m.id] }));
}
