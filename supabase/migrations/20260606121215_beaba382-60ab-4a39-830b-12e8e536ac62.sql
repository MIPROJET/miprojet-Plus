
-- Trigger-only / system functions: revoke EXECUTE from PUBLIC and authenticated/anon
REVOKE EXECUTE ON FUNCTION public.notify_opportunity_published() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_lifetime_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_referrer_on_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_investor_user_type() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lock_user_type_permanent() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mp_auto_publish_eligible_project() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_email_unsubscribed(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pick_email_provider() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_email_provider_usage(text) FROM PUBLIC, anon, authenticated;
