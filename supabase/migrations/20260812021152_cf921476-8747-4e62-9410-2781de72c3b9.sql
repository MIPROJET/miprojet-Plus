-- =========================================================
-- §7 — Scoring & maturité automatiques + sync écosystème
-- =========================================================

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 7.1 Colonnes complémentaires
ALTER TABLE public.mp_scoring_results
  ADD COLUMN IF NOT EXISTS score_equipe numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maturite text,
  ADD COLUMN IF NOT EXISTS computed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'auto';

DELETE FROM public.mp_scoring_results a
USING public.mp_scoring_results b
WHERE a.project_id IS NOT NULL
  AND a.project_id = b.project_id
  AND a.ctid < b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS mp_scoring_results_project_uidx
  ON public.mp_scoring_results (project_id) WHERE project_id IS NOT NULL;

-- 7.2 Normalisation centrale (barème CDC 15/25/20/15/10/15)
CREATE OR REPLACE FUNCTION public.sanitize_scoring_result()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_global int;
BEGIN
  NEW.score_juridique := LEAST(100, GREATEST(0, COALESCE(NEW.score_juridique, 0)));
  NEW.score_financier := LEAST(100, GREATEST(0, COALESCE(NEW.score_financier, 0)));
  NEW.score_technique := LEAST(100, GREATEST(0, COALESCE(NEW.score_technique, 0)));
  NEW.score_marche    := LEAST(100, GREATEST(0, COALESCE(NEW.score_marche, 0)));
  NEW.score_equipe    := LEAST(100, GREATEST(0, COALESCE(NEW.score_equipe, 0)));
  NEW.score_impact    := LEAST(100, GREATEST(0, COALESCE(NEW.score_impact, 0)));

  v_global := ROUND(
      NEW.score_juridique * 0.15
    + NEW.score_financier * 0.25
    + NEW.score_technique * 0.20
    + NEW.score_marche    * 0.15
    + NEW.score_equipe    * 0.10
    + NEW.score_impact    * 0.15
  );
  NEW.score_global := v_global;

  NEW.niveau := CASE
    WHEN v_global >= 80 THEN 'Finançable'
    WHEN v_global >= 60 THEN 'Prometteur'
    WHEN v_global >= 40 THEN 'Fragile'
    ELSE 'À renforcer'
  END;

  NEW.maturite := CASE
    WHEN v_global >= 80 THEN 'Mature'
    WHEN v_global >= 60 THEN 'Structuré'
    WHEN v_global >= 40 THEN 'En structuration'
    ELSE 'Idée'
  END;

  NEW.computed_at := now();

  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_scoring_result ON public.mp_scoring_results;
CREATE TRIGGER trg_sanitize_scoring_result
BEFORE INSERT OR UPDATE ON public.mp_scoring_results
FOR EACH ROW EXECUTE FUNCTION public.sanitize_scoring_result();

