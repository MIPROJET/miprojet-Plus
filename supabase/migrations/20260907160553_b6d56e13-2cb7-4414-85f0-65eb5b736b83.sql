UPDATE public.mp_projects
SET governance = jsonb_build_object(
  'decision_mode', 'Gérance SARL : le Gérant unique (Inocent KOFFI) engage la société. Les orientations stratégiques sont préparées en comité stratégique et validées en assemblée des associés.',
  'juridique_organes', 'SARL de droit ivoirien — Gérance statutaire ; comité stratégique et réseau d''experts externes à caractère consultatif.',
  'organes', jsonb_build_array(
    jsonb_build_object('name','Gérance','role','Direction générale et représentation légale de la société','legal_status','Statutaire'),
    jsonb_build_object('name','Assemblée des associés','role','Approbation des comptes, affectation du résultat, décisions extraordinaires','legal_status','Statutaire'),
    jsonb_build_object('name','Comité stratégique','role','Préparation des orientations, suivi de la performance et des risques','legal_status','Consultatif'),
    jsonb_build_object('name','Experts externes','role','Appui juridique, comptable/fiscal et agronomique','legal_status','Consultatif')
  )
)
WHERE id = 'b7024000-fc34-4706-8901-2ce092283dbc';

SELECT public.mp_recompute_score('b7024000-fc34-4706-8901-2ce092283dbc'::uuid);

GRANT EXECUTE ON FUNCTION public.get_agricapital_partition() TO anon, authenticated;