import { createFileRoute } from "@tanstack/react-router";

const BODY = `User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /projets
Disallow: /finances
Disallow: /documents
Disallow: /organisation
Disallow: /support
Disallow: /accompagnement
Disallow: /evaluation
Disallow: /score
Disallow: /coherence
Disallow: /mcp

Sitemap: https://project-ivoire-shine.lovable.app/sitemap.xml
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(BODY, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        }),
    },
  },
});
