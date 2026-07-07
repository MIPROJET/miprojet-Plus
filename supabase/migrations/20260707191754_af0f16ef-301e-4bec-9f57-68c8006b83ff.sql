
-- =========================================================
-- 1) Unsubscribe token per user
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS unsubscribe_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unsub_token
  ON public.profiles(unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;

-- Backfill missing tokens
UPDATE public.profiles
  SET unsubscribe_token = encode(gen_random_bytes(24), 'hex')
  WHERE unsubscribe_token IS NULL;

-- Trigger to auto-generate on insert
CREATE OR REPLACE FUNCTION public.set_unsubscribe_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.unsubscribe_token IS NULL THEN
    NEW.unsubscribe_token := encode(gen_random_bytes(24), 'hex');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_set_unsub_token ON public.profiles;
CREATE TRIGGER trg_profiles_set_unsub_token
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_unsubscribe_token();

-- =========================================================
-- 2) unsubscribe_by_token used by public endpoint
-- =========================================================
CREATE OR REPLACE FUNCTION public.unsubscribe_by_token(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;
  SELECT email INTO v_email FROM public.profiles WHERE unsubscribe_token = _token;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;
  INSERT INTO public.email_unsubscribes (email, reason, source)
    VALUES (lower(v_email), 'user_request', 'transactional_footer')
    ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok', true, 'email', v_email);
END; $$;

REVOKE ALL ON FUNCTION public.unsubscribe_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unsubscribe_by_token(text) TO anon, authenticated, service_role;

-- =========================================================
-- 3) Update enqueue_user_email to inject unsubscribe footer + URL
-- =========================================================
CREATE OR REPLACE FUNCTION public.enqueue_user_email(
  _user_id uuid,
  _category text,
  _subject text,
  _html text,
  _text text DEFAULT NULL,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text; v_token text; v_unsub_url text; v_queue_id uuid; v_html_final text;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  SELECT email, unsubscribe_token INTO v_email, v_token FROM public.profiles WHERE id = _user_id;
  IF v_email IS NULL OR v_email = '' THEN RETURN NULL; END IF;
  IF public.is_email_unsubscribed(v_email) THEN RETURN NULL; END IF;

  IF v_token IS NULL THEN
    v_token := encode(gen_random_bytes(24), 'hex');
    UPDATE public.profiles SET unsubscribe_token = v_token WHERE id = _user_id;
  END IF;

  v_unsub_url := 'https://project-ivoire-shine.lovable.app/api/public/unsubscribe?token=' || v_token;

  -- Inject unsubscribe link into footer if not already present
  v_html_final := replace(
    _html,
    'Vous pouvez gérer vos préférences depuis votre espace.',
    'Vous pouvez gérer vos préférences depuis votre espace. <a href="' || v_unsub_url || '" style="color:#86868b">Se désabonner</a>'
  );

  INSERT INTO public.email_queue (
    to_email, subject, html, text_content, kind,
    recipient_user_id, from_address, unsubscribe_url, status, scheduled_for
  ) VALUES (
    v_email, _subject, v_html_final, COALESCE(_text, regexp_replace(v_html_final, '<[^>]+>', '', 'g')),
    'transactional', _user_id, 'MiProjet <info@ivoireprojet.com>', v_unsub_url, 'pending', now()
  ) RETURNING id INTO v_queue_id;

  INSERT INTO public.email_send_history (
    user_id, recipient_email, category, subject, entity_type, entity_id, status, queue_id, metadata
  ) VALUES (
    _user_id, v_email, _category, _subject, _entity_type, _entity_id, 'queued', v_queue_id, _metadata
  );

  RETURN v_queue_id;
END; $$;

REVOKE ALL ON FUNCTION public.enqueue_user_email(uuid, text, text, text, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_user_email(uuid, text, text, text, text, text, uuid, jsonb) TO service_role;

-- =========================================================
-- 4) mark_email_sent → also persist in email_logs
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_email_sent(_id uuid, _provider text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.email_queue%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.email_queue WHERE id = _id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.email_queue SET status='sent', sent_at=now(), updated_at=now(), last_error=NULL WHERE id=_id;

  INSERT INTO public.email_logs (
    kind, recipient_email, recipient_user_id, subject, status, provider, provider_id, sent_at, metadata
  ) VALUES (
    'transactional', r.to_email, r.recipient_user_id, r.subject, 'sent', _provider, _id::text, now(),
    jsonb_build_object('queue_id', _id)
  );

  UPDATE public.email_send_history
    SET status='sent', metadata = metadata || jsonb_build_object('provider', _provider)
    WHERE queue_id=_id;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_email_failed(_id uuid, _error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.email_queue%ROWTYPE; v_new_status text;
BEGIN
  SELECT * INTO r FROM public.email_queue WHERE id = _id;
  IF NOT FOUND THEN RETURN; END IF;

  v_new_status := CASE WHEN r.attempts + 1 >= 5 THEN 'failed' ELSE 'pending' END;

  UPDATE public.email_queue
    SET status = v_new_status,
        attempts = attempts + 1,
        last_error = _error,
        scheduled_for = CASE WHEN v_new_status = 'failed' THEN scheduled_for
                             ELSE now() + (interval '2 minutes' * (r.attempts + 1)) END,
        updated_at = now()
    WHERE id = _id;

  INSERT INTO public.email_logs (
    kind, recipient_email, recipient_user_id, subject, status, provider_id, metadata
  ) VALUES (
    'transactional', r.to_email, r.recipient_user_id, r.subject,
    CASE WHEN v_new_status='failed' THEN 'failed' ELSE 'retry' END,
    _id::text,
    jsonb_build_object('error', _error, 'attempt', r.attempts + 1)
  );

  UPDATE public.email_send_history
    SET status = CASE WHEN v_new_status='failed' THEN 'failed' ELSE 'retry' END,
        metadata = metadata || jsonb_build_object('error', _error, 'attempt', r.attempts + 1)
    WHERE queue_id = _id;
END; $$;

GRANT EXECUTE ON FUNCTION public.mark_email_sent(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_email_failed(uuid, text) TO service_role;

-- =========================================================
-- 5) Signals table for parent ecosystem (super admin external)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.platform_sync_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','notice','warning','critical')),
  source_table text,
  source_id uuid,
  actor_user_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','acknowledged','handled','ignored')),
  handled_at timestamptz,
  handled_by_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.platform_sync_signals TO service_role;
-- No grants to authenticated/anon: this table is EXCLUSIVELY for the parent ecosystem
ALTER TABLE public.platform_sync_signals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sync_signals_status ON public.platform_sync_signals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_signals_type ON public.platform_sync_signals(signal_type, created_at DESC);

COMMENT ON TABLE public.platform_sync_signals IS
'PARENT ECOSYSTEM ONLY. Read/managed by MiProjet mother ecosystem super admin. Signals emitted by triggers (new certifiable project, premium request, funding intent, ticket escalation, etc.). Client app must NOT read or write this table.';

-- Emit signal helper
CREATE OR REPLACE FUNCTION public.emit_sync_signal(
  _type text, _source_table text, _source_id uuid,
  _actor uuid, _payload jsonb DEFAULT '{}'::jsonb, _severity text DEFAULT 'info'
) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.platform_sync_signals (signal_type, severity, source_table, source_id, actor_user_id, payload)
  VALUES (_type, _severity, _source_table, _source_id, _actor, COALESCE(_payload,'{}'::jsonb))
  RETURNING id;
$$;
REVOKE ALL ON FUNCTION public.emit_sync_signal(text, text, uuid, uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.emit_sync_signal(text, text, uuid, uuid, jsonb, text) TO service_role;

-- Emit signals on key events
CREATE OR REPLACE FUNCTION public.trg_signal_service_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_sync_signal('service_request.created', 'mp_user_service_requests', NEW.id, NEW.user_id,
      jsonb_build_object('service_id', NEW.service_id, 'project_id', NEW.project_id), 'notice');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_signal_service_request ON public.mp_user_service_requests;
CREATE TRIGGER trg_signal_service_request
  AFTER INSERT ON public.mp_user_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_signal_service_request();

CREATE OR REPLACE FUNCTION public.trg_signal_introduction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_sync_signal('introduction.requested', 'mp_introductions', NEW.id, NEW.user_id,
      jsonb_build_object('target_type', NEW.target_type, 'amount_requested', NEW.amount_requested,
                         'project_id', NEW.project_id, 'needs', NEW.needs), 'notice');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_signal_introduction ON public.mp_introductions;
CREATE TRIGGER trg_signal_introduction
  AFTER INSERT ON public.mp_introductions
  FOR EACH ROW EXECUTE FUNCTION public.trg_signal_introduction();

CREATE OR REPLACE FUNCTION public.trg_signal_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.emit_sync_signal('support_ticket.created', 'mp_support_tickets', NEW.id, NEW.user_id,
      jsonb_build_object('subject', NEW.subject), 'notice');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_signal_ticket ON public.mp_support_tickets;
CREATE TRIGGER trg_signal_ticket
  AFTER INSERT ON public.mp_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_signal_ticket();

-- =========================================================
-- 6) Ops overview view — for parent ecosystem monitoring
-- =========================================================
CREATE OR REPLACE VIEW public.email_ops_overview AS
SELECT
  (SELECT COUNT(*) FROM public.email_queue WHERE status='pending') AS pending_count,
  (SELECT COUNT(*) FROM public.email_queue WHERE status='sent'   AND sent_at > now() - interval '24 hours') AS sent_24h,
  (SELECT COUNT(*) FROM public.email_queue WHERE status='failed') AS failed_total,
  (SELECT COUNT(*) FROM public.email_unsubscribes) AS unsubscribes_total,
  (SELECT sent_count FROM public.email_provider_usage WHERE provider='brevo' AND usage_date=CURRENT_DATE) AS brevo_sent_today,
  (SELECT sent_count FROM public.email_provider_usage WHERE provider='resend' AND usage_date=CURRENT_DATE) AS resend_sent_today,
  (SELECT COUNT(*) FROM public.platform_sync_signals WHERE status='new') AS pending_signals;

GRANT SELECT ON public.email_ops_overview TO service_role;

-- =========================================================
-- 7) Documentation for the parent ecosystem AI dev
-- =========================================================
COMMENT ON TABLE public.email_queue IS
'CLIENT APP writes via triggers only. Worker /api/public/hooks/process-email-queue drains it. PARENT ECOSYSTEM can read to monitor and re-enqueue failed items.';
COMMENT ON TABLE public.email_campaigns IS
'PARENT ECOSYSTEM ONLY. Marketing campaigns are managed from the mother ecosystem, not the client app. No client-side UI exposes this table.';
COMMENT ON TABLE public.email_templates IS
'PARENT ECOSYSTEM ONLY. System templates. Client app builds transactional HTML via public.build_email_html() and does NOT manage templates.';
COMMENT ON TABLE public.email_send_history IS
'Per-user audit trail. Users see their own history via RLS. Admins/parent ecosystem see everything.';
COMMENT ON TABLE public.email_unsubscribes IS
'Global opt-out list. enqueue_user_email() checks this before queueing. Parent ecosystem can add entries (bounces, complaints from provider webhooks).';
COMMENT ON TABLE public.email_provider_usage IS
'Daily counters used by pick_email_provider() for Brevo->Resend fallback. Parent ecosystem may reset or adjust caps.';
COMMENT ON TABLE public.platform_settings IS
'PARENT ECOSYSTEM ONLY. Global platform-wide settings; no client UI exposes writes.';
COMMENT ON TABLE public.leads IS
'PARENT ECOSYSTEM ONLY. Read/managed by mother ecosystem CRM.';
COMMENT ON TABLE public.investor_prospects IS
'PARENT ECOSYSTEM ONLY. Investor pipeline consumed by mother ecosystem.';
COMMENT ON TABLE public.mp_funder_connections IS
'Client creates via introductions flow. PARENT ECOSYSTEM handles matching and status transitions.';

COMMENT ON FUNCTION public.enqueue_user_email(uuid, text, text, text, text, text, uuid, jsonb) IS
'Server-only. Called by DB triggers. Respects email_unsubscribes and injects footer with unsubscribe link.';
COMMENT ON FUNCTION public.emit_sync_signal(text, text, uuid, uuid, jsonb, text) IS
'Server-only. Emits a structured signal in platform_sync_signals for the parent ecosystem to pick up.';
