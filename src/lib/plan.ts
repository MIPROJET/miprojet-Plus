import { supabase } from "@/integrations/supabase/client";

export type PlanTier = "free" | "growth" | "partner";

export interface PlanFeatures {
  humanSupport: "basic" | "dedicated";
  ticketsPerMonth: number; // -1 = illimité
  voiceTranscriptionsPerMonth: number;
  justificatifsPerMonth: number;
  maxProjects: number;
  pdfCertified: boolean;
  autoPublishCatalog: boolean;
  label: string;
  accent: "muted" | "primary" | "gold";
}

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  free: {
    humanSupport: "basic",
    ticketsPerMonth: 1,
    voiceTranscriptionsPerMonth: 30,
    justificatifsPerMonth: 10,
    maxProjects: 1,
    pdfCertified: false,
    autoPublishCatalog: false,
    label: "Découverte",
    accent: "muted",
  },
  growth: {
    humanSupport: "dedicated",
    ticketsPerMonth: -1,
    voiceTranscriptionsPerMonth: 500,
    justificatifsPerMonth: 200,
    maxProjects: 5,
    pdfCertified: true,
    autoPublishCatalog: true,
    label: "Croissance",
    accent: "primary",
  },
  partner: {
    humanSupport: "dedicated",
    ticketsPerMonth: -1,
    voiceTranscriptionsPerMonth: -1,
    justificatifsPerMonth: -1,
    maxProjects: -1,
    pdfCertified: true,
    autoPublishCatalog: true,
    label: "Partenaire",
    accent: "gold",
  },
};

export async function fetchUserPlan(userId: string): Promise<PlanTier> {
  const { data } = await supabase
    .from("mp_user_plans")
    .select("tier, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return "free";
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return "free";
  return (data.tier as PlanTier) ?? "free";
}

export function planFeatures(tier: PlanTier): PlanFeatures {
  return PLAN_FEATURES[tier];
}
