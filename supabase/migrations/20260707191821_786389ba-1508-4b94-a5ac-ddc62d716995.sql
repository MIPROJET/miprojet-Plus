
DROP VIEW IF EXISTS public.email_ops_overview;
CREATE VIEW public.email_ops_overview
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.email_queue WHERE status='pending') AS pending_count,
  (SELECT COUNT(*) FROM public.email_queue WHERE status='sent' AND sent_at > now() - interval '24 hours') AS sent_24h,
  (SELECT COUNT(*) FROM public.email_queue WHERE status='failed') AS failed_total,
  (SELECT COUNT(*) FROM public.email_unsubscribes) AS unsubscribes_total,
  (SELECT sent_count FROM public.email_provider_usage WHERE provider='brevo' AND usage_date=CURRENT_DATE) AS brevo_sent_today,
  (SELECT sent_count FROM public.email_provider_usage WHERE provider='resend' AND usage_date=CURRENT_DATE) AS resend_sent_today,
  (SELECT COUNT(*) FROM public.platform_sync_signals WHERE status='new') AS pending_signals;

GRANT SELECT ON public.email_ops_overview TO service_role;

-- RLS: block all client access to platform_sync_signals
CREATE POLICY "Deny all client access to sync signals"
  ON public.platform_sync_signals
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
