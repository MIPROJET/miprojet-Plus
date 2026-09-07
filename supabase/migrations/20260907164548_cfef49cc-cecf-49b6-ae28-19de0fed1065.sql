CREATE OR REPLACE FUNCTION public.guard_mp_scoring_client_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.scoring_internal', true) = 'on'
     OR auth.uid() IS NULL
     OR auth.role() = 'service_role'
     OR public.is_any_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  NEW.score_juridique := 0;
  NEW.score_financier := 0;
  NEW.score_technique := 0;
  NEW.score_marche := 0;
  NEW.score_impact := 0;
  NEW.score_equipe := 0;
  NEW.score_global := 0;
  NEW.niveau := NULL;
  NEW.source := 'client_unverified';
  NEW.is_active := false;
  RETURN NEW;
END;
$function$;

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

  PERFORM set_config('app.scoring_internal', 'on', true);

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
  v_gov := CASE WHEN (p.governance IS NOT NULL AND p.governance::text NOT IN ('null','{}','[]',''))
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

  PERFORM set_config('app.scoring_internal', 'off', true);

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

REVOKE EXECUTE ON FUNCTION public.mp_recompute_score(uuid) FROM PUBLIC, anon, authenticated;

SELECT public.mp_recompute_score('b7024000-fc34-4706-8901-2ce092283dbc'::uuid);