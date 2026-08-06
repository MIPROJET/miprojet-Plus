import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjects from "./tools/list-projects";
import getProject from "./tools/get-project";
import listFinancialRecords from "./tools/list-financial-records";
import addFinancialRecord from "./tools/add-financial-record";
import getProjectScore from "./tools/get-project-score";

// L'issuer OAuth doit rester l'hôte Supabase direct (le proxy .lovable.cloud
// serait rejeté pour non-correspondance d'issuer RFC 8414).
const projectRef =
  import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "miprojet",
  title: "MIPROJET+",
  version: "0.1.0",
  instructions:
    "Outils MiPROJET+ : consulter les projets de l'utilisateur connecté, leur équipe, leur suivi financier, leur MiProjet Score et leur maturité, et enregistrer de nouvelles opérations financières.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProjects,
    getProject,
    listFinancialRecords,
    addFinancialRecord,
    getProjectScore,
  ],
});
