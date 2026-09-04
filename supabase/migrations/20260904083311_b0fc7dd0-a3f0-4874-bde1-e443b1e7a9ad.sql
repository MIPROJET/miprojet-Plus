CREATE OR REPLACE FUNCTION public.mp_can_write_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mp_projects p
    WHERE p.id = _project_id
      AND p.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.mp_can_write_project(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mp_can_write_project(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can insert own pending certifications" ON public.mp_certifications;
CREATE POLICY "Users can insert own pending certifications"
ON public.mp_certifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND COALESCE(status, 'pending') = 'pending'
  AND certified_at IS NULL
  AND public.mp_can_write_project(project_id)
  AND (
    scoring_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.mp_scoring_results s
      WHERE s.id = scoring_id AND s.project_id = mp_certifications.project_id
    )
  )
);

DROP POLICY IF EXISTS "Users can insert own financial_records" ON public.mp_financial_records;
CREATE POLICY "Users can insert own financial_records"
ON public.mp_financial_records FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.mp_can_write_project(project_id));

DROP POLICY IF EXISTS "Users can insert own scoring" ON public.mp_scoring_results;
CREATE POLICY "Users can insert own scoring"
ON public.mp_scoring_results FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.mp_can_write_project(project_id));