import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { verifyCertificate, regenerateCertificatePdf } from "@/lib/certificates.functions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Download, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/certificat/$shortId")({
  head: ({ params }) => ({
    meta: [
      { title: `Certificat ${params.shortId} · MiProjet+` },
      { name: "description", content: "Vérifiez l'authenticité d'un certificat MiProjet+." },
    ],
  }),
  component: CertificatePage,
});

function CertificatePage() {
  const { shortId } = Route.useParams();
  const verify = useServerFn(verifyCertificate);
  const regen = useServerFn(regenerateCertificatePdf);

  const q = useQuery({
    queryKey: ["certificate", shortId],
    queryFn: () => verify({ data: { shortId } }),
  });

  const dlM = useMutation({
    mutationFn: async () => {
      const r = await regen({ data: { shortId } });
      const blob = new Blob(
        [Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0))],
        { type: "application/pdf" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificat-${shortId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  if (q.isLoading) {
    return <div className="mx-auto max-w-2xl p-10 text-center text-muted-foreground">Vérification…</div>;
  }

  const cert = q.data;

  if (!cert || cert.valid === undefined || !("payload" in cert)) {
    return (
      <div className="mx-auto max-w-2xl p-6 sm:p-10 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Certificat introuvable</h1>
        <p className="mt-2 text-muted-foreground">L'identifiant <code className="font-mono">{shortId}</code> ne correspond à aucun certificat émis.</p>
        <Link to="/"><Button variant="outline" className="mt-6">Retour à l'accueil</Button></Link>
      </div>
    );
  }

  const p = cert.payload as any;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
      <div className={`rounded-2xl border p-5 sm:p-6 flex items-start gap-4 ${cert.valid ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
        {cert.valid ? <CheckCircle2 className="w-8 h-8 text-success shrink-0" /> : <XCircle className="w-8 h-8 text-destructive shrink-0" />}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">
            {cert.valid ? "Certificat authentique" : "Signature invalide"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {cert.valid
              ? "L'empreinte SHA-256 du contenu correspond à celle enregistrée lors de l'émission."
              : "Le contenu ne correspond pas à la signature stockée. Ne pas faire confiance à ce document."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="w-4 h-4" /> Identifiant&nbsp;: <span className="font-mono text-foreground">{cert.shortId}</span>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Projet</div>
          <div className="text-lg font-semibold">{p?.projectTitle}</div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Score global" value={`${p?.score?.score_global}/100`} />
          <Field label="Niveau" value={p?.score?.niveau} />
          <Field label="Titulaire" value={p?.ownerName} />
          <Field label="Émis le" value={new Date(cert.certifiedAt ?? p?.issuedAt).toLocaleDateString("fr-FR")} />
        </div>
        <div className="pt-2 border-t">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Empreinte SHA-256</div>
          <code className="text-[11px] break-all block font-mono text-muted-foreground">{cert.contentHash}</code>
        </div>
        <Button onClick={() => dlM.mutate()} disabled={dlM.isPending} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" /> {dlM.isPending ? "Génération…" : "Télécharger le PDF"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium break-words">{value}</div>
    </div>
  );
}
