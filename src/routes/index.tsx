import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowRight, BarChart3, BadgeCheck, Wallet, Users, WifiOff,
  CheckCircle2, Eye, EyeOff, TrendingUp, Menu, Mic, HeartHandshake,
  Sparkles, ShieldCheck, ExternalLink, LayoutDashboard,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MiProjet+ — Structurez, scorez, financez votre activité" },
      { name: "description", content: "Application de structuration pour micro-activités, PME et startups. MIPROJET SCORE, suivi financier, certification et mise en relation." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <MobileHero />
      <DesktopHero />
      <section id="fonctionnalites"><Features /></section>
      <section id="score"><ScoreSection /></section>
      <section id="tarifs"><Pricing /></section>
      <Footer />
    </div>
  );
}

/* ---------------- Header + Menu fintech ---------------- */

function Header() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MenuSheet />
          <Logo className="h-7 sm:h-8 w-auto" plus={false} />
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <a
            href="https://ivoireprojet.com"
            className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary px-2 py-1.5"
          >
            MIPROJET <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </header>
  );
}

function MenuSheet() {
  const items = [
    { to: "#login", icon: ShieldCheck, label: "Connexion", desc: "Accédez à votre espace" },
    { to: "#fonctionnalites", icon: Sparkles, label: "Fonctionnalités", desc: "Ce que fait MiProjet+" },
    { to: "#score", icon: BarChart3, label: "MIPROJET SCORE", desc: "Évaluation sur 100" },
    { to: "#tarifs", icon: Wallet, label: "Tarifs", desc: "Plans Découverte, Croissance…" },
  ];
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary/10"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88%] sm:w-[400px] p-0 border-r-0">
        <div className="h-full flex flex-col bg-gradient-to-br from-primary/95 via-primary to-primary/80 text-primary-foreground">
          <SheetHeader className="p-6 border-b border-primary-foreground/15">
            <SheetTitle className="text-primary-foreground flex items-center gap-3">
              <Logo className="h-8 w-auto" plus={false} />
            </SheetTitle>
            <p className="text-xs text-primary-foreground/75 mt-2">
              Plateforme inclusive de structuration et de financement
            </p>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {items.map((i) => (
              <SheetClose asChild key={i.to}>
                <a
                  href={i.to}
                  className="group flex items-start gap-4 rounded-2xl p-4 bg-primary-foreground/5 hover:bg-primary-foreground/15 transition-all border border-primary-foreground/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center group-hover:bg-primary-foreground/25 transition">
                    <i.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{i.label}</div>
                    <div className="text-xs text-primary-foreground/70 mt-0.5">{i.desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition mt-3" />
                </a>
              </SheetClose>
            ))}

            <SheetClose asChild>
              <Link
                to="/dashboard"
                className="group flex items-start gap-4 rounded-2xl p-4 bg-primary-foreground text-primary hover:bg-primary-foreground/90 transition-all mt-6"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Mon espace</div>
                  <div className="text-xs text-primary/70 mt-0.5">Tableau de bord & projets</div>
                </div>
              </Link>
            </SheetClose>
          </nav>

          <div className="p-6 border-t border-primary-foreground/15">
            <a
              href="https://ivoireprojet.com"
              className="flex items-center justify-between text-sm hover:underline"
            >
              <span>Retour à MIPROJET</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <p className="mt-3 text-[11px] text-primary-foreground/60">
              © {new Date().getFullYear()} MiProjet+
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------------- Hero mobile-first : login en plein écran ---------------- */

function MobileHero() {
  return (
    <section id="login" className="lg:hidden px-4 pt-6 pb-10">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-3 py-1 text-[11px] font-semibold">
          <Sparkles className="w-3 h-3" /> Bienvenue
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-tight">
          Connectez-vous à <span className="text-primary">MiProjet+</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Votre espace pour structurer et financer votre activité
        </p>
      </div>
      <LoginCard compact />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Besoin d'en savoir plus ? Ouvrez le <span className="font-semibold text-primary">menu</span> en haut à gauche.
      </p>
    </section>
  );
}

/* ---------------- Hero desktop : split ---------------- */

function DesktopHero() {
  return (
    <section className="hidden lg:block px-6 pt-14 pb-24">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold">
            Application de structuration
          </div>
          <h1 className="mt-6 text-5xl xl:text-6xl font-bold leading-[1.05] tracking-tight">
            Transformez votre activité en{" "}
            <span className="text-primary">entreprise finançable</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
            MiProjet+ structure vos micro-activités, PME et startups pour les rendre solvables
            et éligibles au financement.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
            {[
              { k: "100", v: "Score sur 100" },
              { k: "5", v: "Axes" },
              { k: "6", v: "Étapes" },
            ].map((s) => (
              <div key={s.v} className="rounded-xl bg-accent/60 p-4 text-center">
                <div className="text-3xl font-bold text-primary">{s.k}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div id="login-desktop">
          <LoginCard />
        </div>
      </div>
    </section>
  );
}

/* ---------------- Login card ---------------- */

function LoginCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
        toast.success("Compte créé !");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Erreur d'authentification");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-3xl border bg-card shadow-elevated ${compact ? "p-6" : "p-8 md:p-10"}`}>
      {!compact && (
        <div className="flex flex-col items-center text-center mb-6">
          <Logo className="h-10 w-auto" plus={false} />
          <h2 className="mt-4 text-2xl font-bold">
            {mode === "signin" ? "Connexion" : "Inscription"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Accédez à votre espace" : "Créez votre espace gratuit"}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3.5">
        {mode === "signup" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName" className="text-xs">Prénom</Label>
              <Input
                id="firstName" value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required className="mt-1 h-12 rounded-xl" placeholder="Votre prénom"
              />
            </div>
            <div>
              <Label htmlFor="lastName" className="text-xs">Nom</Label>
              <Input
                id="lastName" value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required className="mt-1 h-12 rounded-xl" placeholder="Votre nom"
              />
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input
            id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            required className="mt-1 h-12 rounded-xl" placeholder="votre@email.com"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-xs">Mot de passe</Label>
          <div className="relative mt-1">
            <Input
              id="password" type={showPwd ? "text" : "password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} className="h-12 rounded-xl pr-11" placeholder="••••••••"
            />
            <button
              type="button" onClick={() => setShowPwd((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Masquer" : "Afficher"}
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit" disabled={loading}
          className="w-full h-13 mt-2 bg-primary hover:bg-primary/90 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
          style={{ height: 52 }}
        >
          {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-5 w-full text-center text-sm text-primary hover:underline"
      >
        {mode === "signin" ? "Pas de compte ? Inscrivez-vous" : "Déjà inscrit ? Se connecter"}
      </button>
    </div>
  );
}

/* ---------------- Features ---------------- */

function Features() {
  const f = [
    { icon: BarChart3, t: "MIPROJET SCORE", d: "Évaluation sur 100 points" },
    { icon: TrendingUp, t: "Suivi financier", d: "Recettes, dépenses, bénéfices" },
    { icon: Mic, t: "Saisie vocale", d: "Parlez, on enregistre pour vous" },
    { icon: BadgeCheck, t: "Certification", d: "Rapports reconnus par les financeurs" },
    { icon: Users, t: "Mise en relation", d: "Banques, microfinances, investisseurs" },
    { icon: WifiOff, t: "Mode offline", d: "Utilisez l'app sans internet" },
  ];
  return (
    <div className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-center text-3xl md:text-5xl font-bold">
          Tout pour <span className="text-primary">réussir</span>
        </h2>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {f.map((i) => (
            <div key={i.t} className="rounded-2xl border bg-card p-6 hover:shadow-elevated transition-shadow">
              <div className="w-11 h-11 rounded-xl bg-accent text-primary flex items-center justify-center mb-4">
                <i.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">{i.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{i.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Score ---------------- */

function ScoreSection() {
  const axes = [
    { v: 15, t: "Juridique" },
    { v: 25, t: "Financier" },
    { v: 20, t: "Technique" },
    { v: 20, t: "Marché" },
    { v: 20, t: "Impact" },
  ];
  const levels = [
    { r: "80-100", l: "Finançable", color: "bg-primary text-primary-foreground" },
    { r: "60-79", l: "Prometteur", color: "bg-gold text-gold-foreground" },
    { r: "40-59", l: "Fragile", color: "bg-warning text-warning-foreground" },
    { r: "< 40", l: "À renforcer", color: "bg-destructive text-destructive-foreground" },
  ];
  return (
    <div className="py-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center text-3xl md:text-5xl font-bold">
          MIPROJET SCORE <span className="text-muted-foreground font-normal text-xl md:text-2xl block mt-2">Évaluation sur 100</span>
        </h2>
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {axes.map((a) => (
            <div key={a.t} className="rounded-2xl border bg-card p-5 text-center">
              <div className="text-4xl font-bold text-primary">{a.v}</div>
              <div className="mt-2 text-sm font-medium">{a.t}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {levels.map((n) => (
            <div key={n.l} className={`${n.color} rounded-xl px-3 py-3 text-center font-semibold text-sm`}>
              {n.r} : {n.l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Pricing ---------------- */

function Pricing() {
  const plans = [
    {
      name: "Découverte", price: "Gratuit",
      desc: "Pour démarrer et structurer son activité.",
      features: [
        "Saisie illimitée des opérations",
        "Tableau de bord essentiel",
        "MIPROJET SCORE",
        "Saisie vocale incluse",
        "Accompagnement humain de base",
        "1 projet",
      ],
      cta: "Commencer",
      featured: false,
    },
    {
      name: "Croissance", price: "À venir",
      desc: "Pour les PME et coopératives qui scalent.",
      features: [
        "Projets illimités",
        "Rapports certifiés PDF",
        "Accompagnement humain dédié",
        "Préparation dossier financement",
        "Saisie vocale avancée",
      ],
      cta: "Être notifié",
      featured: true,
    },
    {
      name: "Partenaire", price: "Sur devis",
      desc: "Pour institutions, banques, fonds.",
      features: [
        "Catalogue de projets finançables",
        "API & intégration",
        "Tableau de bord investisseur",
        "Accompagnement dédié",
      ],
      cta: "Nous contacter",
      featured: false,
    },
  ];
  return (
    <div className="py-20 px-4 sm:px-6 bg-muted/40">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-sm font-semibold text-primary uppercase tracking-widest">Tarifs</div>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold">Pensé pour l'inclusion</h2>
          <p className="mt-3 text-muted-foreground">
            L'usage quotidien reste gratuit. Vous ne payez que pour les services à forte valeur.
          </p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 ${
                p.featured
                  ? "bg-primary text-primary-foreground shadow-elevated md:scale-[1.02]"
                  : "bg-card border"
              }`}
            >
              <div className="text-xs uppercase tracking-widest opacity-70">{p.name}</div>
              <div className="mt-2 text-4xl font-bold">{p.price}</div>
              <p className={`mt-2 text-sm ${p.featured ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {p.desc}
              </p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.featured ? "text-primary-foreground" : "text-primary"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#login"
                onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="block mt-7"
              >
                <Button
                  className={`w-full ${p.featured ? "bg-background text-primary hover:bg-background/90" : ""}`}
                  variant={p.featured ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <Logo className="h-7 w-auto" plus={false} />
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Une application de l'écosystème{" "}
            <a href="https://ivoireprojet.com" className="text-primary hover:underline">ivoireprojet.com</a>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link to="/dashboard" className="text-muted-foreground hover:text-primary">Mon espace</Link>
          <a href="#tarifs" className="text-muted-foreground hover:text-primary">Tarifs</a>
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} MiProjet+</span>
        </div>
      </div>
    </footer>
  );
}
