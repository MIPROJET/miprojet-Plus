import { createFileRoute } from "@tanstack/react-router";

// Public cron endpoint that drains public.email_queue.
// Bascule automatique: Brevo (300/j) → Resend (100/j) via pick_email_provider().
// Auth: shared secret privé EMAIL_QUEUE_CRON_SECRET (header x-cron-secret
// ou Authorization: Bearer <secret>), comparé en temps constant.

function timingSafeEqualStr(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i]! ^ eb[i]!;
  return diff === 0;
}

const BATCH_SIZE = 25;
const FROM_ADDRESS = "MiProjet <info@ivoireprojet.com>";

type QueueRow = {
  id: string;
  to_email: string;
  subject: string;
  html: string;
  text_content: string | null;
  from_address: string | null;
  reply_to: string | null;
};

async function sendViaBrevo(row: QueueRow, apiKey: string, lovableKey: string) {
  const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: "MiProjet", email: "info@ivoireprojet.com" },
      to: [{ email: row.to_email }],
      subject: row.subject,
      htmlContent: row.html,
      textContent: row.text_content ?? undefined,
      replyTo: row.reply_to ? { email: row.reply_to } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`brevo ${res.status}: ${await res.text()}`);
}

async function sendViaResend(row: QueueRow, apiKey: string, lovableKey: string) {
  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": apiKey,
    },
    body: JSON.stringify({
      from: row.from_address ?? FROM_ADDRESS,
      to: [row.to_email],
      subject: row.subject,
      html: row.html,
      text: row.text_content ?? undefined,
      reply_to: row.reply_to ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

export const Route = createFileRoute("/api/public/hooks/process-email-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const CRON_SECRET = process.env.EMAIL_QUEUE_CRON_SECRET;
        if (!CRON_SECRET) {
          return new Response(JSON.stringify({ error: "Endpoint not configured" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        const provided =
          request.headers.get("x-cron-secret") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!provided || !timingSafeEqualStr(provided, CRON_SECRET)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const BREVO_API_KEY = process.env.BREVO_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!LOVABLE_API_KEY) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500 });
        }

        const { data: rows, error } = await supabaseAdmin
          .from("email_queue")
          .select("id,to_email,subject,html,text_content,from_address,reply_to,attempts")
          .eq("status", "pending")
          .lte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(BATCH_SIZE);

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        let sent = 0;
        let failed = 0;

        for (const r of rows ?? []) {
          // pick provider (Brevo → Resend fallback based on daily quotas)
          const { data: providerData } = await supabaseAdmin.rpc("pick_email_provider");
          const provider = (providerData as string | null) ?? null;

          if (!provider) {
            await supabaseAdmin.rpc("mark_email_failed", { _id: r.id, _error: "daily quota exceeded on all providers" });
            failed++;
            continue;
          }

          try {
            if (provider === "brevo") {
              if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY missing");
              await sendViaBrevo(r as QueueRow, BREVO_API_KEY, LOVABLE_API_KEY);
            } else {
              if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
              await sendViaResend(r as QueueRow, RESEND_API_KEY, LOVABLE_API_KEY);
            }
            await supabaseAdmin.rpc("increment_email_provider_usage", { _provider: provider });
            await supabaseAdmin.rpc("mark_email_sent", { _id: r.id, _provider: provider });
            sent++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`[email-queue] send failed for ${r.id}:`, msg);
            await supabaseAdmin.rpc("mark_email_failed", { _id: r.id, _error: msg });
            failed++;
          }
        }

        return new Response(JSON.stringify({ processed: rows?.length ?? 0, sent, failed }), {
          headers: { "Content-Type": "application/json" },
        });
      },
      GET: async () => new Response(JSON.stringify({ ok: true, hint: "POST to process queue" }), {
        headers: { "Content-Type": "application/json" },
      }),
    },
  },
});
