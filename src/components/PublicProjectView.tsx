import { SmartImage } from "@/components/SmartImage";
import type { PublicProject } from "@/lib/public-project.functions";
import { Briefcase, MapPin, Calendar, ShieldCheck, Sparkles, Target, TrendingUp, Users } from "lucide-react";

const MATURITE_LABELS: Record<string, { label: string; color: string }> = {
  idee: { label: "Idée", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  en_developpement: { label: "En développement", color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  actif: { label: "Activité en cours", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  structure: { label: "Structuré", color: "bg-primary/10 text-primary border-primary/30" },
};

/**
 * Présentation publique d'un projet — pensée comme une vitrine professionnelle.
 * AUCUNE donnée sensible (chiffres financiers, prix, offres) n'est exposée.
 */
export function PublicProjectView({ project }: { project: PublicProject }) {
  const year = project.creation_date ? new Date(project.creation_date).getFullYear() : null;
  const tagline =
    project.short_pitch?.trim() ||
    project.description?.trim()?.split(/[.!?]/)[0] ||
    `${project.title} — une activité accompagnée par MiProjet+.`;

  const advantages = [
    project.sector && { icon: Briefcase, label: "Secteur", value: project.sector },
    (project.city || project.country) && {
      icon: MapPin,
      label: "Implantation",
      value: [project.city, project.country].filter(Boolean).join(" · "),
    },
    year && { icon: Calendar, label: "Année de création", value: String(year) },
    project.legal_status && { icon: ShieldCheck, label: "Statut", value: project.legal_status },
  ].filter(Boolean) as { icon: typeof Briefcase; label: string; value: string }[];

  return (
    <article className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative isolate overflow-hidden border-b">
        {project.cover_url && (
          <div className="absolute inset-0 -z-10">
            <SmartImage src={project.cover_url} alt="" className="h-full w-full opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
          </div>
        )}
        <div className="container mx-auto grid gap-10 px-4 py-14 md:grid-cols-[auto,1fr] md:items-center md:py-20">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border bg-card shadow-xl md:h-32 md:w-32">
            <SmartImage
              src={project.logo_url}
              alt={`Logo ${project.title}`}
              fallbackText={project.title}
              rounded="rounded-2xl"
            />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Projet certifié MiProjet+
            </div>
            <h1 className="mt-4 break-words text-3xl font-bold tracking-tight md:text-5xl">
              {project.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground md:text-xl">{tagline}</p>
            {advantages.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {advantages.map((a) => (
                  <span
                    key={a.label}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium"
                  >
                    <a.icon className="h-3.5 w-3.5 text-primary" /> {a.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* COVER */}
      {project.cover_url && (
        <section className="container mx-auto px-4 py-10">
          <div className="overflow-hidden rounded-3xl border shadow-xl">
            <SmartImage
              src={project.cover_url}
              alt={`Visuel principal — ${project.title}`}
              className="aspect-[21/9] w-full"
            />
          </div>
        </section>
      )}

      {/* À PROPOS */}
      {(project.description || project.product_description) && (
        <section className="container mx-auto px-4 py-12">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold md:text-3xl">À propos de l'activité</h2>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
              {project.description && <p className="whitespace-pre-line">{project.description}</p>}
              {project.product_description && (
                <p className="whitespace-pre-line">{project.product_description}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* MODÈLE & CIBLE */}
      {(project.target_customers || project.commercialization) && (
        <section className="bg-muted/30 py-12">
          <div className="container mx-auto grid gap-6 px-4 md:grid-cols-2">
            {project.target_customers && (
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Notre clientèle</h3>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {project.target_customers}
                </p>
              </div>
            )}
            {project.commercialization && (
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Notre approche</h3>
                <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                  {project.commercialization}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* VIDÉO */}
      {project.video_url && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Le projet en images</h2>
          <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-2xl border bg-black shadow-xl">
            <video src={project.video_url} controls className="aspect-video w-full" />
          </div>
        </section>
      )}

      {/* GALERIE */}
      {project.gallery.length > 0 && (
        <section className="bg-muted/30 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold md:text-3xl">Galerie terrain</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {project.gallery.length} photo{project.gallery.length > 1 ? "s" : ""} authentiques de l'activité
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {project.gallery.map((g, i) => (
                <div
                  key={i}
                  className="group aspect-square overflow-hidden rounded-xl border bg-muted shadow-sm transition hover:shadow-lg"
                >
                  <SmartImage
                    src={g.url}
                    alt={g.caption ?? `${project.title} — photo ${i + 1}`}
                    className="h-full w-full transition group-hover:scale-[1.03]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section className="container mx-auto px-4 py-16">
        <div className="rounded-3xl border bg-gradient-to-br from-primary to-primary/70 p-8 text-primary-foreground shadow-xl md:p-12">
          <h2 className="text-2xl font-bold md:text-3xl">Intéressé par ce projet ?</h2>
          <p className="mt-2 max-w-2xl text-primary-foreground/90">
            Toutes les informations confidentielles (modèle économique détaillé, données financières,
            offres commerciales) sont disponibles sur demande auprès du porteur via MiProjet+.
          </p>
          <a
            href="mailto:contact@miprojet.ci"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-background/90"
          >
            Demander une mise en relation
          </a>
        </div>
      </section>

      <footer className="border-t bg-card py-6 text-center text-xs text-muted-foreground">
        {project.display_id && <span className="font-mono">{project.display_id} · </span>}
        Vitrine publiée via MiProjet+
      </footer>
    </article>
  );
}
