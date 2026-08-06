import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "Lister les projets",
  description:
    "Liste les projets MiPROJET+ de l'utilisateur connecté (titre, secteur, maturité, statut).",
  inputSchema: {
    limit: z.number().int().optional().describe("Nombre max de projets (défaut 20)."),
    search: z.string().optional().describe("Filtre sur le titre du projet."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("mp_projects")
      .select(
        "id, title, sector, city, country, profile_kind, journey, maturite, status, budget_initial, is_public, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));
    if (search) query = query.ilike("title", `%${search}%`);
    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { projects: data ?? [] },
    };
  },
});
