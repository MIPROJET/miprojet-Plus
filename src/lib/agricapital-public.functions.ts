import { createServerFn } from "@tanstack/react-start";

/**
 * Public, anon-callable. Returns ONLY aggregated, non-identifying totals.
 * Per-transaction detail is never exposed publicly (RLS-protected ledger).
 */
export const getAgriCapitalPartition = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_agricapital_partition");
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as {
    entrees?: number;
    sorties?: number;
    solde?: number;
    nbOperations?: number;
  };
  return {
    entrees: Number(payload.entrees ?? 0),
    sorties: Number(payload.sorties ?? 0),
    solde: Number(payload.solde ?? 0),
    nbOperations: Number(payload.nbOperations ?? 0),
  };
});
