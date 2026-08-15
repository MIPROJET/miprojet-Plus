CREATE TABLE IF NOT EXISTS public.mp_project_stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mp_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  stakeholder_type text NOT NULL DEFAULT 'associe',
  role text,
  organization text,
  email text,
  phone text,
  capital_share numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_project_stakeholders TO authenticated;
GRANT ALL ON public.mp_project_stakeholders TO service_role;

ALTER TABLE public.mp_project_stakeholders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stakeholders_owner_all" ON public.mp_project_stakeholders;
CREATE POLICY "stakeholders_owner_all"
ON public.mp_project_stakeholders
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
);

CREATE INDEX IF NOT EXISTS idx_mp_stakeholders_project ON public.mp_project_stakeholders(project_id);

DROP TRIGGER IF EXISTS trg_mp_stakeholders_updated ON public.mp_project_stakeholders;
CREATE TRIGGER trg_mp_stakeholders_updated
BEFORE UPDATE ON public.mp_project_stakeholders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mp_financial_records
  ADD COLUMN IF NOT EXISTS stakeholder_id uuid REFERENCES public.mp_project_stakeholders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS party_name text;

CREATE INDEX IF NOT EXISTS idx_mp_fin_records_stakeholder ON public.mp_financial_records(stakeholder_id);