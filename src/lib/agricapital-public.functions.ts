import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export const getAgriCapitalPartition = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase config missing");

  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supa.rpc("get_agricapital_partition");
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as {
    entrees?: number; sorties?: number; solde?: number; nbOperations?: number;
    records?: Array<{ record_type: string; amount: number; record_date: string; description: string | null; category: string | null }>;
  };
  return {
    entrees: Number(payload.entrees ?? 0),
    sorties: Number(payload.sorties ?? 0),
    solde: Number(payload.solde ?? 0),
    nbOperations: Number(payload.nbOperations ?? 0),
    records: payload.records ?? [],
  };
});
