
-- 1) Public flag on projects
ALTER TABLE public.mp_projects
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS mp_projects_is_public_idx ON public.mp_projects (is_public) WHERE is_public = true;

-- 2) Public read policy (anyone can read projects flagged public)
GRANT SELECT ON public.mp_projects TO anon;

DROP POLICY IF EXISTS "Public can view public mp_projects" ON public.mp_projects;
CREATE POLICY "Public can view public mp_projects"
  ON public.mp_projects FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- 3) Public read policy on project media for public projects
GRANT SELECT ON public.mp_project_media TO anon;

DROP POLICY IF EXISTS "Public can view media of public projects" ON public.mp_project_media;
CREATE POLICY "Public can view media of public projects"
  ON public.mp_project_media FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_projects p
      WHERE p.id = mp_project_media.project_id
        AND p.is_public = true
    )
  );

-- 4) Attachments column on support tickets
ALTER TABLE public.mp_support_tickets
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
