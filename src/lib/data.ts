import { supabase } from "@/integrations/supabase/client";

export async function fetchMyProjects(userId: string) {
  const { data, error } = await supabase
    .from("mp_projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectRecords(projectId: string) {
  const { data, error } = await supabase
    .from("mp_financial_records")
    .select("*")
    .eq("project_id", projectId)
    .order("record_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllUserRecords(userId: string) {
  const { data, error } = await supabase
    .from("mp_financial_records")
    .select("*")
    .eq("user_id", userId)
    .order("record_date", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data ?? [];
}
