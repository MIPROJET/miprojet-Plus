
-- 1. mp_certifications: remove overexposed public SELECT, add safe verification function
DROP POLICY IF EXISTS "Public can verify issued certificates" ON public.mp_certifications;

CREATE OR REPLACE FUNCTION public.verify_certificate_public(_short_id text)
RETURNS TABLE(short_id text, content_hash text, certified_at timestamptz, signed_payload jsonb, status text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.short_id, c.content_hash, c.certified_at, c.signed_payload, c.status
  FROM public.mp_certifications c
  WHERE c.short_id = _short_id
    AND c.status = 'issued'
    AND c.short_id IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_certificate_public(text) TO anon, authenticated;

-- 2. platform_settings: consolidate admin checks with has_role()
DROP POLICY IF EXISTS "Settings are viewable by admins" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.platform_settings;

CREATE POLICY "Admins can view settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.platform_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.platform_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete settings" ON public.platform_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. project_team: restrict public SELECT to published + public projects
DROP POLICY IF EXISTS "Anyone can view public project team" ON public.project_team;

CREATE POLICY "Anyone can view public project team" ON public.project_team
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team.project_id
        AND p.status = 'published'
        AND COALESCE(p.is_public, false) = true
    )
  );

-- Owner/admin read access retained via existing/additional policies
CREATE POLICY "Owners can view own project team" ON public.project_team
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_team.project_id
        AND (p.owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- 4. email_events: explicitly revoke write privileges from anon/authenticated (service role bypasses RLS)
REVOKE INSERT, UPDATE, DELETE ON public.email_events FROM anon, authenticated;
