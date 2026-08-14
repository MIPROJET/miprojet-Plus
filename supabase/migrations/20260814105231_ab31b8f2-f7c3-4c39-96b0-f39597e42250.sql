GRANT EXECUTE ON FUNCTION public.is_any_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_rls_test_report() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mp_resync_scoring(uuid) TO authenticated;