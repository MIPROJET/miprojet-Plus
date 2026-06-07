import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAgriCapitalPartition } from "@/lib/agricapital-public.functions";
import logoAsset from "@/assets/agricapital/agricapital-logo.png.asset.json";
import posterAsset from "@/assets/agricapital/agricapital-poster.jpg.asset.json";
import flyerVerso from "@/assets/agricapital/agricapital-flyer-verso.png.asset.json";
import flyerRecto from "@/assets/agricapital/agricapital-flyer-recto.png.asset.json";
import flyerExclusif from "@/assets/agricapital/agricapital-flyer-exclusif.png.asset.json";
import palmierAsset from "@/assets/agricapital/agricapital-palmier.png.asset.json";
import { formatXOF, recordLabel, recordFlow } from "@/lib/financial-types";
import { CheckCircle2, Phone, Mail, Globe, MapPin, ArrowUpRight, ArrowDownRight } from "lucide-react";

type SlugData = { slug: string; isAgriCapital: boolean };

export const Route = createFileRoute("/projets/$slug")({
  loader: ({ params }) => {
    if (params.slug !== "agricapital") throw notFound();
    return { slug: params.slug, isAgriCapital: true } satisfies SlugData;
  },
  head: ({ params }) => ({
    meta: [
      { title: "AgriCapital — Investir la terre. Cultiver l'avenir." },
      { name: "description", content: "AgriCapital SARL : plantations de palmier à huile clé en main en Côte d'Ivoire. Offres PalmInvest & TerraPalm, paiement sur 34 mois." },
      { property: "og:title", content: "AgriCapital — Plantations de palmier à huile clé en main" },
      { property: "og:description", content: "Bâtissons ensemble votre patrimoine agricole durable. RCCM CI-DAL-01-2025-B12-13435." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `/projets/${params.slug}` },
      { property: "og:image", content: posterAsset.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: posterAsset.url },
    ],
    links: [{ rel: "canonical", href: `/projets/${params.slug}` }],
  }),
  component: AgriCapitalPage,
});

const OFFERS = [
  { name: "PalmInvest", desc: "Plantation clé en main, sans terre préalable, remise après 36 mois — propriété 28 ans.", base: "5 587 600", promo: "4 190 700", exclusive: "3 631 940" },
  { name: "PalmInvest+", desc: "Gestion intégrale déléguée — 75 % des revenus reversés.", base: "5 587 600", promo: "4 190 700", exclusive: "3 631 940" },
  { name: "TerraPalm", desc: "Vous avez la terre, nous en faisons une plantation productive en 36 mois — 100 % propriété.", base: "3 459 600", promo: "2 594 700", exclusive: "2 242 890" },
  { name: "TerraPalm+", desc: "Vous avez la terre, gestion intégrale déléguée — 75 % des revenus reversés.", base: "3 459 600", promo: "2 594 700", exclusive: "2 242 890" },
];

const ASSETS_BREAKDOWN = [
  { label: "Actifs juridiques & institutionnels", value: 5_500_000 },
  { label: "Actifs numériques & technologiques", value: 2_850_000 },
  { label: "Actifs agricoles & opérationnels", value: 16_500_000 },
  { label: "Actifs fonciers & territoriaux", value: 7_500_000 },
  { label: "Actifs commerciaux & communication", value: 2_300_000 },
  { label: "Actifs stratégiques & immatériels", value: 23_000_000 },
  { label: "Ressources mobilisées & capital relationnel", value: 15_500_000 },
];

