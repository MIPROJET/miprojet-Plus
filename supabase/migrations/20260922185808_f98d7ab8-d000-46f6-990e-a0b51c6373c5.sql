DROP POLICY IF EXISTS "Users can update their own request details" ON public.service_requests;

CREATE POLICY "Users can update their own pending request details"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND COALESCE(status, 'pending') = 'pending')
WITH CHECK (auth.uid() = user_id AND COALESCE(status, 'pending') = 'pending');

CREATE OR REPLACE FUNCTION public.guard_service_request_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_any_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Seuls les administrateurs peuvent modifier le statut ou les notes internes d''une demande de service';
  END IF;
  RETURN NEW;
END;
$function$;