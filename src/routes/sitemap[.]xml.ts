import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://project-ivoire-shine.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls: { loc: string; lastmod?: string; priority: string }[] = [
          { loc: `${SITE}/`, priority: "1.0" },
          { loc: `${SITE}/auth`, priority: "0.4" },
        ];

        try {
          const url = process.env["SUPABASE_URL"];
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
          if (url && key) {
            const { createClient } = await import("@supabase/supabase-js");
            const supa = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data } = await supa
              .from("mp_projects")
              .select("id, display_id, updated_at")
              .eq("is_public", true)
              .limit(500);
            for (const p of (data ?? []) as Array<{
              id: string;
              display_id: string | null;
              updated_at: string | null;
            }>) {
              urls.push({
                loc: `${SITE}/projets/${p.display_id ?? p.id}`,
                lastmod: p.updated_at ?? undefined,
                priority: "0.8",
              });
            }
          }
        } catch {
          /* sitemap must never fail */
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}<priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
