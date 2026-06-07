import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AGRICAPITAL_PROJECT_ID = "b7024000-fc34-4706-8901-2ce092283dbc";

export const getAgriCapitalPartition = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("mp_financial_records")
    .select("record_type, amount, record_date, description, category")
    .eq("project_id", AGRICAPITAL_PROJECT_ID)
    .order("record_date", { ascending: true });
  if (error) throw new Error(error.message);
  const records = data ?? [];
  const inTypes = new Set(["apport", "don", "revenue", "vente", "subvention"]);
  let entrees = 0, sorties = 0;
  for (const r of records) {
    if (inTypes.has(r.record_type)) entrees += Number(r.amount);
    else sorties += Number(r.amount);
  }
  return {
    entrees,
    sorties,
    solde: entrees - sorties,
    nbOperations: records.length,
    records: records.slice(0, 25), // aperçu
  };
});