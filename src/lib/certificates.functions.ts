import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeScore } from "./scoring";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function makeShortId(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ReportPayload {
  projectTitle: string;
  ownerName: string;
  score: ReturnType<typeof computeScore>;
  issuedAt: string;
  shortId: string;
  certificationType: "preview" | "certified";
}

async function buildPdf(p: ReportPayload, contentHash: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.82, 0.66, 0.18);
  const ink = rgb(0.08, 0.09, 0.13);
  const muted = rgb(0.42, 0.45, 0.52);

  let y = 800;
  page.drawRectangle({ x: 0, y: 810, width: 595, height: 32, color: rgb(0.05, 0.07, 0.12) });
  page.drawText("MiProjet+ · Rapport de score", { x: 40, y: 820, size: 12, font: bold, color: rgb(1, 1, 1) });

  y = 770;
  page.drawText(p.certificationType === "certified" ? "CERTIFICAT OFFICIEL" : "APERÇU NON CERTIFIÉ", {
    x: 40, y, size: 10, font: bold, color: p.certificationType === "certified" ? gold : muted,
  });
  y -= 30;
  page.drawText(p.projectTitle, { x: 40, y, size: 22, font: bold, color: ink });
  y -= 18;
  page.drawText(`Titulaire : ${p.ownerName}`, { x: 40, y, size: 11, font, color: muted });
  y -= 14;
  page.drawText(`Émis le : ${new Date(p.issuedAt).toLocaleString("fr-FR")}`, { x: 40, y, size: 11, font, color: muted });

  // Score block
  y -= 40;
  page.drawRectangle({ x: 40, y: y - 90, width: 515, height: 110, color: rgb(0.96, 0.97, 0.99) });
  page.drawText("Score global", { x: 60, y: y - 10, size: 11, font, color: muted });
  page.drawText(String(p.score.score_global), { x: 60, y: y - 60, size: 48, font: bold, color: ink });
  page.drawText(`/ 100  ·  ${p.score.niveau}`, { x: 160, y: y - 50, size: 14, font: bold, color: gold });

  // Axes
  y -= 130;
  const axes: [string, number, string][] = [
    ["Juridique", p.score.score_juridique, "15%"],
    ["Financier", p.score.score_financier, "35%"],
    ["Technique", p.score.score_technique, "20%"],
    ["Marché", p.score.score_marche, "20%"],
    ["Impact", p.score.score_impact, "10%"],
  ];
  page.drawText("Décomposition par axe", { x: 40, y, size: 13, font: bold, color: ink });
  y -= 18;
  for (const [label, value, w] of axes) {
    page.drawText(`${label}  (pondération ${w})`, { x: 40, y, size: 10, font, color: muted });
    page.drawRectangle({ x: 260, y: y - 2, width: 240, height: 8, color: rgb(0.9, 0.92, 0.95) });
    page.drawRectangle({ x: 260, y: y - 2, width: (240 * value) / 100, height: 8, color: gold });
    page.drawText(`${value}/100`, { x: 510, y, size: 10, font: bold, color: ink });
    y -= 18;
  }

  // Recos
  y -= 10;
  page.drawText("Recommandations", { x: 40, y, size: 13, font: bold, color: ink });
  y -= 16;
  for (const r of p.score.recommandations.slice(0, 6)) {
    page.drawText(`•  ${r.slice(0, 95)}`, { x: 40, y, size: 10, font, color: ink });
    y -= 14;
  }

  // Signature
  y = 90;
  page.drawLine({ start: { x: 40, y: y + 30 }, end: { x: 555, y: y + 30 }, thickness: 0.5, color: muted });
  page.drawText("Signature numérique (SHA-256)", { x: 40, y: y + 14, size: 9, font: bold, color: muted });
  page.drawText(contentHash, { x: 40, y, size: 8, font, color: ink });
  page.drawText(`Vérification : /certificat/${p.shortId}`, { x: 40, y: y - 14, size: 9, font, color: muted });

  if (p.certificationType === "preview") {
    page.drawText("APERÇU", { x: 200, y: 400, size: 90, font: bold, color: rgb(0.9, 0.9, 0.92), opacity: 0.5, rotate: { type: "degrees", angle: 30 } as any });
  }

  return await pdf.save();
}

