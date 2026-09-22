import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeScore } from "./scoring";
import { MIPROJET_LOGO_PNG_BASE64 } from "./pdf-logo";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

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

/** Les polices standard PDF n'acceptent que WinAnsi : on normalise les caractères typographiques. */
function safe(text: string): string {
  return (text ?? "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2022\u00B7]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u202F|\u00A0|\u2009/g, " ")
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, "");
}

function fcfa(n: number): string {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  const sign = v < 0 ? "-" : "";
  return (
    sign +
    Math.abs(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") +
    " FCFA"
  );
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export interface ReportScore {
  score_global: number;
  niveau: string;
  maturite?: string | null;
  axes: { label: string; value: number; weight: number }[];
  forces: string[];
  faiblesses: string[];
  recommandations: string[];
  totaux: { entrees: number; sorties: number; benefice: number; nbOperations: number };
  source: "officiel" | "estimation";
  computedAt?: string | null;
}

interface ReportPayload {
  projectTitle: string;
  ownerName: string;
  score: ReportScore;
  issuedAt: string;
  shortId: string;
  certificationType: "preview" | "certified";
}

const ORANGE = rgb(0.953, 0.58, 0.141); // #F39424
const INK = rgb(0.11, 0.1, 0.09);
const MUTED = rgb(0.42, 0.42, 0.44);
const LIGHT = rgb(0.96, 0.94, 0.9);

async function buildPdf(p: ReportPayload, contentHash: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`MiPROJET Score - ${p.projectTitle}`));
  pdf.setAuthor("MiPROJET+");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595,
    H = 842,
    M = 46;
  const inner = W - M * 2;

  let logo: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  try {
    logo = await pdf.embedPng(
      Uint8Array.from(atob(MIPROJET_LOGO_PNG_BASE64), (c) => c.charCodeAt(0)),
    );
  } catch {
    logo = null;
  }

  let page: PDFPage = pdf.addPage([W, H]);
  let y = 0;

  const header = (first: boolean) => {
    page.drawRectangle({ x: 0, y: H - 86, width: W, height: 86, color: ORANGE });
    if (logo) {
      const h = 34;
      const w = (logo.width / logo.height) * h;
      page.drawImage(logo, { x: M, y: H - 62, width: w, height: h });
    } else {
      page.drawText("MiPROJET+", { x: M, y: H - 55, size: 20, font: bold, color: rgb(1, 1, 1) });
    }
    page.drawText(safe("Rapport MiPROJET Score"), {
      x: W - M - bold.widthOfTextAtSize(safe("Rapport MiPROJET Score"), 12),
      y: H - 45,
      size: 12,
      font: bold,
      color: rgb(1, 1, 1),
    });
    const sub = safe(
      p.certificationType === "certified"
        ? `Certificat officiel - ID ${p.shortId}`
        : "Apercu non certifie",
    );
    page.drawText(sub, {
      x: W - M - font.widthOfTextAtSize(sub, 9),
      y: H - 60,
      size: 9,
      font,
      color: rgb(1, 1, 1),
    });
    y = first ? H - 118 : H - 110;
  };

  const footer = () => {
    page.drawLine({
      start: { x: M, y: 62 },
      end: { x: W - M, y: 62 },
      thickness: 0.6,
      color: LIGHT,
    });
    page.drawText(safe("Signature numerique (SHA-256)"), {
      x: M,
      y: 48,
      size: 8,
      font: bold,
      color: MUTED,
    });
    page.drawText(contentHash.slice(0, 64), { x: M, y: 36, size: 7.5, font, color: INK });
    page.drawText(safe(`Verification : miprojet.plus/certificat/${p.shortId}`), {
      x: M,
      y: 24,
      size: 8,
      font,
      color: MUTED,
    });
  };

  const need = (space: number) => {
    if (y - space < 90) {
      footer();
      page = pdf.addPage([W, H]);
      header(false);
    }
  };

  header(true);

  // Titre projet
  for (const line of wrap(p.projectTitle, bold, 20, inner)) {
    page.drawText(line, { x: M, y, size: 20, font: bold, color: INK });
    y -= 24;
  }
  page.drawText(safe(`Titulaire : ${p.ownerName}`), { x: M, y, size: 10, font, color: MUTED });
  y -= 13;
  page.drawText(
    safe(
      `Emis le ${new Date(p.issuedAt).toLocaleString("fr-FR")} - ${
        p.score.source === "officiel"
          ? "score officiel calcule automatiquement par MiPROJET+"
          : "estimation calculee a partir des donnees saisies"
      }`,
    ),
    { x: M, y, size: 9, font, color: MUTED },
  );
  y -= 26;

  // Bloc score
  const boxH = 92;
  page.drawRectangle({ x: M, y: y - boxH, width: inner, height: boxH, color: LIGHT });
  page.drawRectangle({ x: M, y: y - boxH, width: 5, height: boxH, color: ORANGE });
  page.drawText(safe("Score global"), { x: M + 22, y: y - 24, size: 10, font, color: MUTED });
  page.drawText(String(Math.round(p.score.score_global)), {
    x: M + 22,
    y: y - 72,
    size: 42,
    font: bold,
    color: ORANGE,
  });
  page.drawText("/ 100", { x: M + 110, y: y - 62, size: 13, font, color: MUTED });
  page.drawText(safe(p.score.niveau), {
    x: M + 170,
    y: y - 62,
    size: 15,
    font: bold,
    color: INK,
  });
  if (p.score.maturite) {
    page.drawText(safe(`Maturite : ${p.score.maturite}`), {
      x: M + 170,
      y: y - 80,
      size: 9,
      font,
      color: MUTED,
    });
  }
  // jauge
  const gx = M + 300,
    gw = inner - 320;
  page.drawRectangle({ x: gx, y: y - 52, width: gw, height: 10, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x: gx,
    y: y - 52,
    width: (gw * Math.max(0, Math.min(100, p.score.score_global))) / 100,
    height: 10,
    color: ORANGE,
  });
  y -= boxH + 26;

  // Axes
  page.drawText(safe("Decomposition par axe"), { x: M, y, size: 13, font: bold, color: INK });
  y -= 18;
  for (const a of p.score.axes) {
    need(20);
    page.drawText(safe(`${a.label} (ponderation ${Math.round(a.weight * 100)}%)`), {
      x: M,
      y,
      size: 9.5,
      font,
      color: INK,
    });
    const bx = M + 250,
      bw = 200;
    page.drawRectangle({ x: bx, y: y - 1, width: bw, height: 8, color: LIGHT });
    page.drawRectangle({
      x: bx,
      y: y - 1,
      width: (bw * Math.max(0, Math.min(100, a.value))) / 100,
      height: 8,
      color: ORANGE,
    });
    const lbl = `${Math.round(a.value)}/100`;
    page.drawText(lbl, {
      x: W - M - bold.widthOfTextAtSize(lbl, 9.5),
      y,
      size: 9.5,
      font: bold,
      color: INK,
    });
    y -= 18;
  }

  // Synthese financiere
  y -= 12;
  need(96);
  page.drawText(safe("Synthese financiere enregistree"), {
    x: M,
    y,
    size: 13,
    font: bold,
    color: INK,
  });
  y -= 20;
  const cells: [string, string][] = [
    ["Total des entrees", fcfa(p.score.totaux.entrees)],
    ["Total des sorties", fcfa(p.score.totaux.sorties)],
    ["Solde", fcfa(p.score.totaux.benefice)],
    ["Operations enregistrees", String(p.score.totaux.nbOperations)],
  ];
  const cw = inner / 2;
  cells.forEach(([label, value], i) => {
    const cx = M + (i % 2) * cw;
    const cy = y - Math.floor(i / 2) * 38;
    page.drawRectangle({ x: cx, y: cy - 30, width: cw - 10, height: 32, color: LIGHT });
    page.drawText(safe(label), { x: cx + 10, y: cy - 10, size: 8.5, font, color: MUTED });
    page.drawText(safe(value), { x: cx + 10, y: cy - 24, size: 11, font: bold, color: INK });
  });
  y -= 38 * Math.ceil(cells.length / 2) + 18;

  // Listes
  const list = (title: string, items: string[]) => {
    if (!items.length) return;
    need(34);
    page.drawText(safe(title), { x: M, y, size: 13, font: bold, color: INK });
    y -= 16;
    for (const item of items.slice(0, 8)) {
      const lines = wrap(item, font, 9.5, inner - 14);
      need(lines.length * 12 + 4);
      lines.forEach((l, i) => {
        if (i === 0) page.drawText("-", { x: M, y, size: 9.5, font: bold, color: ORANGE });
        page.drawText(l, { x: M + 12, y, size: 9.5, font, color: INK });
        y -= 12;
      });
      y -= 2;
    }
    y -= 10;
  };

  list("Points forts", p.score.forces);
  list("Points de vigilance", p.score.faiblesses);
  list("Recommandations", p.score.recommandations);

  if (p.certificationType === "preview") {
    const pages = pdf.getPages();
    for (const pg of pages) {
      pg.drawText("APERCU", {
        x: 130,
        y: 380,
        size: 86,
        font: bold,
        color: rgb(0.93, 0.9, 0.86),
        opacity: 0.55,
        rotate: { type: "degrees", angle: 32 } as never,
      });
    }
  }

  footer();
  return await pdf.save();
}

