-- 1) FIX: documents insert policy blocked owners/managers
DROP POLICY IF EXISTS docs_member_write ON public.mp_documents;
CREATE POLICY docs_member_write ON public.mp_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (org_id IS NULL OR public.org_role_at_least(org_id, 'member'::org_role))
  );

-- 2) New project fields (traction / implantation)
ALTER TABLE public.mp_projects
  ADD COLUMN IF NOT EXISTS governance_mode text,
  ADD COLUMN IF NOT EXISTS offices_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advisors_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operational_units numeric;

-- 3) Milestones table
CREATE TABLE IF NOT EXISTS public.mp_project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mp_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'autre',
  title text NOT NULL,
  description text,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  location text,
  participants_count integer,
  media_url text,
  is_public boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_project_milestones TO authenticated;
GRANT SELECT ON public.mp_project_milestones TO anon;
GRANT ALL ON public.mp_project_milestones TO service_role;

ALTER TABLE public.mp_project_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS milestones_public_read ON public.mp_project_milestones;
CREATE POLICY milestones_public_read ON public.mp_project_milestones
  FOR SELECT TO anon
  USING (
    is_public = true
    AND EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND COALESCE(p.is_public,false) = true)
  );

DROP POLICY IF EXISTS milestones_read ON public.mp_project_milestones;
CREATE POLICY milestones_read ON public.mp_project_milestones
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_any_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
    OR (is_public = true AND EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND COALESCE(p.is_public,false) = true))
  );

DROP POLICY IF EXISTS milestones_write ON public.mp_project_milestones;
CREATE POLICY milestones_write ON public.mp_project_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS milestones_update ON public.mp_project_milestones;
CREATE POLICY milestones_update ON public.mp_project_milestones
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS milestones_delete ON public.mp_project_milestones;
CREATE POLICY milestones_delete ON public.mp_project_milestones
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mp_projects p WHERE p.id = project_id AND p.user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_milestones_updated_at ON public.mp_project_milestones;
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON public.mp_project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_milestones_project ON public.mp_project_milestones(project_id, event_date DESC);

