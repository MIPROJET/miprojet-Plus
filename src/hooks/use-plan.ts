import { useQuery } from "@tanstack/react-query";
import { fetchUserPlan, planFeatures, type PlanTier } from "@/lib/plan";

export function usePlan(userId: string | undefined) {
  const q = useQuery({
    queryKey: ["mp-plan", userId],
    queryFn: () => (userId ? fetchUserPlan(userId) : Promise.resolve<PlanTier>("free")),
    enabled: !!userId,
    staleTime: 60_000,
  });
  const tier: PlanTier = q.data ?? "free";
  return { tier, features: planFeatures(tier), isLoading: q.isLoading };
}