export const generateScoreReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: project }, { data: records }, { data: plan }, { data: user }] = await Promise.all([
      supabase.from("mp_projects").select("*").eq("id", data.projectId).maybeSingle(),
      supabase.from("mp_financial_records").select("record_type, amount, record_date").eq("project_id", data.projectId),
      supabase.from("mp_user_plans").select("tier, expires_at").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    if (!project) throw new Error("Projet introuvable");

    const tier = !plan || (plan.expires_at && new Date(plan.expires_at).getTime() < Date.now())
      ? "free"
      : plan.tier;
    const canCertify = tier === "growth" || tier === "partner";
    const certificationType: "preview" | "certified" = canCertify ? "certified" : "preview";

    const score = computeScore(project, records ?? []);
    const issuedAt = new Date().toISOString();
    const ownerName = user?.user?.user_metadata?.full_name || user?.user?.email || "Porteur du projet";

    const payload = {
      projectTitle: project.title,
      ownerName,
      score,
      issuedAt,
      certificationType,
      version: 1,
    };

    const contentHash = await sha256Hex(JSON.stringify(payload));

    let shortId = makeShortId();
    let certId: string | null = null;

    if (canCertify) {
      // Insert certification record (admin client bypasses RLS for clean insert)
      for (let i = 0; i < 3; i++) {
        const { data: ins, error } = await supabaseAdmin
          .from("mp_certifications")
          .insert({
            user_id: userId,
            project_id: data.projectId,
            signed_payload: payload as any,
            certification_type: "score",
            status: "issued",
            certified_at: issuedAt,
            short_id: shortId,
            content_hash: contentHash,
            
          })
          .select("id, short_id")
          .single();
        if (!error && ins) {
          certId = ins.id;
          shortId = ins.short_id!;
          break;
        }
        shortId = makeShortId();
      }
    }

    const pdfBytes = await buildPdf(
      { projectTitle: project.title, ownerName, score, issuedAt, shortId, certificationType },
      contentHash,
    );

    return {
      pdfBase64: Buffer.from(pdfBytes).toString("base64"),
      shortId: canCertify ? shortId : null,
      contentHash,
      certificationType,
      certId,
    };
  });

export const verifyCertificate = createServerFn({ method: "GET" })
  .inputValidator((d: { shortId: string }) => z.object({ shortId: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { data: cert } = await supabaseAdmin
      .from("mp_certifications")
      .select("id, short_id, content_hash, signed_payload, certified_at, status, project_id")
      .eq("short_id", data.shortId)
      .eq("status", "issued")
      .maybeSingle();
    if (!cert) return { valid: false as const };

    const recomputed = await sha256Hex(JSON.stringify(cert.signed_payload));
    const valid = recomputed === cert.content_hash;

    return {
      valid: valid as boolean,
      shortId: cert.short_id,
      contentHash: cert.content_hash,
      certifiedAt: cert.certified_at,
      payload: cert.signed_payload as any,
    };
  });

export const regenerateCertificatePdf = createServerFn({ method: "POST" })
  .inputValidator((d: { shortId: string }) => z.object({ shortId: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { data: cert } = await supabaseAdmin
      .from("mp_certifications")
      .select("short_id, content_hash, signed_payload, status")
      .eq("short_id", data.shortId)
      .eq("status", "issued")
      .maybeSingle();
    if (!cert || !cert.signed_payload) throw new Error("Certificat introuvable");
    const p = cert.signed_payload as any;
    const pdf = await buildPdf(
      {
        projectTitle: p.projectTitle,
        ownerName: p.ownerName,
        score: p.score,
        issuedAt: p.issuedAt,
        shortId: cert.short_id!,
        certificationType: p.certificationType ?? "certified",
      },
      cert.content_hash!,
    );
    return { pdfBase64: Buffer.from(pdf).toString("base64") };
  });