-- 4) Scoring: include traction (milestones, offices, advisors)
CREATE OR REPLACE FUNCTION public.mp_recompute_score(_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p            public.mp_projects%ROWTYPE;
  v_juridique  int := 0;
  v_financier  int := 0;
  v_technique  int := 0;
  v_marche     int := 0;
  v_equipe     int := 0;
  v_impact     int := 0;
  v_traction   int := 0;
  v_ops        int := 0;
  v_in         numeric := 0;
  v_out        numeric := 0;
  v_team       int := 0;
  v_gov        int := 0;
  v_miles      int := 0;
  v_eval       int;
BEGIN
  SELECT * INTO p FROM public.mp_projects WHERE id = _project_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_juridique := 20
    + CASE WHEN COALESCE(p.legal_status,'') <> '' THEN 40 ELSE 0 END
    + CASE WHEN COALESCE(p.has_bank_account,false) THEN 20 ELSE 0 END
    + CASE WHEN COALESCE(p.has_accounting,false) THEN 20 ELSE 0 END;

  SELECT COUNT(*),
         COALESCE(SUM(CASE WHEN record_type IN ('income','revenue','vente','apport','apport_associe','don','subvention','pret','investissement','encaissement') THEN amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN record_type IN ('income','revenue','vente','apport','apport_associe','don','subvention','pret','investissement','encaissement') THEN 0 ELSE amount END),0)
    INTO v_ops, v_in, v_out
    FROM public.mp_financial_records WHERE project_id = _project_id;

  v_financier := LEAST(100,
      CASE WHEN v_ops > 0 THEN 30 ELSE 0 END
    + CASE WHEN v_ops >= 10 THEN 15 ELSE 0 END
    + CASE WHEN v_in > 0 THEN 25 ELSE 0 END
    + CASE WHEN (v_in - v_out) >= 0 THEN 20 ELSE 0 END
    + CASE WHEN COALESCE(p.annual_revenue,0) > 0 THEN 10 ELSE 0 END);

  v_technique := LEAST(100,
      CASE WHEN char_length(COALESCE(p.product_description,'')) > 200 THEN 35
           WHEN char_length(COALESCE(p.product_description,'')) > 50 THEN 20 ELSE 0 END
    + CASE WHEN COALESCE(p.has_business_plan,false) THEN 30 ELSE 0 END
    + CASE WHEN char_length(COALESCE(p.monitoring_evaluation,'')) > 50 THEN 20 ELSE 0 END
    + CASE WHEN COALESCE(p.logo_url,'') <> '' OR COALESCE(p.cover_url,'') <> '' THEN 15 ELSE 0 END);

  v_marche := LEAST(100,
      CASE WHEN char_length(COALESCE(p.target_customers,'')) > 50 THEN 35 ELSE 0 END
    + CASE WHEN char_length(COALESCE(p.commercialization,'')) > 50 THEN 35 ELSE 0 END
    + CASE WHEN char_length(COALESCE(p.short_pitch,'')) > 40 THEN 30 ELSE 0 END);

  SELECT COUNT(*) INTO v_team FROM public.mp_project_team WHERE project_id = _project_id;
  SELECT COUNT(*) INTO v_miles FROM public.mp_project_milestones WHERE project_id = _project_id;
  v_gov := CASE WHEN p.governance IS NOT NULL AND p.governance::text NOT IN ('null','{}','[]','')
                  OR COALESCE(p.governance_mode,'') <> '' THEN 1 ELSE 0 END;

  v_equipe := LEAST(100,
      v_team * 15
    + v_gov * 30
    + CASE WHEN COALESCE(p.employees_count,0) > 0 THEN 10 ELSE 0 END
    + CASE WHEN COALESCE(p.advisors_count,0) > 0 THEN 15 ELSE 0 END);

  v_traction := LEAST(100,
      LEAST(v_miles, 4) * 15
    + CASE WHEN COALESCE(p.offices_count,0) > 0 THEN 20 ELSE 0 END
    + CASE WHEN COALESCE(p.advisors_count,0) > 0 THEN 10 ELSE 0 END
    + CASE WHEN COALESCE(p.objectif,'') <> '' THEN 10 ELSE 0 END
    + CASE WHEN COALESCE(p.operational_units,0) > 0 THEN 10 ELSE 0 END);

  SELECT score_global INTO v_eval
    FROM public.mp_evaluations WHERE project_id = _project_id
    ORDER BY updated_at DESC LIMIT 1;

  v_impact := GREATEST(COALESCE(v_eval, 0), v_traction,
                       CASE WHEN COALESCE(p.objectif,'') <> '' THEN 40 ELSE 20 END);

  INSERT INTO public.mp_scoring_results
    (project_id, user_id, score_juridique, score_financier, score_technique,
     score_marche, score_equipe, score_impact, is_active, source)
  VALUES (_project_id, p.user_id, v_juridique, v_financier, v_technique,
          v_marche, v_equipe, v_impact, true, 'auto')
  ON CONFLICT (project_id) WHERE project_id IS NOT NULL DO UPDATE SET
    score_juridique = EXCLUDED.score_juridique,
    score_financier = EXCLUDED.score_financier,
    score_technique = EXCLUDED.score_technique,
    score_marche    = EXCLUDED.score_marche,
    score_equipe    = EXCLUDED.score_equipe,
    score_impact    = EXCLUDED.score_impact,
    is_active       = true,
    source          = 'auto',
    updated_at      = now();

  UPDATE public.mp_projects pr
     SET maturite = CASE s.maturite
                      WHEN 'Mature' THEN 'actif'
                      WHEN 'Structuré' THEN 'structure'
                      WHEN 'En structuration' THEN 'en_developpement'
                      ELSE 'idee' END,
         updated_at = now()
    FROM public.mp_scoring_results s
   WHERE s.project_id = _project_id
     AND pr.id = _project_id
     AND COALESCE(pr.maturite,'') IS DISTINCT FROM CASE s.maturite
                      WHEN 'Mature' THEN 'actif'
                      WHEN 'Structuré' THEN 'structure'
                      WHEN 'En structuration' THEN 'en_developpement'
                      ELSE 'idee' END;

  UPDATE public.projects ip
     SET mp_score = s.score_global,
         metadata = COALESCE(ip.metadata,'{}'::jsonb)
                    || jsonb_build_object('mp_project_id', _project_id::text,
                                          'mp_score', s.score_global,
                                          'mp_niveau', s.niveau,
                                          'mp_maturite', s.maturite),
         updated_at = now()
    FROM public.mp_scoring_results s
   WHERE s.project_id = _project_id
     AND ip.metadata->>'mp_project_id' = _project_id::text;
END;
$function$;

DROP TRIGGER IF EXISTS trg_recompute_milestones ON public.mp_project_milestones;
CREATE TRIGGER trg_recompute_milestones
  AFTER INSERT OR UPDATE OR DELETE ON public.mp_project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.mp_trigger_recompute();

-- 5) Ecosystem view enriched
DROP VIEW IF EXISTS public.v_mp_ecosystem_scoring;
CREATE VIEW public.v_mp_ecosystem_scoring
WITH (security_invoker = true) AS
SELECT p.id AS project_id,
    p.display_id, p.title, p.sector, p.city, p.country,
    p.profile_kind, p.journey,
    p.governance_mode,
    p.offices_count,
    p.advisors_count,
    p.operational_units,
    (SELECT count(*) FROM public.mp_project_milestones m WHERE m.project_id = p.id AND m.is_public) AS milestones_count,
    (SELECT max(m.event_date) FROM public.mp_project_milestones m WHERE m.project_id = p.id AND m.is_public) AS last_milestone_date,
    s.score_global, s.niveau, s.maturite,
    s.score_juridique, s.score_financier, s.score_technique,
    s.score_marche, s.score_equipe, s.score_impact,
    s.computed_at, s.updated_at
FROM public.mp_projects p
JOIN public.mp_scoring_results s ON s.project_id = p.id AND s.is_active
WHERE COALESCE(p.is_public, false) = true;

GRANT SELECT ON public.v_mp_ecosystem_scoring TO anon, authenticated, service_role;