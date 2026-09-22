REVOKE ALL ON public.mp_scoring_results FROM anon;
REVOKE ALL ON public.v_mp_scoring_coherence FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.v_mp_ecosystem_scoring FROM anon;
GRANT SELECT ON public.v_mp_ecosystem_scoring TO anon;
GRANT SELECT ON public.v_mp_scoring_coherence TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_resync_scoring(uuid) TO authenticated;