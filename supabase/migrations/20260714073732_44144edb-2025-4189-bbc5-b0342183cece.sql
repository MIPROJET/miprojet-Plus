
-- 1. Fix mutable search_path on our custom functions
CREATE OR REPLACE FUNCTION public.role_rank(_r org_role)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT CASE _r WHEN 'owner' THEN 5 WHEN 'admin' THEN 4 WHEN 'manager' THEN 3 WHEN 'member' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END; $$;

CREATE OR REPLACE FUNCTION public.mp_valid_notification_link(_link text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE
    WHEN _link IS NULL THEN '/dashboard'
    WHEN _link LIKE '/project-evaluation/%' THEN '/evaluation'
    WHEN _link IN ('/miprojet-plus/app','/dashboard/invoices','/coaching','/reco') THEN
      CASE _link
        WHEN '/miprojet-plus/app' THEN '/dashboard'
        WHEN '/dashboard/invoices' THEN '/dashboard'
        WHEN '/coaching' THEN '/accompagnement'
        WHEN '/reco' THEN '/accompagnement'
      END
    WHEN _link IN ('/dashboard','/projets','/finances','/score','/accompagnement','/support','/organisation','/documents','/evaluation') THEN _link
    WHEN _link LIKE '/dashboard%' OR _link LIKE '/projets%' OR _link LIKE '/finances%' OR _link LIKE '/score%' OR _link LIKE '/accompagnement%' THEN _link
    ELSE '/dashboard'
  END;
$$;

-- 2. entities: default is_public to false, revoke contact columns from anon
ALTER TABLE public.entities ALTER COLUMN is_public SET DEFAULT false;
REVOKE SELECT (contact_email, contact_phone) ON public.entities FROM anon;

-- 3. mp_documents / mp_document_folders: harden write policies with explicit USING on UPDATE, tighten INSERT
DROP POLICY IF EXISTS "docs_member_write" ON public.mp_documents;
CREATE POLICY "docs_member_write" ON public.mp_documents FOR INSERT TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND (org_id IS NULL OR public.org_role_at_least(org_id, 'member'::org_role))
);

DROP POLICY IF EXISTS "folders_member_write" ON public.mp_document_folders;
CREATE POLICY "folders_member_write" ON public.mp_document_folders FOR ALL TO authenticated
USING (
  owner_id = auth.uid()
  OR (org_id IS NOT NULL AND public.org_role_at_least(org_id, 'manager'::org_role))
)
WITH CHECK (
  owner_id = auth.uid()
  AND (org_id IS NULL OR public.org_role_at_least(org_id, 'manager'::org_role))
);

-- 4. mp_service_request_history: prevent forging entries against others' requests
DROP POLICY IF EXISTS "admin inserts request history" ON public.mp_service_request_history;
CREATE POLICY "history insert ownership check" ON public.mp_service_request_history
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    changed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mp_user_service_requests r
      WHERE r.id = request_id AND r.user_id = auth.uid()
    )
  )
);
