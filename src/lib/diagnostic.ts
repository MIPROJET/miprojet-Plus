// Diagnostic automatique : génère des recommandations à partir du projet + score
import type { ScoreResult } from "./scoring";
import type { ProjectProfile } from "./project-profile";

export interface DiagnosticInput {
  project: {
    id: string;
    has_accounting?: boolean | null;
    has_bank_account?: boolean | null;
    has_business_plan?: boolean | null;
    logo_url?: string | null;
    cover_url?: string | null;
    short_pitch?: string | null;
    product_description?: string | null;
    target_customers?: string | null;
    commercialization?: string | null;
    legal_status?: string | null;
    governance?: any;
  };
  score: ScoreResult;
  profile: ProjectProfile;
  teamCount: number;
}

export interface AutoRecommendation {
  category: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommended_action: string;
  related_service_code?: string;
}

export function runAutoDiagnostic(input: DiagnosticInput): AutoRecommendation[] {
  const { project, score, profile, teamCount } = input;
  const recos: AutoRecommendation[] = [];

  if (!project.has_bank_account) {
    recos.push({
      category: "finance",
      severity: "high",
      title: "Ouvrir un compte bancaire professionnel",
      description: "Sans compte bancaire, la traçabilité financière est limitée et les financeurs hésitent.",
      recommended_action: "Ouvrir un compte au nom du projet et y centraliser entrées/sorties.",
      related_service_code: "STRUCT_JURIDIQUE",
    });
  }
  if (!project.has_accounting) {
    recos.push({
      category: "finance",
      severity: "medium",
      title: "Activer la comptabilité simplifiée",
      description: "Une comptabilité tenue régulièrement augmente fortement votre score financier.",
      recommended_action: "Cocher 'comptabilité tenue' et enregistrer chaque opération.",
    });
  }
  if (!project.has_business_plan) {
    recos.push({
      category: "identite",
      severity: profile === "startup" ? "high" : "medium",
      title: "Préparer un document de présentation stratégique",
      description: "Vision, offre, modèle économique, équipe — indispensable pour convaincre.",
      recommended_action: "Rédiger un business plan ou pitch deck synthétique.",
      related_service_code: "PLAN_AFFAIRE",
    });
  }
  if (!project.short_pitch || project.short_pitch.length < 60) {
    recos.push({
      category: "marche",
      severity: "medium",
      title: "Rédiger un pitch court",
      description: "Un pitch en 2-3 phrases est essentiel pour la page publique et les investisseurs.",
      recommended_action: "Compléter le champ 'pitch' dans l'identité du projet.",
    });
  }
  if (!project.logo_url || !project.cover_url) {
    recos.push({
      category: "identite",
      severity: "low",
      title: "Compléter l'identité visuelle",
      description: "Logo + image de couverture professionnalisent la vitrine publique.",
      recommended_action: "Ajouter logo et cover dans le formulaire projet.",
    });
  }
  if (teamCount < 2 && (profile === "pme" || profile === "startup")) {
    recos.push({
      category: "equipe",
      severity: profile === "startup" ? "high" : "medium",
      title: "Documenter votre équipe",
      description: "Une équipe visible rassure financeurs et partenaires.",
      recommended_action: "Ajouter au moins 2 membres clés (rôle, expertise, photo).",
    });
  }
  if (!project.governance || Object.keys(project.governance || {}).length === 0) {
    if (profile !== "micro") {
      recos.push({
        category: "gouvernance",
        severity: "medium",
        title: "Définir votre gouvernance",
        description: "Mode décisionnel et organes clarifient la maturité du projet.",
        recommended_action: "Renseigner la section 'Gouvernance' du projet.",
      });
    }
  }
  if (!project.target_customers || project.target_customers.length < 40) {
    recos.push({
      category: "marche",
      severity: "low",
      title: "Préciser votre cible client",
      description: "Sans cible claire, la stratégie commerciale paraît floue.",
      recommended_action: "Décrire vos segments de clientèle prioritaires.",
    });
  }
  if (score.score_global < 60) {
    recos.push({
      category: "identite",
      severity: "medium",
      title: "Diagnostic 360° recommandé",
      description: `Score global ${score.score_global}/100 — un expert peut identifier les leviers prioritaires.`,
      recommended_action: "Demander un diagnostic avancé.",
      related_service_code: "DIAG_AVANCE",
    });
  }

  return recos;
}

export const SEVERITY_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critique", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  high: { label: "Important", cls: "bg-warning/15 text-warning border-warning/30" },
  medium: { label: "Moyen", cls: "bg-gold/15 text-gold border-gold/30" },
  low: { label: "Mineur", cls: "bg-primary/10 text-primary border-primary/30" },
  info: { label: "Info", cls: "bg-muted text-muted-foreground border-border" },
};

export const CATEGORY_LABEL: Record<string, string> = {
  identite: "Identité",
  finance: "Finance",
  equipe: "Équipe",
  gouvernance: "Gouvernance",
  marche: "Marché",
  juridique: "Juridique",
  marketing: "Marketing",
};
