import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/hooks/use-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, MessageCircle, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Accompagnement · MiProjet+" }] }),
  component: SupportPage,
});

function SupportPage() {
  const { user } = Route.useRouteContext();
  const { tier, features } = usePlan(user.id);
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const ticketsQ = useQuery({
    queryKey: ["mp-tickets", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mp_support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tickets = ticketsQ.data ?? [];
  const thisMonth = tickets.filter((t) => {
    const d = new Date(t.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const quotaReached =
    features.ticketsPerMonth !== -1 && thisMonth.length >= features.ticketsPerMonth;

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mp_support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        plan_at_creation: tier,
        priority: tier === "free" ? "normal" : "high",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Demande envoyée. Nous revenons vers vous rapidement.");
      setSubject("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["mp-tickets", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Accompagnement humain</h1>
            <p className="text-muted-foreground">
              {features.humanSupport === "dedicated"
                ? "Un conseiller dédié vous accompagne — réponse prioritaire sous 24 h."
                : "Accompagnement de base : 1 demande / mois traitée sous 3 à 5 jours."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={features.humanSupport === "dedicated" ? "default" : "secondary"}>
            Plan {tier}
          </Badge>
          <Badge variant="outline">
            {features.ticketsPerMonth === -1
              ? "Tickets illimités"
              : `${thisMonth.length} / ${features.ticketsPerMonth} ce mois-ci`}
          </Badge>
          {features.humanSupport === "dedicated" && (
            <Badge className="bg-gold text-gold-foreground">
              <Sparkles className="w-3 h-3 mr-1" /> Conseiller dédié
            </Badge>
          )}
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Nouvelle demande
          </h2>

          {quotaReached ? (
            <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-accent/40 p-5 text-center">
              <p className="text-sm">
                Vous avez utilisé votre demande gratuite ce mois-ci. Passez au plan{" "}
                <strong>Croissance</strong> pour des échanges illimités avec un conseiller dédié.
              </p>
              <Link to="/" hash="pricing">
                <Button className="mt-3 bg-primary hover:bg-primary/90">Voir les plans</Button>
              </Link>
            </div>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!subject.trim() || !message.trim()) return;
                create.mutate();
              }}
            >
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex. Comment structurer mon business plan ?"
                  maxLength={120}
                  required
                />
              </div>
              <div>
                <Label htmlFor="message">Votre message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  required
                />
              </div>
              <Button type="submit" disabled={create.isPending} className="bg-primary hover:bg-primary/90">
                {create.isPending ? "Envoi…" : "Envoyer la demande"}
              </Button>
            </form>
          )}
        </section>

        <aside className="rounded-2xl gradient-hero text-primary-foreground p-6">
          <h3 className="font-semibold">Ce que comprend votre plan</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {features.humanSupport === "dedicated"
                ? "Conseiller humain dédié"
                : "Accompagnement humain de base"}
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {features.ticketsPerMonth === -1
                ? "Tickets illimités, priorité haute"
                : `${features.ticketsPerMonth} ticket(s) / mois`}
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              FAQ et ressources d'auto-formation
            </li>
          </ul>
        </aside>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Mes demandes</h2>
        {tickets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucune demande pour l'instant.</p>
        ) : (
          <ul className="mt-4 divide-y">
            {tickets.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{t.subject}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(t.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <Badge variant={t.status === "resolved" ? "default" : "secondary"} className="shrink-0">
                    {t.status === "resolved" ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> Résolu</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" /> En cours</>
                    )}
                  </Badge>
                </div>
                {t.admin_response && (
                  <p className="mt-2 text-sm bg-accent/40 rounded-lg p-3 whitespace-pre-wrap">
                    {t.admin_response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
