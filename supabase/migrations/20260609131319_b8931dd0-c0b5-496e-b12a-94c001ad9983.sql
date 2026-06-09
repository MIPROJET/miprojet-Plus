
-- Revert has_role to SECURITY INVOKER to avoid new linter warnings
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Standardize tender-imports storage policy
DROP POLICY IF EXISTS tender_imports_admin_only ON storage.objects;
CREATE POLICY tender_imports_admin_only ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'tender-imports' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'tender-imports' AND public.has_role(auth.uid(), 'admin'));
