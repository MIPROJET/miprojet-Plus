import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_project_score",
  title: "Score et maturité d'un projet",
  description:
    "Renvoie le MiProjet Score actif (global et par axe), le niveau de finançabilité, les forces, faiblesses et recommandations.",
  inputSchema: {
    project_id: z.string().describe("Identifiant UUID du projet."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: scoring, error } = await supabase
      .from("mp_scoring_results")
      .select("*")
      .eq("project_id", project_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    const { data: evaluation } = await supabase
      .from("mp_evaluations")
      .select("*")
      .eq("project_id", project_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const payload = { scoring: scoring ?? null, evaluation: evaluation ?? null };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
