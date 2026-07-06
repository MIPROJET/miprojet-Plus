
-- =========================================================
-- 1) History table for send audit trail
-- =========================================================
CREATE TABLE IF NOT EXISTS public.email_send_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  recipient_email text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  entity_type text,
  entity_id uuid,
  status text NOT NULL DEFAULT 'queued',
  queue_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_send_history TO authenticated;
GRANT ALL ON public.email_send_history TO service_role;

ALTER TABLE public.email_send_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_email_history" ON public.email_send_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_email_send_history_user ON public.email_send_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_send_history_entity ON public.email_send_history(entity_type, entity_id);

-- =========================================================
-- 2) enqueue_user_email — file un email pour un user
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_queue_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = _user_id;
  IF v_email IS NULL OR v_email = '' THEN RETURN NULL; END IF;
  IF public.is_email_unsubscribed(v_email) THEN RETURN NULL; END IF;

  INSERT INTO public.email_queue (
    to_email, subject, html, text_content, kind,
    recipient_user_id, from_address, status, scheduled_for
  ) VALUES (
    v_email, _subject, _html, COALESCE(_text, regexp_replace(_html, '<[^>]+>', '', 'g')),
    'transactional', _user_id, 'MiProjet <info@ivoireprojet.com>', 'pending', now()
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
-- 3) Helper: build a branded HTML wrapper
-- =========================================================
CREATE OR REPLACE FUNCTION public.build_email_html(_title text, _body_html text, _cta_label text DEFAULT NULL, _cta_url text DEFAULT NULL)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT format($html$
<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1d1d1f">
<table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.04)">
<tr><td style="padding:28px 32px;border-bottom:1px solid #eee;background:#0a0a0a;color:#fff">
<div style="font-weight:700;font-size:18px;letter-spacing:.3px">MiProjet</div>
</td></tr>
<tr><td style="padding:32px">
<h1 style="margin:0 0 16px;font-size:20px;font-weight:600">%s</h1>
<div style="font-size:15px;line-height:1.6;color:#333">%s</div>
%s
</td></tr>
<tr><td style="padding:20px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#86868b">
Cet email vous a été envoyé par MiProjet — info@ivoireprojet.com<br>
Vous pouvez gérer vos préférences depuis votre espace.
</td></tr>
</table>
</td></tr></table>
</body></html>
  $html$, _title, _body_html,
    CASE WHEN _cta_url IS NOT NULL AND _cta_label IS NOT NULL
      THEN format('<div style="margin-top:24px"><a href="%s" style="display:inline-block;background:#0a0a0a;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">%s</a></div>', _cta_url, _cta_label)
      ELSE '' END
  );
$$;

-- =========================================================
-- 4) Trigger: service requests status → notif + email
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_service_request_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text; v_msg text; v_html text; v_url text := 'https://project-ivoire-shine.lovable.app/accompagnement';
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := 'Demande de service enregistrée';
    v_msg   := 'Nous avons bien reçu votre demande. Notre équipe la traite sous peu.';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_title := CASE NEW.status
      WHEN 'in_review'   THEN 'Votre demande est en cours d''examen'
      WHEN 'accepted'    THEN 'Votre demande a été approuvée'
      WHEN 'approved'    THEN 'Votre demande a été approuvée'
      WHEN 'rejected'    THEN 'Votre demande a été refusée'
      WHEN 'in_progress' THEN 'Traitement en cours'
      WHEN 'completed'   THEN 'Votre demande est terminée'
      WHEN 'cancelled'   THEN 'Votre demande a été annulée'
      ELSE 'Mise à jour de votre demande'
    END;
    v_msg := 'Le statut de votre demande de service est passé à « ' || NEW.status || ' ».';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (NEW.user_id, v_title, v_msg, 'service_request', '/accompagnement',
          jsonb_build_object('request_id', NEW.id, 'status', NEW.status));

  v_html := public.build_email_html(v_title, '<p>'||v_msg||'</p>', 'Voir ma demande', v_url);
  PERFORM public.enqueue_user_email(
    NEW.user_id, 'service_request', v_title, v_html, v_msg,
    'mp_user_service_requests', NEW.id,
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_service_request ON public.mp_user_service_requests;
CREATE TRIGGER trg_notify_service_request
  AFTER INSERT OR UPDATE OF status ON public.mp_user_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_service_request_change();

-- =========================================================
-- 5) Trigger: introductions → notif + email
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_introduction_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text; v_msg text; v_html text; v_url text := 'https://project-ivoire-shine.lovable.app/accompagnement';
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := 'Mise en relation enregistrée';
    v_msg   := 'Votre demande de mise en relation a bien été reçue.';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_title := CASE NEW.status
      WHEN 'reviewing'  THEN 'Votre mise en relation est à l''étude'
      WHEN 'matched'    THEN 'Match trouvé pour votre mise en relation'
      WHEN 'accepted'   THEN 'Mise en relation acceptée'
      WHEN 'introduced' THEN 'Vous avez été présenté(e)'
      WHEN 'rejected'   THEN 'Mise en relation refusée'
      WHEN 'in_progress'THEN 'Mise en relation en cours'
      WHEN 'completed'  THEN 'Mise en relation finalisée'
      WHEN 'closed'     THEN 'Mise en relation clôturée'
      ELSE 'Mise à jour de votre mise en relation'
    END;
    v_msg := COALESCE('Cible : '||NEW.target_name, 'Nouvelle mise à jour disponible.');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (NEW.user_id, v_title, v_msg, 'introduction', '/accompagnement',
          jsonb_build_object('introduction_id', NEW.id, 'status', NEW.status));

  v_html := public.build_email_html(v_title, '<p>'||v_msg||'</p>', 'Voir mes mises en relation', v_url);
  PERFORM public.enqueue_user_email(
    NEW.user_id, 'introduction', v_title, v_html, v_msg,
    'mp_introductions', NEW.id,
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_introduction_email ON public.mp_introductions;
CREATE TRIGGER trg_notify_introduction_email
  AFTER INSERT OR UPDATE OF status ON public.mp_introductions
  FOR EACH ROW EXECUTE FUNCTION public.notify_introduction_email();

-- =========================================================
-- 6) Trigger: new recommendation → notif + email
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_new_recommendation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text := 'Nouvelle recommandation pour votre projet';
  v_msg text; v_html text; v_url text := 'https://project-ivoire-shine.lovable.app/accompagnement';
