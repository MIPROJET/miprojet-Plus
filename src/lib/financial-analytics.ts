import { recordFlow, recordLabel } from "@/lib/financial-types";

export type FinancialRecord = {
  id: string;
  project_id: string;
  record_type: string;
  amount: number | string;
  record_date: string;
  description?: string | null;
  category?: string | null;
  currency?: string | null;
  party_name?: string | null;
  stakeholder_id?: string | null;
};

export type Period = "day" | "week" | "month" | "quarter" | "year" | "custom";

/** Extrait le nom de la source (associé/banque/partenaire) depuis la description
 *  au format « ... — Source : Nom » utilisé par le formulaire de saisie. */
export function extractPartyName(desc?: string | null): string | null {
  if (!desc) return null;
  const m = desc.match(/Source\s*:\s*([^—\n]+)/i);
  return m ? m[1].trim() : null;
}

const IN_SOURCES: Record<string, string> = {
  apport_associe: "Associés",
  investissement: "Investisseurs",
  don: "Dons / Subventions",
  pret: "Prêts / Banque",
  vente: "Ventes / Clients",
  encaissement: "Encaissements",
};

export function financingSource(r: FinancialRecord): string {
  return IN_SOURCES[r.record_type] ?? "Autres entrées";
}

/** Clé de fusion insensible à la casse, aux accents et aux espaces multiples. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Regroupe les entrées par contributeur nommé (associé / banque / partenaire).
 *  Les lignes sans acteur explicite sont regroupées sous « Non attribué ». */
export function byParty(records: FinancialRecord[]) {
  const inflows = records.filter((r) => recordFlow(r.record_type) === "in");
  const totalIn = inflows.reduce((s, r) => s + Number(r.amount), 0);

  const merged = new Map<
    string,
    { name: string; total: number; count: number; ops: FinancialRecord[]; kinds: Set<string> }
  >();

  for (const r of inflows) {
    const raw =
      (r.party_name && r.party_name.trim()) || extractPartyName(r.description) || "Non attribué";
    const key = normalizeName(raw);
    const g = merged.get(key) ?? {
      name: raw.toUpperCase() === raw ? raw : raw,
      total: 0,
      count: 0,
      ops: [],
      kinds: new Set<string>(),
    };
    g.total += Number(r.amount);
    g.count += 1;
    g.ops.push(r);
    g.kinds.add(recordLabel(r.record_type));
    merged.set(key, g);
  }

  return Array.from(merged.values())
    .map((g) => ({
      name: g.name,
      total: g.total,
      count: g.count,
      percent: totalIn > 0 ? (g.total / totalIn) * 100 : 0,
      kinds: Array.from(g.kinds),
      ops: g.ops.sort((a, b) => (a.record_date < b.record_date ? 1 : -1)),
    }))
    .sort((a, b) => b.total - a.total);
}


export function byCategory(records: FinancialRecord[]) {
  const outflows = records.filter((r) => recordFlow(r.record_type) === "out");
  const totalOut = outflows.reduce((s, r) => s + Number(r.amount), 0);
  const map = new Map<string, { total: number; count: number; ops: FinancialRecord[] }>();
  for (const r of outflows) {
    const cat = r.category?.trim() || "Non classé";
    const g = map.get(cat) ?? { total: 0, count: 0, ops: [] };
    g.total += Number(r.amount);
    g.count += 1;
    g.ops.push(r);
    map.set(cat, g);
  }
  return Array.from(map.entries())
    .map(([category, g]) => ({
      category,
      total: g.total,
      count: g.count,
      percent: totalOut > 0 ? (g.total / totalOut) * 100 : 0,
      ops: g.ops,
    }))
    .sort((a, b) => b.total - a.total);
}

export function bySource(records: FinancialRecord[]) {
  const inflows = records.filter((r) => recordFlow(r.record_type) === "in");
  const total = inflows.reduce((s, r) => s + Number(r.amount), 0);
  const map = new Map<string, { total: number; count: number }>();
  for (const r of inflows) {
    const src = financingSource(r);
    const g = map.get(src) ?? { total: 0, count: 0 };
    g.total += Number(r.amount);
    g.count += 1;
    map.set(src, g);
  }
  return Array.from(map.entries())
    .map(([source, g]) => ({
      source,
      total: g.total,
      count: g.count,
      percent: total > 0 ? (g.total / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

function periodKey(date: string, period: Period): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  switch (period) {
    case "day":
      return date.slice(0, 10);
    case "week": {
      const tmp = new Date(d);
      tmp.setDate(tmp.getDate() - ((tmp.getDay() + 6) % 7));
      return tmp.toISOString().slice(0, 10);
    }
    case "month":
      return `${y}-${String(m).padStart(2, "0")}`;
    case "quarter":
      return `${y}-T${Math.ceil(m / 3)}`;
    case "year":
      return `${y}`;
    default:
      return date.slice(0, 10);
  }
}

export function byPeriod(records: FinancialRecord[], period: Period) {
  const map = new Map<string, { in: number; out: number; count: number }>();
  for (const r of records) {
    const k = periodKey(r.record_date, period);
    const g = map.get(k) ?? { in: 0, out: 0, count: 0 };
    if (recordFlow(r.record_type) === "in") g.in += Number(r.amount);
    else g.out += Number(r.amount);
    g.count += 1;
    map.set(k, g);
  }
  return Array.from(map.entries())
    .map(([label, g]) => ({ label, ...g, balance: g.in - g.out }))
    .sort((a, b) => (a.label < b.label ? -1 : 1));
}

export function overallTotals(records: FinancialRecord[]) {
  const inflows = records.filter((r) => recordFlow(r.record_type) === "in");
  const outflows = records.filter((r) => recordFlow(r.record_type) === "out");
  const inSum = inflows.reduce((s, r) => s + Number(r.amount), 0);
  const outSum = outflows.reduce((s, r) => s + Number(r.amount), 0);
  return {
    entrees: inSum,
    sorties: outSum,
    solde: inSum - outSum,
    operations: records.length,
    contributeurs: byParty(records).length,
  };
}

export const DISCLAIMER =
  "Les pourcentages affichés sont des estimations calculées à partir des données enregistrées dans le projet. Ils peuvent évoluer selon les mises à jour, valorisations, régularisations ou décisions juridiques ultérieures. Ils ne constituent pas la répartition définitive du capital social de l'organisation.";
