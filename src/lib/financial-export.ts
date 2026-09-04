import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toPng } from "html-to-image";
import { formatXOF, recordLabel } from "@/lib/financial-types";
import {
  byCategory,
  byParty,
  bySource,
  byPeriod,
  overallTotals,
  DISCLAIMER,
  type FinancialRecord,
  type Period,
} from "@/lib/financial-analytics";

type ExportCtx = {
  projectTitle: string;
  organizationName?: string;
  period: Period;
  records: FinancialRecord[];
  /** Type d'analyse exporté (sert au nom de fichier). */
  kind?: string;
  /** Filtres actifs, rappelés en tête du document. */
  filters?: string[];
};


function ref(): string {
  const d = new Date();
  return `MP-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const PERIOD_LABEL: Record<Period, string> = {
  day: "Journalier",
  week: "Hebdomadaire",
  month: "Mensuel",
  quarter: "Trimestriel",
  year: "Annuel",
  custom: "Personnalise",
};

/** Nom de fichier explicite : type de document + projet + périodicité + date. */
export function exportFileName(
  kind: string,
  projectTitle: string,
  period: Period,
  ext: string,
): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `MiProjet_${slug(kind)}_${slug(projectTitle)}_${PERIOD_LABEL[period]}_${stamp}.${ext}`;
}


/* ---------- Excel ---------- */
export function exportExcel(ctx: ExportCtx) {
  const wb = XLSX.utils.book_new();
  const totals = overallTotals(ctx.records);

  const summary = [
    ["Rapport financier MiProjet+"],
    ["Projet", ctx.projectTitle],
    ["Organisation", ctx.organizationName ?? "—"],
    ["Généré le", new Date().toLocaleString("fr-FR")],
    ["Référence", ref()],
    ["Filtres actifs", ctx.filters?.length ? ctx.filters.join(" · ") : "Aucun"],
    [],
    ["Entrées totales", totals.entrees],
    ["Sorties totales", totals.sorties],
    ["Solde", totals.solde],
    ["Nombre d'opérations", totals.operations],
    ["Contributeurs identifiés", totals.contributeurs],
    [],
    ["Avertissement", DISCLAIMER],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Résumé");


  const parties = byParty(ctx.records);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Contributeur", "Types", "Nb opérations", "Total (FCFA)", "% estimé"],
      ...parties.map((p) => [p.name, p.kinds.join(", "), p.count, p.total, +p.percent.toFixed(2)]),
    ]),
    "Associés & Sources",
  );

  // Détail ligne à ligne, regroupé par acteur (associé / banque / partenaire)
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Acteur", "Date", "Type", "Description", "Catégorie", "Montant"],
      ...parties.flatMap((p) =>
        p.ops.map((o) => [
          p.name,
          o.record_date,
          recordLabel(o.record_type),
          o.description ?? "",
          o.category ?? "",
          Number(o.amount),
        ]),
      ),
    ]),
    "Détail par acteur",
  );


  const inflows = ctx.records.filter((r) =>
    ["vente", "encaissement", "apport_associe", "pret", "don", "investissement"].includes(
      r.record_type,
    ),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Date", "Type", "Description", "Catégorie", "Montant"],
      ...inflows.map((r) => [
        r.record_date,
        recordLabel(r.record_type),
        r.description ?? "",
        r.category ?? "",
        Number(r.amount),
      ]),
    ]),
    "Apports",
  );

  const outflows = ctx.records.filter(
    (r) => !["vente", "encaissement", "apport_associe", "pret", "don", "investissement"].includes(
      r.record_type,
    ),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Date", "Type", "Description", "Catégorie", "Montant"],
      ...outflows.map((r) => [
        r.record_date,
        recordLabel(r.record_type),
        r.description ?? "",
        r.category ?? "",
        Number(r.amount),
      ]),
    ]),
    "Dépenses",
  );

  const cats = byCategory(ctx.records);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Catégorie", "Nb opérations", "Total (FCFA)", "% des dépenses"],
      ...cats.map((c) => [c.category, c.count, c.total, +c.percent.toFixed(2)]),
    ]),
    "Catégories",
  );

  const srcs = bySource(ctx.records);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Source de financement", "Nb opérations", "Total (FCFA)", "% des entrées"],
      ...srcs.map((s) => [s.source, s.count, s.total, +s.percent.toFixed(2)]),
    ]),
    "Sources financement",
  );

  const per = byPeriod(ctx.records, ctx.period);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["Période", "Entrées", "Sorties", "Solde", "Nb opérations"],
      ...per.map((p) => [p.label, p.in, p.out, p.balance, p.count]),
    ]),
    "Statistiques",
  );

  XLSX.writeFile(wb, exportFileName("Etat-financier", ctx.projectTitle, ctx.period, "xlsx"));
}

/* ---------- PDF ---------- */
export function exportPDF(ctx: ExportCtx) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const totals = overallTotals(ctx.records);
  const reference = ref();

  doc.setFontSize(18);
  doc.setTextColor(243, 148, 36);
  doc.text("MiPROJET+ — Rapport financier", 40, 50);
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`Projet : ${ctx.projectTitle}`, 40, 72);
  if (ctx.organizationName) doc.text(`Organisation : ${ctx.organizationName}`, 40, 88);
  doc.text(`Généré le : ${new Date().toLocaleString("fr-FR")}`, 40, 104);
  doc.text(`Référence : ${reference}`, 40, 120);

  autoTable(doc, {
    startY: 140,
    head: [["Indicateur", "Valeur"]],
    body: [
      ["Entrées totales", formatXOF(totals.entrees)],
      ["Sorties totales", formatXOF(totals.sorties)],
      ["Solde", formatXOF(totals.solde)],
      ["Opérations", String(totals.operations)],
      ["Contributeurs", String(totals.contributeurs)],
    ],
    theme: "striped",
    headStyles: { fillColor: [243, 148, 36] },
  });

  autoTable(doc, {
    head: [["Contributeur", "Types", "Nb", "Total", "% estimé"]],
    body: byParty(ctx.records).map((p) => [
      p.name,
      p.kinds.join(", "),
      p.count,
      formatXOF(p.total),
      `${p.percent.toFixed(1)} %`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [243, 148, 36] },
    styles: { fontSize: 9 },
    didDrawPage: () => {
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text("Répartition par contributeur", 40, (doc as any).lastAutoTable?.startY - 8 || 200);
    },
  });

  autoTable(doc, {
    head: [["Source", "Nb", "Total", "% entrées"]],
    body: bySource(ctx.records).map((s) => [
      s.source,
      s.count,
      formatXOF(s.total),
      `${s.percent.toFixed(1)} %`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [243, 148, 36] },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    head: [["Catégorie", "Nb", "Total", "% dépenses"]],
    body: byCategory(ctx.records).map((c) => [
      c.category,
      c.count,
      formatXOF(c.total),
      `${c.percent.toFixed(1)} %`,
    ]),
    theme: "striped",
    headStyles: { fillColor: [243, 148, 36] },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    head: [["Période", "Entrées", "Sorties", "Solde"]],
    body: byPeriod(ctx.records, ctx.period).map((p) => [
      p.label,
      formatXOF(p.in),
      formatXOF(p.out),
      formatXOF(p.balance),
    ]),
    theme: "striped",
    headStyles: { fillColor: [243, 148, 36] },
    styles: { fontSize: 9 },
  });

  // Footer sur chaque page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(DISCLAIMER, 40, 810, { maxWidth: 515 });
    doc.text(
      `MiProjet+ · Page ${i}/${pageCount} · ${new Date().toLocaleDateString("fr-FR")}`,
      40,
      828,
    );
  }

  doc.save(exportFileName("Rapport-financier", ctx.projectTitle, ctx.period, "pdf"));
}

/* ---------- PNG / Image HD ---------- */
export async function exportPNG(
  node: HTMLElement,
  projectTitle = "rapport",
  quality: "hd" | "fhd" = "fhd",
) {
  const targetWidth = quality === "fhd" ? 1920 : 1280;
  const pixelRatio = Math.max(1, Math.min(4, targetWidth / (node.offsetWidth || targetWidth)));
  const dataUrl = await toPng(node, {
    backgroundColor: "#ffffff",
    pixelRatio,
    cacheBust: true,
    skipFonts: false,
  });
  const link = document.createElement("a");
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  link.download = `MiProjet_Analyse_${slug(projectTitle)}_${quality.toUpperCase()}_${stamp}.png`;
  link.href = dataUrl;
  link.click();
}
