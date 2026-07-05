
-- Workflow historique demandes de services + introductions + notifications automatiques

-- 1) Historique des demandes de services
CREATE TABLE IF NOT EXISTS public.mp_service_request_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.mp_user_service_requests(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mp_service_request_history TO authenticated;
GRANT ALL ON public.mp_service_request_history TO service_role;

ALTER TABLE public.mp_service_request_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own request history" ON public.mp_service_request_history;
CREATE POLICY "owner reads own request history" ON public.mp_service_request_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_user_service_requests r
      WHERE r.id = mp_service_request_history.request_id
        AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "admin inserts request history" ON public.mp_service_request_history;
CREATE POLICY "admin inserts request history" ON public.mp_service_request_history
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR changed_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_msrh_request ON public.mp_service_request_history(request_id, created_at DESC);

-- 2) Trigger: log historique + notification à chaque changement de statut
CREATE OR REPLACE FUNCTION public.log_service_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.mp_service_request_history (request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, NULL, NEW.status, NEW.user_id);
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    VALUES (
      NEW.user_id,
      'Demande enregistrée',
      'Votre demande de service a bien été enregistrée.',
      'service_request',
      '/accompagnement',
      jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
    );
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.mp_service_request_history (request_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
    v_title := CASE NEW.status
      WHEN 'in_review' THEN 'Demande en revue'
      WHEN 'approved' THEN 'Demande approuvée'
      WHEN 'rejected' THEN 'Demande refusée'
      WHEN 'in_progress' THEN 'Traitement en cours'
      WHEN 'completed' THEN 'Demande terminée'
      ELSE 'Statut mis à jour'
    END;
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    VALUES (
      NEW.user_id, v_title, 'Le statut de votre demande a changé.', 'service_request',
      '/accompagnement', jsonb_build_object('request_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_request_history ON public.mp_user_service_requests;
CREATE TRIGGER trg_service_request_history
  AFTER INSERT OR UPDATE ON public.mp_user_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_service_request_status_change();

-- 3) Trigger notifications pour introductions
CREATE OR REPLACE FUNCTION public.notify_introduction_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_title := CASE NEW.status
      WHEN 'accepted' THEN 'Introduction acceptée'
      WHEN 'rejected' THEN 'Introduction refusée'
      WHEN 'in_progress' THEN 'Introduction en cours'
      WHEN 'completed' THEN 'Introduction finalisée'
      ELSE 'Statut de l''introduction mis à jour'
    END;
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    VALUES (
      NEW.user_id, v_title, COALESCE('Cible : ' || NEW.target_name, 'Mise à jour de votre mise en relation.'),
      'introduction', '/accompagnement',
      jsonb_build_object('introduction_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_introduction_notify ON public.mp_introductions;
CREATE TRIGGER trg_introduction_notify
  AFTER UPDATE ON public.mp_introductions
  FOR EACH ROW EXECUTE FUNCTION public.notify_introduction_change();

-- 4) Realtime pour notifications (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;
