import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Connexion · MiProjet+" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
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
        toast.success("Compte créé ! Connexion en cours…");
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
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="hidden md:flex md:w-1/2 gradient-hero text-white p-12 flex-col justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm hover:text-gold">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
        <div>
          <h2 className="text-5xl font-bold leading-tight">Votre activité mérite d'être <span className="text-gradient-gold">vue, mesurée, financée.</span></h2>
          <p className="mt-6 text-white/80 text-lg max-w-md">Rejoignez la plateforme qui transforme votre quotidien en historique financier crédible.</p>
        </div>
        <div className="text-xs text-white/60">Écosystème ivoireprojet.com</div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8"><Logo className="h-8 w-auto" plus={false} /></div>
          <h1 className="text-3xl font-bold">{mode === "signin" ? "Connexion" : "Créer un compte"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Accédez à votre espace MiProjet+." : "Commencez gratuitement, en quelques secondes."}
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1.5" />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 h-11">
              {loading ? "…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-6 text-sm text-muted-foreground hover:text-primary">
            {mode === "signin" ? "Pas encore de compte ? Inscrivez-vous" : "Déjà inscrit ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
