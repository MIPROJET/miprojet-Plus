REVOKE SELECT ON public.entities FROM anon, authenticated;

GRANT SELECT (
  id, slug, name, legal_form, entity_type, tagline, description,
  logo_url, cover_url, cover_url_mobile, website_url, country, city,
  sector, founded_year, team_size, socials, gallery_urls, is_public,
  mp_score, recommendation_level, created_at, updated_at
) ON public.entities TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;