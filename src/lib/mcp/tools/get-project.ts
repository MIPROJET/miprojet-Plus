import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { notAuthenticated, supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_project",
  title: "Détail d'un projet",
  description:
    "Renvoie la fiche complète d'un projet (identité, activité, finances clés, gouvernance) ainsi que son équipe.",
  inputSchema: {
    project_id: z.string().describe("Identifiant UUID du projet."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ project_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const { data: project, error } = await supabase
      .from("mp_projects")
      .select("*")
      .eq("id", project_id)
      .maybeSingle();
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };
    if (!project)
      return {
        content: [{ type: "text", text: "Projet introuvable ou non accessible." }],
        isError: true,
      };
    const { data: team } = await supabase
      .from("mp_project_team")
      .select("id, full_name, role, status")
      .eq("project_id", project_id);
    const payload = { project, team: team ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
