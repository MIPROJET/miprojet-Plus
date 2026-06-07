
CREATE OR REPLACE FUNCTION public.get_agricapital_partition()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid := 'b7024000-fc34-4706-8901-2ce092283dbc';
  v_entrees numeric := 0;
  v_sorties numeric := 0;
  v_nb integer := 0;
  v_records jsonb;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN record_type IN ('apport','apport_associe','don','revenue','vente','encaissement','subvention','pret','investissement') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN record_type NOT IN ('apport','apport_associe','don','revenue','vente','encaissement','subvention','pret','investissement') THEN amount ELSE 0 END), 0),
    COUNT(*)
    INTO v_entrees, v_sorties, v_nb
  FROM public.mp_financial_records
  WHERE project_id = v_project_id;

  SELECT COALESCE(jsonb_agg(r ORDER BY r->>'record_date'), '[]'::jsonb)
  INTO v_records
  FROM (
    SELECT jsonb_build_object(
      'record_type', record_type,
      'amount', amount,
      'record_date', record_date,
      'description', description,
      'category', category
    ) AS r
    FROM public.mp_financial_records
    WHERE project_id = v_project_id
    ORDER BY record_date ASC
    LIMIT 25
  ) sub;

  RETURN jsonb_build_object(
    'entrees', v_entrees,
    'sorties', v_sorties,
    'solde', v_entrees - v_sorties,
    'nbOperations', v_nb,
    'records', v_records
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agricapital_partition() TO anon, authenticated;
