import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight, BarChart3, BadgeCheck, Building2, Users, FileText,
  Eye, EyeOff, TrendingUp, Rocket, HandshakeIcon, ShieldCheck,
  ExternalLink, LayoutDashboard, CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MiPROJET+ — Structurez. Pilotez. Financez votre organisation." },
      { name: "description", content: "MiPROJET+ est la plateforme de structuration, de professionnalisation et de préparation au financement pour startups, PME, coopératives et organisations en croissance." },
      { property: "og:title", content: "MiPROJET+ — Structurez, pilotez, financez" },
      { property: "og:description", content: "Transformez votre activité en organisation structurée, mesurable et finançable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <TargetSection />
      <ModulesSection />
      <EcosystemSection />
      <Footer />
    </div>
  );
}

/* ---------------- Header ---------------- */

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Logo className="h-8 sm:h-9 w-auto" />
        <div className="flex items-center gap-1 sm:gap-2">
          <a href="#cible" className="hidden md:inline-block text-sm text-muted-foreground hover:text-primary px-3 py-2">Pour qui</a>
          <a href="#modules" className="hidden md:inline-block text-sm text-muted-foreground hover:text-primary px-3 py-2">Modules</a>
          <a href="#ecosysteme" className="hidden md:inline-block text-sm text-muted-foreground hover:text-primary px-3 py-2">Écosystème</a>
          <ThemeToggle />
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="text-sm">Connexion</Button>
          </Link>
          <a href="#inscription">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Créer mon espace
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  return (
    <section className="px-4 sm:px-6 pt-10 sm:pt-16 pb-14 border-b border-border/60">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 text-primary px-3 py-1 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" /> Organisations & entreprises en croissance
          </div>
          <h1 className="mt-5 text-3xl sm:text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            Structurez votre organisation.<br />
            <span className="text-primary">Pilotez</span> votre croissance.<br />
            <span className="text-secondary">Préparez</span> votre financement.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
            MiPROJET+ est la plateforme dédiée aux startups, PME, TPE structurées, coopératives,
            associations, ONG et projets organisés. Objectif : transformer une activité prometteuse
            en organisation mesurable et finançable.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#inscription">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-6">
                Créer mon espace MiPROJET+ <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="h-12 px-6 border-primary/30 text-primary hover:bg-primary/5">
                Se connecter
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: "100", v: "Score MiPROJET+" },
              { k: "6", v: "Modules clés" },
              { k: "1", v: "Écosystème central" },
            ].map((s) => (
              <div key={s.v} className="rounded-lg border border-border bg-card p-3 text-center">
                <div className="text-2xl font-bold text-primary">{s.k}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div id="inscription">
          <AuthCard />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Auth ---------------- */

function AuthCard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { first_name: firstName.trim(), last_name: lastName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Espace MiPROJET+ créé.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue.");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
        <button
          onClick={() => setMode("signup")}
          className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${mode === "signup" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Créer mon espace
        </button>
        <button
          onClick={() => setMode("signin")}
          className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${mode === "signin" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Se connecter
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName" className="text-xs">Prénom</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1 h-11 rounded-lg" />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs">Nom</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1 h-11 rounded-lg" />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="email" className="text-xs">Email professionnel</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 h-11 rounded-lg" placeholder="vous@organisation.com" />
        </div>
        <div>
          <Label htmlFor="password" className="text-xs">Mot de passe</Label>
          <div className="relative mt-1">
            <Input id="password" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11 rounded-lg pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPwd ? "Masquer" : "Afficher"}>
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-12 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg">
          {loading ? "…" : mode === "signup" ? "Créer mon espace MiPROJET+" : "Se connecter"}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </form>
      <p className="mt-4 text-[11px] text-muted-foreground text-center">
        En créant un espace, vous rejoignez l'écosystème MiPROJET. Vos données sont sécurisées et traitées par l'équipe centrale.
      </p>
    </div>
  );
}

/* ---------------- Cible ---------------- */

function TargetSection() {
  const targets = [
    {
      icon: Rocket,
      title: "Startups",
      lines: ["Structuration & organisation", "Suivi financier", "Préparation investisseurs"],
    },
    {
      icon: TrendingUp,
      title: "PME & TPE structurées",
      lines: ["Pilotage & reporting", "Gestion interne", "Croissance mesurée"],
    },
    {
      icon: Users,
      title: "Coopératives & ONG",
      lines: ["Gouvernance", "Gestion des membres", "Documents & transparence"],
    },
  ];
  return (
    <section id="cible" className="px-4 sm:px-6 py-16 sm:py-20 bg-muted/40">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">À qui s'adresse MiPROJET+</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Une plateforme pour les organisations sérieuses</h2>
          <p className="mt-3 text-muted-foreground">
            MiPROJET+ n'est ni Go (activités terrain), ni Invest (financement).
            C'est l'espace de la structuration et de la professionnalisation.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {targets.map((t) => (
            <div key={t.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <t.icon className="w-6 h-6" />
              </div>
              <h3 className="mt-5 text-xl font-bold">{t.title}</h3>
              <ul className="mt-4 space-y-2">
                {t.lines.map((l) => (
                  <li key={l} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-secondary" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Modules ---------------- */

function ModulesSection() {
  const modules = [
    { icon: BarChart3, t: "Tableau de bord", d: "Maturité, score MiPROJET+, progression, alertes." },
    { icon: Building2, t: "Profil organisation", d: "Identité, secteur, équipe, historique, vision." },
    { icon: Users, t: "Gestion d'équipe", d: "Collaborateurs, rôles, permissions, responsabilités." },
    { icon: TrendingUp, t: "Gestion financière", d: "Recettes, dépenses, trésorerie, rapports auto." },
    { icon: FileText, t: "Espace documentaire", d: "Administratif, finance, stratégie, investissement." },
    { icon: BadgeCheck, t: "Évaluation & maturité", d: "Gouvernance, finance, marché, équipe, potentiel." },
  ];
  return (
    <section id="modules" className="px-4 sm:px-6 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold text-secondary uppercase tracking-widest">Modules</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Tout pour piloter votre organisation</h2>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <div key={m.t} className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors">
              <div className="w-11 h-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <m.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">{m.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{m.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Écosystème ---------------- */

function EcosystemSection() {
  const flow = [
    { t: "MiPROJET Go", d: "Naissance des activités terrain", tone: "muted" as const },
    { t: "MiPROJET+", d: "Structuration & croissance", tone: "primary" as const },
    { t: "MiPROJET Invest", d: "Diffusion & financement", tone: "muted" as const },
    { t: "Écosystème MiPROJET", d: "Contrôle & administration globale", tone: "secondary" as const },
  ];
  return (
    <section id="ecosysteme" className="px-4 sm:px-6 py-16 sm:py-20 bg-muted/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest">Architecture</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold">Un maillon d'un écosystème unifié</h2>
          <p className="mt-3 text-muted-foreground">
            MiPROJET+ n'a pas d'administration indépendante. Toutes les demandes, validations et
            certifications sont traitées par l'équipe centrale MiPROJET.
          </p>
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {flow.map((s, i) => (
            <div
              key={s.t}
              className={`relative rounded-xl border p-5 ${
                s.tone === "primary"
                  ? "border-primary bg-primary text-primary-foreground"
                  : s.tone === "secondary"
                    ? "border-secondary bg-secondary text-secondary-foreground"
                    : "border-border bg-card"
              }`}
            >
              <div className={`text-[10px] uppercase tracking-widest font-semibold ${s.tone === "muted" ? "text-muted-foreground" : "opacity-80"}`}>
                Étape {i + 1}
              </div>
              <div className="mt-1 font-bold text-lg">{s.t}</div>
              <div className={`mt-1 text-xs ${s.tone === "muted" ? "text-muted-foreground" : "opacity-90"}`}>{s.d}</div>
            </div>
          ))}
        </div>
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, t: "Aucune admin locale", d: "Toutes les validations passent par l'équipe centrale." },
            { icon: HandshakeIcon, t: "Passage vers Invest", d: "Publication automatique après certification." },
            { icon: Eye, t: "Confidentialité investisseurs", d: "Statistiques anonymisées, aucun contact direct." },
          ].map((i) => (
            <div key={i.t} className="rounded-xl border border-border bg-card p-5">
              <i.icon className="w-6 h-6 text-primary" />
              <div className="mt-3 font-semibold">{i.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{i.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <Logo className="h-8 w-auto" />
          <p className="mt-3 text-sm text-muted-foreground max-w-md">
            MiPROJET+ — Plateforme de structuration et de préparation au financement, membre de
            l'écosystème{" "}
            <a href="https://ivoireprojet.com" className="text-primary hover:underline">MiPROJET</a>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link to="/dashboard" className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4" /> Mon espace
          </Link>
          <a href="https://ivoireprojet.com" className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5">
            Écosystème MiPROJET <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} MiPROJET+</span>
        </div>
      </div>
    </footer>
  );
}
