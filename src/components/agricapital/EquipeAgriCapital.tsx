import equipeImg from "@/assets/agricapital/equipe-agricapital.png.asset.json";

type Member = {
  name: string;
  role: string;
  bio: string;
  external?: string;
};

export const AGRICAPITAL_TEAM: Member[] = [
  {
    name: "Inocent KOFFI",
    role: "Fondateur & Directeur Général",
    bio: "Entrepreneur et stratège, Inocent assure la vision globale d'AgriCapital, la conception du modèle économique et la coordination de l'ensemble du déploiement.",
  },
  {
    name: "Éric Stéphane DIDO",
    role: "Chargé du Développement Commercial",
    bio: "Contribution à la préparation du dispositif commercial, au déploiement des activités et au développement du portefeuille de clients.",
  },
  {
    name: "Koffi Pierre KOUAMÉ",
    role: "Conseiller Stratégique",
    bio: "Plus de 10 ans d'expérience en gouvernance organisationnelle. Accompagne AgriCapital sur les questions institutionnelles, la gouvernance et la sécurisation foncière.",
  },
  {
    name: "Cabinet Legal Form",
    role: "Expertise Juridique",
    bio: "Appui à la structuration juridique du projet, sécurisation contractuelle des relations clients et propriétaires fonciers.",
    external: "Cabinet partenaire",
  },
  {
    name: "Dr Marcel KONAN",
    role: "Structuration & Stratégie de Projet — MiProjet",
    bio: "Expert en évaluation et structuration de projets. Appui à l'optimisation du modèle économique et à la cohérence organisationnelle.",
    external: "MiProjet",
  },
  {
    name: "Kouamé Mathieu ANGA",
    role: "Agronomie & Suivi des Plantations",
    bio: "Ingénieur agronome. Appui technique sur les itinéraires culturaux et le suivi du développement des plantations de palmier à huile.",
  },
  {
    name: "Cabinet GESMA SARL",
    role: "Expertise Comptable & Fiscale",
    bio: "Appui à la structuration comptable et fiscale, mise en place des dispositifs de gestion et suivi des obligations.",
    external: "Cabinet partenaire",
  },
];

export function EquipeAgriCapital() {
  return (
    <section className="container mx-auto px-4 py-12">
      <header className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-bold md:text-3xl">
          Autour d'AgriCapital — les expertises qui accompagnent la structuration du projet
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Équipe en cours de constitution — AgriCapital constitue progressivement ses équipes
          commerciales et techniques terrain.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border bg-card shadow-xl">
        <img
          src={equipeImg.url}
          alt="Équipe AgriCapital"
          className="h-auto w-full"
          loading="lazy"
        />
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {AGRICAPITAL_TEAM.map((m) => (
          <article
            key={m.name}
            className="rounded-2xl border bg-card p-5 shadow-sm transition hover:shadow-md"
          >
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm font-medium text-primary">{m.role}</p>
            {m.external && (
              <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {m.external}
              </span>
            )}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.bio}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
