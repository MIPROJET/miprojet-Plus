import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_financial_records",
  title: "Lister les opérations financières",
  description:
    "Liste les opérations financières (recettes, dépenses, apports) d'un projet, avec totaux calculés.",
  inputSchema: {
    project_id: z.string().describe("Identifiant UUID du projet."),
    record_type: z
      .string()
      .optional()
      .describe("Filtre par type d'opération, ex. 'income', 'expense', 'contribution'."),
    limit: z.number().int().optional().describe("Nombre max d'opérations (défaut 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id, record_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("mp_financial_records")
      .select("id, record_type, amount, currency, category, description, record_date")
      .eq("project_id", project_id)
      .order("record_date", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (record_type) query = query.eq("record_type", record_type);
    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const records = data ?? [];
    const totals: Record<string, number> = {};
    for (const r of records) {
      totals[r.record_type] = (totals[r.record_type] ?? 0) + Number(r.amount ?? 0);
    }
    const payload = { records, totals };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
