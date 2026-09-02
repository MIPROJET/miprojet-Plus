REVOKE EXECUTE ON FUNCTION public.mp_recompute_score(uuid) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.mp_recompute_score(uuid) TO service_role;