/** Score officiel (calcul automatique en base) avec repli sur l'estimation locale. */
async function buildScorePayload(
  supabase: any,
  projectId: string,
  project: any,
): Promise<ReportScore> {
  const [{ data: official }, { data: records }] = await Promise.all([
    supabase
      .from("mp_scoring_results")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mp_financial_records")
      .select("record_type, amount, record_date")
      .eq("project_id", projectId),
  ]);

  const local = computeScore(project, records ?? []);

  if (official && official.score_global != null) {
    return {
      score_global: Math.round(Number(official.score_global)),
      niveau: official.niveau ?? local.niveau,
      maturite: official.maturite ?? null,
      axes: [
        { label: "Gouvernance & juridique", value: Number(official.score_juridique ?? 0), weight: 0.15 },
        { label: "Finance", value: Number(official.score_financier ?? 0), weight: 0.25 },
        { label: "Organisation & technique", value: Number(official.score_technique ?? 0), weight: 0.2 },
        { label: "Marche", value: Number(official.score_marche ?? 0), weight: 0.15 },
        { label: "Equipe", value: Number(official.score_equipe ?? 0), weight: 0.1 },
        { label: "Potentiel de croissance", value: Number(official.score_impact ?? 0), weight: 0.15 },
      ],
      forces: (official.forces ?? []).length ? official.forces : local.forces,
      faiblesses: (official.faiblesses ?? []).length ? official.faiblesses : local.faiblesses,
      recommandations: (official.recommandations ?? []).length
        ? official.recommandations
        : local.recommandations,
      totaux: local.totaux,
      source: "officiel",
      computedAt: official.computed_at ?? official.updated_at ?? null,
    };
  }

  return {
    score_global: local.score_global,
    niveau: local.niveau,
    maturite: null,
    axes: [
      { label: "Juridique", value: local.score_juridique, weight: 0.15 },
      { label: "Financier", value: local.score_financier, weight: 0.25 },
      { label: "Technique", value: local.score_technique, weight: 0.2 },
      { label: "Marche", value: local.score_marche, weight: 0.2 },
      { label: "Impact", value: local.score_impact, weight: 0.2 },
    ],
    forces: local.forces,
    faiblesses: local.faiblesses,
    recommandations: local.recommandations,
    totaux: local.totaux,
    source: "estimation",
    computedAt: null,
  };
}

