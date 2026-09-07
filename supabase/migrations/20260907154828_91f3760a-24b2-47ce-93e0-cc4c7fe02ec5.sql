CREATE OR REPLACE FUNCTION public.get_agricapital_partition()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_project_id uuid := 'b7024000-fc34-4706-8901-2ce092283dbc';
  v_entrees numeric := 0;
  v_sorties numeric := 0;
  v_nb integer := 0;
BEGIN
  SELECT
    COALESCE(SUM(CASE WHEN record_type IN ('apport','apport_associe','don','revenue','vente','encaissement','subvention','pret','investissement') THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN record_type NOT IN ('apport','apport_associe','don','revenue','vente','encaissement','subvention','pret','investissement') THEN amount ELSE 0 END), 0),
    COUNT(*)
    INTO v_entrees, v_sorties, v_nb
  FROM public.mp_financial_records
  WHERE project_id = v_project_id;

  RETURN jsonb_build_object(
    'entrees', v_entrees,
    'sorties', v_sorties,
    'solde', v_entrees - v_sorties,
    'nbOperations', v_nb,
    'records', '[]'::jsonb
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_agricapital_partition() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.mp_project_team FROM anon;
REVOKE ALL ON TABLE public.connection_requests FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_project_team TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.connection_requests TO authenticated;
GRANT ALL ON public.mp_project_team TO service_role;
GRANT ALL ON public.connection_requests TO service_role;

CREATE OR REPLACE FUNCTION public.guard_mp_document_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_any_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF OLD.owner_id <> auth.uid() THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.org_id IS DISTINCT FROM OLD.org_id THEN
      RAISE EXCEPTION 'Only the document owner can change its owner or organization';
    END IF;
  ELSE
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Document owner cannot be reassigned';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_mp_document_scope ON public.mp_documents;
CREATE TRIGGER trg_guard_mp_document_scope
BEFORE UPDATE ON public.mp_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_mp_document_scope();