function AgriCapitalPage() {
  const fetchPartition = useServerFn(getAgriCapitalPartition);
  const partitionQ = useQuery({
    queryKey: ["agricapital-partition"],
    queryFn: () => fetchPartition(),
  });
  const totalActifs = ASSETS_BREAKDOWN.reduce((s, a) => s + a.value, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← MiProjet+</Link>
          <a href="https://www.agricapital.ci" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
            agricapital.ci ↗
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-background to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/20">
        <div className="container mx-auto grid gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
          <div>
            <img src={logoAsset.url} alt="Logo AgriCapital" className="h-16 w-auto md:h-20" />
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Investir la terre.<br />
              <span className="text-emerald-700 dark:text-emerald-400">Cultiver l'avenir.</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Plantations de palmier à huile clé en main — payables sur 34 mois.
              Bâtissons ensemble votre patrimoine agricole durable.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400">
                RCCM CI-DAL-01-2025-B12-13435
              </span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-medium text-amber-700 dark:text-amber-400">
                Capital 5 000 000 FCFA
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground">
                Daloa — Côte d'Ivoire
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="tel:+22505645517 17" className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                <Phone className="h-4 w-4" /> 05 64 55 17 17
              </a>
              <a href="mailto:contact@agricapital.ci" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent">
                <Mail className="h-4 w-4" /> Nous écrire
              </a>
            </div>
          </div>
          <div className="relative">
            <img
              src={posterAsset.url}
              alt="Plantation de palmier à huile clé en main avec AgriCapital"
              className="w-full rounded-2xl border border-border shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Offres */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground">Choisissez l'offre qui vous convient</h2>
          <p className="mt-2 text-muted-foreground">Paiement échelonné sur 34 mois · Promotion lancement -25 % jusqu'au 30 juin 2026</p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OFFERS.map((o) => (
            <div key={o.name} className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md">
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{o.name}</div>
              <p className="mt-2 min-h-[64px] text-xs text-muted-foreground">{o.desc}</p>
              <div className="mt-4 space-y-1 text-sm">
                <div className="text-muted-foreground line-through">{o.base} F/ha</div>
                <div className="font-bold text-foreground">{o.promo} F/ha <span className="text-xs font-normal text-emerald-600">-25 %</span></div>
                <div className="text-xs text-amber-700 dark:text-amber-400">Exclusive {o.exclusive} F/ha (-35 %)</div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> Plantation clé en main</li>
                <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> Suivi technique offert</li>
                <li className="flex gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" /> Garantie d'écoulement</li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Flyers gallery */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">Supports commerciaux</h2>
          <p className="mt-2 text-center text-muted-foreground">Flyers officiels AgriCapital — V2</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { src: flyerVerso.url, label: "Vision — Patrimoine agricole durable" },
              { src: flyerRecto.url, label: "Promo lancement -25 %" },
              { src: flyerExclusif.url, label: "Exclusive -35 % · Premiers clients privilégiés" },
            ].map((f) => (
              <a key={f.src} href={f.src} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-lg">
                <img src={f.src} alt={f.label} loading="lazy" className="aspect-[3/4] w-full object-cover transition group-hover:scale-[1.02]" />
                <div className="p-3 text-xs font-medium text-foreground">{f.label}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Valorisation */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <img src={palmierAsset.url} alt="Palmier à huile en production" className="rounded-2xl border border-border shadow-lg" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">État des lieux 2026</h2>
            <p className="mt-2 text-muted-foreground">
              Valorisation préliminaire totale des actifs développés depuis 2020 — phase
              de déploiement commercial et opérationnel.
            </p>
            <div className="mt-6 rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-5">
              <div className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Valorisation totale estimée</div>
              <div className="mt-1 text-4xl font-bold text-foreground">{formatXOF(totalActifs)}</div>
              <div className="mt-1 text-xs text-muted-foreground">7 catégories d'actifs · arrêté au 30 mai 2026</div>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {ASSETS_BREAKDOWN.map((a) => (
                <li key={a.label} className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">{a.label}</span>
                  <span className="font-semibold text-foreground tabular-nums">{formatXOF(a.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Partition financière live */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground">Partition financière — journal des opérations</h2>
          <p className="mt-2 text-muted-foreground">Synchronisé depuis MiProjet+ · contrôle de cohérence automatique</p>

          {partitionQ.isLoading && <div className="mt-6 text-sm text-muted-foreground">Chargement…</div>}
          {partitionQ.data && (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-600/30 bg-emerald-600/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" /> Entrées
                  </div>
                  <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatXOF(partitionQ.data.entrees)}</div>
                </div>
                <div className="rounded-xl border border-red-600/30 bg-red-600/5 p-5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ArrowDownRight className="h-4 w-4 text-red-600" /> Sorties
                  </div>
                  <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-400 tabular-nums">{formatXOF(partitionQ.data.sorties)}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="text-sm text-muted-foreground">Solde · {partitionQ.data.nbOperations} opérations</div>
                  <div className="mt-1 text-2xl font-bold text-foreground tabular-nums">{formatXOF(partitionQ.data.solde)}</div>
                  {partitionQ.data.solde === 0 && (
                    <div className="mt-1 text-xs font-medium text-emerald-600">✓ Équilibre vérifié</div>
                  )}
                </div>
              </div>
              <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partitionQ.data.records.map((r, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.record_date}</td>
                        <td className="px-3 py-2">{recordLabel(r.record_type)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.description}</td>
                        <td className={`px-3 py-2 text-right font-medium tabular-nums ${recordFlow(r.record_type) === "in" ? "text-emerald-600" : "text-red-600"}`}>
                          {recordFlow(r.record_type) === "in" ? "+" : "−"}{formatXOF(Number(r.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-border/50 px-3 py-2 text-center text-xs text-muted-foreground">
                  Aperçu des 25 premières opérations · {partitionQ.data.nbOperations} au total
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-emerald-700 to-emerald-900 p-8 text-white md:p-12">
          <h2 className="text-3xl font-bold">Devenez planteur avec AgriCapital</h2>
          <p className="mt-2 text-emerald-50">Contactez-nous pour réserver votre hectare ou obtenir le dossier complet.</p>
          <div className="mt-6 grid gap-4 text-sm md:grid-cols-3">
            <a href="tel:+2250564551717" className="flex items-center gap-3 rounded-lg bg-white/10 p-4 hover:bg-white/20">
              <Phone className="h-5 w-5" />
              <div><div className="font-semibold">05 64 55 17 17</div><div className="text-xs text-emerald-100">07 59 56 60 87</div></div>
            </a>
            <a href="mailto:contact@agricapital.ci" className="flex items-center gap-3 rounded-lg bg-white/10 p-4 hover:bg-white/20">
              <Mail className="h-5 w-5" />
              <div className="font-semibold">contact@agricapital.ci</div>
            </a>
            <a href="https://www.agricapital.ci" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg bg-white/10 p-4 hover:bg-white/20">
              <Globe className="h-5 w-5" />
              <div className="font-semibold">www.agricapital.ci</div>
            </a>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs text-emerald-100">
            <MapPin className="h-3.5 w-3.5" /> Daloa — Gonaté, Qr. Belleville, Lot 1814, Îlot 230 — Haut-Sassandra, Côte d'Ivoire
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card py-6 text-center text-xs text-muted-foreground">
        AgriCapital SARL · RCCM CI-DAL-01-2025-B12-13435 · Promotion Agricole & Services Intégrés
        <div className="mt-1">Vitrine publiée via MiProjet+</div>
      </footer>
    </div>
  );
}