export const generateScoreReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { projectId: string }) => z.object({ projectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: project }, { data: plan }, { data: user }] = await Promise.all([
      supabase.from("mp_projects").select("*").eq("id", data.projectId).maybeSingle(),
      supabase.from("mp_user_plans").select("tier, expires_at").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(userId),
    ]);

    if (!project) throw new Error("Projet introuvable");

    const tier =
      !plan || (plan.expires_at && new Date(plan.expires_at).getTime() < Date.now())
        ? "free"
        : plan.tier;
    const canCertify = tier === "growth" || tier === "partner";
    const certificationType: "preview" | "certified" = canCertify ? "certified" : "preview";

    const score = await buildScorePayload(supabase, data.projectId, project);
    const issuedAt = new Date().toISOString();
    const ownerName =
      user?.user?.user_metadata?.full_name || user?.user?.email || "Porteur du projet";

    const payload = {
      projectTitle: project.title,
      ownerName,
      score,
      issuedAt,
      certificationType,
      version: 2,
    };

    const contentHash = await sha256Hex(JSON.stringify(payload));

    let shortId = makeShortId();
    let certId: string | null = null;

    if (canCertify) {
      for (let i = 0; i < 3; i++) {
        const { data: ins, error } = await supabaseAdmin
          .from("mp_certifications")
          .insert({
            user_id: userId,
            project_id: data.projectId,
            signed_payload: payload as never,
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
      payload: cert.signed_payload as never,
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
    const score: ReportScore = p.score?.axes
      ? p.score
      : {
          score_global: p.score?.score_global ?? 0,
          niveau: p.score?.niveau ?? "-",
          maturite: null,
          axes: [
            { label: "Juridique", value: p.score?.score_juridique ?? 0, weight: 0.15 },
            { label: "Financier", value: p.score?.score_financier ?? 0, weight: 0.25 },
            { label: "Technique", value: p.score?.score_technique ?? 0, weight: 0.2 },
            { label: "Marche", value: p.score?.score_marche ?? 0, weight: 0.2 },
            { label: "Impact", value: p.score?.score_impact ?? 0, weight: 0.2 },
          ],
          forces: p.score?.forces ?? [],
          faiblesses: p.score?.faiblesses ?? [],
          recommandations: p.score?.recommandations ?? [],
          totaux: p.score?.totaux ?? { entrees: 0, sorties: 0, benefice: 0, nbOperations: 0 },
          source: "estimation",
          computedAt: null,
        };
    const pdf = await buildPdf(
      {
        projectTitle: p.projectTitle,
        ownerName: p.ownerName,
        score,
        issuedAt: p.issuedAt,
        shortId: cert.short_id!,
        certificationType: p.certificationType ?? "certified",
      },
      cert.content_hash!,
    );
    return { pdfBase64: Buffer.from(pdf).toString("base64") };
  });
