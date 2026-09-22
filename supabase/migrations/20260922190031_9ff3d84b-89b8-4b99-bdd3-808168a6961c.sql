REVOKE SELECT ON public.entities FROM anon, authenticated;

GRANT SELECT (
  id, slug, name, legal_form, entity_type, tagline, description,
  logo_url, cover_url, cover_url_mobile, website_url, country, city,
  sector, founded_year, team_size, socials, gallery_urls, is_public,
  mp_score, recommendation_level, created_at, updated_at
) ON public.entities TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.entities TO authenticated;
GRANT ALL ON public.entities TO service_role;

CREATE OR REPLACE FUNCTION public.get_entity_contacts(_entity_id uuid)
RETURNS TABLE(contact_email text, contact_phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.contact_email, e.contact_phone
  FROM public.entities e
  WHERE e.id = _entity_id
    AND public.is_any_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_entity_contacts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_entity_contacts(uuid) TO authenticated, service_role;