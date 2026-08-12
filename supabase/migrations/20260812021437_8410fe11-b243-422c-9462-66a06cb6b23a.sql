CREATE OR REPLACE VIEW public.v_mp_scoring_coherence
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
       (COALESCE(p.maturite,'') <> CASE s.maturite
            WHEN 'Mature' THEN 'actif'
            WHEN 'Structuré' THEN 'structure'
            WHEN 'En structuration' THEN 'en_developpement'
            WHEN 'Idée' THEN 'idee'
            ELSE COALESCE(p.maturite,'') END) AS ecart_maturite,
       (COALESCE(p.is_public,false) AND ip.id IS NULL) AS manque_publication,
       CASE
         WHEN s.score_global IS NULL THEN 'critique'
         WHEN (ip.id IS NOT NULL AND COALESCE(ip.mp_score,-1) <> COALESCE(s.score_global,-1))
              OR (COALESCE(p.maturite,'') <> CASE s.maturite
                    WHEN 'Mature' THEN 'actif'
                    WHEN 'Structuré' THEN 'structure'
                    WHEN 'En structuration' THEN 'en_developpement'
                    WHEN 'Idée' THEN 'idee'
                    ELSE COALESCE(p.maturite,'') END) THEN 'attention'
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