import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_financial_record",
  title: "Ajouter une opération financière",
  description:
    "Enregistre une nouvelle opération financière (recette, dépense ou apport) sur un projet de l'utilisateur.",
  inputSchema: {
    project_id: z.string().describe("Identifiant UUID du projet."),
    record_type: z
      .string()
      .describe("Type d'opération : 'income', 'expense' ou 'contribution'."),
    amount: z.number().describe("Montant de l'opération."),
    currency: z.string().optional().describe("Devise, défaut XOF."),
    category: z.string().optional().describe("Catégorie, ex. 'matériel', 'RH'."),
    description: z.string().optional().describe("Libellé de l'opération."),
    record_date: z
      .string()
      .optional()
      .describe("Date de l'opération au format AAAA-MM-JJ (défaut aujourd'hui)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const userId = ctx.getUserId();
    if (!userId) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("mp_financial_records")
      .insert({
        project_id: input.project_id,
        user_id: userId,
        record_type: input.record_type,
        amount: input.amount,
        currency: input.currency ?? "XOF",
        category: input.category ?? null,
        description: input.description ?? null,
        record_date: input.record_date ?? new Date().toISOString().slice(0, 10),
      })
      .select()
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { record: data },
    };
  },
});