-- 7.3 Recomputation canonique depuis les données sources réelles
CREATE OR REPLACE FUNCTION public.mp_recompute_score(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p            public.mp_projects%ROWTYPE;
  v_juridique  int := 0;
  v_financier  int := 0;
  v_technique  int := 0;
  v_marche     int := 0;
  v_equipe     int := 0;
  v_impact     int := 0;
  v_ops        int := 0;
  v_in         numeric := 0;
  v_out        numeric := 0;
  v_team       int := 0;
  v_gov        int := 0;
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
  v_gov := CASE WHEN p.governance IS NOT NULL AND p.governance::text NOT IN ('null','{}','[]','') THEN 1 ELSE 0 END;
  v_equipe := LEAST(100, v_team * 20 + v_gov * 30 + CASE WHEN COALESCE(p.employees_count,0) > 0 THEN 10 ELSE 0 END);

  SELECT score_global INTO v_eval
    FROM public.mp_evaluations WHERE project_id = _project_id
    ORDER BY updated_at DESC LIMIT 1;
  v_impact := COALESCE(v_eval, CASE WHEN COALESCE(p.objectif,'') <> '' THEN 40 ELSE 20 END);

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
$$;

REVOKE ALL ON FUNCTION public.mp_recompute_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mp_recompute_score(uuid) TO authenticated, service_role;

-- 7.4 Triggers sur les tables sources
CREATE OR REPLACE FUNCTION public.mp_trigger_recompute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _pid uuid;
BEGIN
  IF TG_TABLE_NAME = 'mp_projects' THEN
    _pid := COALESCE(NEW.id, OLD.id);
  ELSE
    _pid := COALESCE(NEW.project_id, OLD.project_id);
  END IF;
  IF _pid IS NOT NULL THEN
    PERFORM public.mp_recompute_score(_pid);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_mp_projects ON public.mp_projects;
CREATE TRIGGER trg_recompute_mp_projects
AFTER INSERT OR UPDATE OF title, description, legal_status, has_accounting, has_bank_account,
  has_business_plan, product_description, commercialization, target_customers,
  monitoring_evaluation, short_pitch, governance, objectif, employees_count, annual_revenue
ON public.mp_projects
FOR EACH ROW EXECUTE FUNCTION public.mp_trigger_recompute();

DROP TRIGGER IF EXISTS trg_recompute_mp_financial_records ON public.mp_financial_records;
CREATE TRIGGER trg_recompute_mp_financial_records
AFTER INSERT OR UPDATE OR DELETE ON public.mp_financial_records
FOR EACH ROW EXECUTE FUNCTION public.mp_trigger_recompute();

DROP TRIGGER IF EXISTS trg_recompute_mp_project_team ON public.mp_project_team;
CREATE TRIGGER trg_recompute_mp_project_team
AFTER INSERT OR UPDATE OR DELETE ON public.mp_project_team
FOR EACH ROW EXECUTE FUNCTION public.mp_trigger_recompute();

DROP TRIGGER IF EXISTS trg_recompute_mp_evaluations ON public.mp_evaluations;
CREATE TRIGGER trg_recompute_mp_evaluations
AFTER INSERT OR UPDATE OR DELETE ON public.mp_evaluations
FOR EACH ROW EXECUTE FUNCTION public.mp_trigger_recompute();

-- 7.5 RLS : admin lecture/écriture, équipe lecture
ALTER TABLE public.mp_scoring_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own scoring" ON public.mp_scoring_results;
DROP POLICY IF EXISTS "scoring_read_owner_team_admin" ON public.mp_scoring_results;
CREATE POLICY "scoring_read_owner_team_admin" ON public.mp_scoring_results
FOR SELECT TO authenticated USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.mp_projects p
              WHERE p.id = mp_scoring_results.project_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.mp_project_team t
              WHERE t.project_id = mp_scoring_results.project_id AND t.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own scoring" ON public.mp_scoring_results;
DROP POLICY IF EXISTS "scoring_update_owner_admin" ON public.mp_scoring_results;
CREATE POLICY "scoring_update_owner_admin" ON public.mp_scoring_results
FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
) WITH CHECK (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- 7.6 Vue écosystème (lecture seule, projets publics)
DROP VIEW IF EXISTS public.v_mp_ecosystem_scoring;
CREATE VIEW public.v_mp_ecosystem_scoring
WITH (security_invoker = false) AS
SELECT p.id AS project_id, p.display_id, p.title, p.sector, p.city, p.country,
       p.profile_kind, p.journey,
       s.score_global, s.niveau, s.maturite,
       s.score_juridique, s.score_financier, s.score_technique,
       s.score_marche, s.score_equipe, s.score_impact,
       s.computed_at, s.updated_at
FROM public.mp_projects p
JOIN public.mp_scoring_results s ON s.project_id = p.id AND s.is_active
WHERE COALESCE(p.is_public, false) = true;

GRANT SELECT ON public.v_mp_ecosystem_scoring TO anon, authenticated, service_role;

-- 7.7 Vue de cohérence : écarts calculé vs exposé
DROP VIEW IF EXISTS public.v_mp_scoring_coherence;
CREATE VIEW public.v_mp_scoring_coherence
WITH (security_invoker = true) AS
SELECT p.id AS project_id,
       p.title,
       p.user_id,
       p.is_public,
       s.score_global      AS score_calcule,
       s.niveau            AS niveau_calcule,
       s.maturite          AS maturite_calculee,
       p.maturite          AS maturite_projet,
       ip.mp_score         AS score_invest,
       e.score_global      AS score_evaluation,
       s.computed_at,
       (s.score_global IS NULL) AS manque_score,
       (ip.id IS NOT NULL AND COALESCE(ip.mp_score, -1) <> COALESCE(s.score_global, -1)) AS ecart_invest,
       (COALESCE(p.maturite,'') <> COALESCE(s.maturite,'')) AS ecart_maturite,
       (COALESCE(p.is_public,false) AND ip.id IS NULL) AS manque_publication,
       CASE
         WHEN s.score_global IS NULL THEN 'critique'
         WHEN (ip.id IS NOT NULL AND COALESCE(ip.mp_score,-1) <> COALESCE(s.score_global,-1))
              OR (COALESCE(p.maturite,'') <> COALESCE(s.maturite,'')) THEN 'attention'
         WHEN s.computed_at < now() - interval '30 days' THEN 'obsolete'
         ELSE 'ok'
       END AS etat
FROM public.mp_projects p
LEFT JOIN public.mp_scoring_results s ON s.project_id = p.id AND s.is_active
LEFT JOIN public.projects ip ON ip.metadata->>'mp_project_id' = p.id::text
LEFT JOIN LATERAL (
  SELECT score_global FROM public.mp_evaluations ev
  WHERE ev.project_id = p.id ORDER BY ev.updated_at DESC LIMIT 1
) e ON true;

GRANT SELECT ON public.v_mp_scoring_coherence TO authenticated, service_role;

-- 7.8 Resynchronisation manuelle (admin ou porteur)
CREATE OR REPLACE FUNCTION public.mp_resync_scoring(_project_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record; n int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF _project_id IS NOT NULL THEN
    IF NOT (public.has_role(auth.uid(),'admin')
            OR EXISTS (SELECT 1 FROM public.mp_projects WHERE id=_project_id AND user_id=auth.uid())) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
    PERFORM public.mp_recompute_score(_project_id);
    RETURN jsonb_build_object('ok', true, 'recomputed', 1);
  END IF;

  FOR r IN SELECT id FROM public.mp_projects
            WHERE public.has_role(auth.uid(),'admin') OR user_id = auth.uid() LOOP
    PERFORM public.mp_recompute_score(r.id);
    n := n + 1;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'recomputed', n);
END;
$$;

REVOKE ALL ON FUNCTION public.mp_resync_scoring(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mp_resync_scoring(uuid) TO authenticated, service_role;

-- 7.9 Tests automatisés des règles d'accès scoring / maturité
CREATE OR REPLACE FUNCTION public.mp_rls_test_report()
RETURNS TABLE(suite text, test_name text, expected text, passed boolean, details text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  RETURN QUERY
  SELECT 'scoring'::text, 'RLS activée sur mp_scoring_results'::text, 'enabled'::text,
         COALESCE(c.relrowsecurity, false),
         (CASE WHEN COALESCE(c.relrowsecurity,false) THEN 'RLS active' ELSE 'RLS désactivée' END)::text
  FROM pg_class c WHERE c.oid = 'public.mp_scoring_results'::regclass;

  RETURN QUERY
  SELECT 'maturite'::text, 'RLS activée sur mp_evaluations'::text, 'enabled'::text,
         COALESCE(c.relrowsecurity, false),
         (CASE WHEN COALESCE(c.relrowsecurity,false) THEN 'RLS active' ELSE 'RLS désactivée' END)::text
  FROM pg_class c WHERE c.oid = 'public.mp_evaluations'::regclass;

  RETURN QUERY
  SELECT 'scoring'::text, 'Admin peut lire les scores'::text, 'policy admin SELECT'::text,
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mp_scoring_results'
                  AND cmd='SELECT' AND qual ILIKE '%has_role%admin%'),
         'has_role(admin) présent dans la policy SELECT'::text;

  RETURN QUERY
  SELECT 'scoring'::text, 'Admin peut modifier les scores'::text, 'policy admin UPDATE'::text,
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mp_scoring_results'
                  AND cmd='UPDATE' AND with_check ILIKE '%has_role%admin%'),
         'has_role(admin) présent dans la policy UPDATE'::text;

  RETURN QUERY
  SELECT 'scoring'::text, 'Équipe projet en lecture'::text, 'policy SELECT équipe'::text,
         EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mp_scoring_results'
                  AND cmd='SELECT' AND qual ILIKE '%mp_project_team%'),
         'mp_project_team référencé dans la policy SELECT'::text;

  RETURN QUERY
  SELECT 'scoring'::text, 'Équipe projet sans droit d''écriture'::text, 'aucune policy écriture équipe'::text,
         NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mp_scoring_results'
                      AND cmd IN ('UPDATE','INSERT','DELETE')
                      AND COALESCE(with_check, qual, '') ILIKE '%mp_project_team%'),
         'aucune policy d''écriture ne cite mp_project_team'::text;

  RETURN QUERY
  SELECT 'ecosysteme'::text, 'Anonyme sans accès direct aux scores'::text, 'aucun grant anon'::text,
         NOT has_table_privilege('anon', 'public.mp_scoring_results', 'SELECT'),
         'privilège SELECT anon sur mp_scoring_results'::text;

  RETURN QUERY
  SELECT 'ecosysteme'::text, 'Vue écosystème en lecture seule'::text, 'SELECT anon OK, INSERT KO'::text,
         has_table_privilege('anon', 'public.v_mp_ecosystem_scoring', 'SELECT')
           AND NOT has_table_privilege('anon', 'public.v_mp_ecosystem_scoring', 'INSERT'),
         'grants sur v_mp_ecosystem_scoring'::text;

  RETURN QUERY
  SELECT 'coherence'::text, 'Vue cohérence réservée aux comptes connectés'::text, 'anon sans SELECT'::text,
         NOT has_table_privilege('anon', 'public.v_mp_scoring_coherence', 'SELECT'),
         'grants sur v_mp_scoring_coherence'::text;

  RETURN QUERY
  SELECT 'automatisation'::text, 'Triggers de recalcul installés'::text, '4 triggers'::text,
         (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_recompute_%' AND NOT tgisinternal) >= 4,
         'triggers trg_recompute_* présents'::text;

  RETURN QUERY
  SELECT 'automatisation'::text, 'Barème pondéré appliqué automatiquement'::text, 'trigger sanitize'::text,
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sanitize_scoring_result' AND NOT tgisinternal),
         'trigger de normalisation actif'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.mp_rls_test_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mp_rls_test_report() TO authenticated, service_role;

-- 7.9b Correction de la publication auto vers MiPROJET Invest (champ niveau)
CREATE OR REPLACE FUNCTION public.mp_auto_publish_eligible_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_project public.mp_projects%ROWTYPE;
  v_existing_id uuid;
BEGIN
  IF COALESCE(NEW.niveau,'') IS DISTINCT FROM 'Finançable' THEN RETURN NEW; END IF;
  SELECT * INTO v_project FROM public.mp_projects WHERE id = NEW.project_id;
  IF NOT FOUND OR COALESCE(v_project.publish_when_eligible, false) = false THEN RETURN NEW; END IF;

  SELECT id INTO v_existing_id FROM public.projects
  WHERE owner_id = v_project.user_id AND metadata->>'mp_project_id' = v_project.id::text LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.projects
      (owner_id, title, sector, status, is_public, mp_score, country, city, metadata)
    VALUES (
      v_project.user_id,
      COALESCE(v_project.title, 'Projet MiProjet+'),
      v_project.sector, 'published', true,
      NEW.score_global, v_project.country, v_project.city,
      jsonb_build_object('mp_project_id', v_project.id::text, 'mp_score', NEW.score_global,
                         'mp_niveau', NEW.niveau, 'mp_maturite', NEW.maturite)
    );
  ELSE
    UPDATE public.projects
    SET title = COALESCE(v_project.title, title),
        sector = COALESCE(v_project.sector, sector),
        status = 'published', is_public = true,
        mp_score = NEW.score_global,
        country = COALESCE(v_project.country, country),
        city = COALESCE(v_project.city, city),
        metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object(
          'mp_project_id', v_project.id::text, 'mp_score', NEW.score_global,
          'mp_niveau', NEW.niveau, 'mp_maturite', NEW.maturite),
        updated_at = now()
    WHERE id = v_existing_id;
  END IF;
  RETURN NEW;
END;
$fn$;

-- 7.10 Backfill initial
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM public.mp_projects LOOP
    PERFORM public.mp_recompute_score(r.id);
  END LOOP;
END $$;

-- 7.11 Signal écosystème
INSERT INTO public.platform_sync_signals
  (signal_type, severity, source_table, source_id, actor_user_id, payload)
VALUES (
  'miprojet_plus.scoring_automation_v1', 'notice', 'mp_scoring_results',
  gen_random_uuid(), NULL,
  jsonb_build_object(
    'views', jsonb_build_array('v_mp_ecosystem_scoring','v_mp_scoring_coherence'),
    'functions', jsonb_build_array('mp_recompute_score','mp_resync_scoring','mp_rls_test_report')
  )
);