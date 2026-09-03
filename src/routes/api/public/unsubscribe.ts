import { createFileRoute } from '@tanstack/react-router'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || ''

  const html = (title: string, body: string) => new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title} · MiProjet</title>
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#1d1d1f;margin:0;padding:64px 16px;display:flex;justify-content:center}
     .card{background:#fff;padding:40px;border-radius:16px;max-width:520px;box-shadow:0 2px 8px rgba(0,0,0,.05)}
     h1{margin:0 0 12px;font-size:20px}p{margin:0;color:#333;line-height:1.6}
     a{color:#0a0a0a}</style></head>
     <body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )

  if (!token) return html('Lien invalide', 'Le lien de désinscription est incomplet.')

  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data, error } = await supabaseAdmin.rpc('unsubscribe_by_token', { _token: token })

  if (error || !data || !(data as any).ok) {
    return html('Lien invalide', 'Ce lien de désinscription est invalide ou expiré.')
  }
  const email = (data as any).email as string
  return html(
    'Désinscription confirmée',
    `L'adresse <strong>${email}</strong> ne recevra plus d'emails de MiProjet. Vous pouvez réactiver les notifications depuis votre espace personnel à tout moment.`,
  )
}

export const Route = createFileRoute('/api/public/unsubscribe')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
})