BEGIN
  v_msg := COALESCE(NEW.title, 'Une nouvelle recommandation est disponible.');
  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (NEW.user_id, v_title, v_msg, 'recommendation', '/accompagnement',
          jsonb_build_object('recommendation_id', NEW.id, 'category', NEW.category, 'severity', NEW.severity));

  v_html := public.build_email_html(
    v_title,
    '<p><strong>'||COALESCE(NEW.title,'')||'</strong></p><p>'||COALESCE(NEW.description,'')||'</p>'||
    CASE WHEN NEW.recommended_action IS NOT NULL
      THEN '<p style="margin-top:12px;padding:12px;background:#fafafa;border-radius:8px"><strong>Action recommandée :</strong> '||NEW.recommended_action||'</p>'
      ELSE '' END,
    'Voir la recommandation', v_url
  );
  PERFORM public.enqueue_user_email(
    NEW.user_id, 'recommendation', v_title, v_html, v_msg,
    'mp_recommendations', NEW.id,
    jsonb_build_object('category', NEW.category, 'severity', NEW.severity)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_new_reco ON public.mp_recommendations;
CREATE TRIGGER trg_notify_new_reco
  AFTER INSERT ON public.mp_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_recommendation();

-- =========================================================
-- 7) Trigger: support tickets → notif + email
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_support_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text; v_msg text; v_html text; v_url text := 'https://project-ivoire-shine.lovable.app/support';
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_title := 'Ticket support enregistré';
    v_msg   := 'Nous avons reçu votre ticket support. Notre équipe vous répondra rapidement.';
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_title := 'Mise à jour de votre ticket support';
    v_msg   := 'Le statut de votre ticket est passé à « ' || NEW.status || ' ».';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
  VALUES (NEW.user_id, v_title, v_msg, 'support', '/support',
          jsonb_build_object('ticket_id', NEW.id, 'status', NEW.status));

  v_html := public.build_email_html(v_title, '<p>'||v_msg||'</p>', 'Voir mon ticket', v_url);
  PERFORM public.enqueue_user_email(
    NEW.user_id, 'support', v_title, v_html, v_msg,
    'mp_support_tickets', NEW.id,
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_support_ticket ON public.mp_support_tickets;
CREATE TRIGGER trg_notify_support_ticket
  AFTER INSERT OR UPDATE OF status ON public.mp_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket();

-- =========================================================
-- 8) Retry helper for the queue worker
-- =========================================================
CREATE OR REPLACE FUNCTION public.mark_email_sent(_id uuid, _provider text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.email_queue SET status='sent', sent_at=now(), updated_at=now(), last_error=NULL WHERE id=_id;
  UPDATE public.email_send_history SET status='sent', metadata = metadata || jsonb_build_object('provider', _provider) WHERE queue_id=_id;
$$;

CREATE OR REPLACE FUNCTION public.mark_email_failed(_id uuid, _error text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.email_queue
    SET status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'pending' END,
        attempts = attempts + 1,
        last_error = _error,
        scheduled_for = CASE WHEN attempts + 1 >= 3 THEN scheduled_for ELSE now() + interval '5 minutes' END,
        updated_at = now()
    WHERE id = _id;
  UPDATE public.email_send_history SET status='failed', metadata = metadata || jsonb_build_object('error', _error) WHERE queue_id = _id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_email_sent(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_email_failed(uuid, text) TO service_role;
