-- =========================================================
-- 1) mp_projects : suppression de l'accès colonne complète pour anon
-- =========================================================
REVOKE ALL ON public.mp_projects FROM anon;
REVOKE ALL ON public.mp_projects FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_projects TO authenticated;
GRANT ALL ON public.mp_projects TO service_role;

GRANT SELECT (
  id, display_id, title, short_pitch, description, sector, city, country,
  creation_date, legal_status, logo_url, cover_url, product_description,
  target_customers, commercialization, monitoring_evaluation,
  objectif, maturite, governance, project_type, profile_kind,
  is_public, status, created_at, updated_at
) ON public.mp_projects TO anon;

-- La lecture publique reste réservée aux visiteurs anonymes (colonnes sûres).
-- Les utilisateurs connectés passent par la fonction serveur publique.
DROP POLICY IF EXISTS "Public can view public mp_projects" ON public.mp_projects;
CREATE POLICY "Public can view public mp_projects"
  ON public.mp_projects FOR SELECT TO anon
  USING (is_public = true);

-- =========================================================
-- 2) Quotas de plan appliqués en base
-- =========================================================
DROP TRIGGER IF EXISTS trg_enforce_project_quota ON public.mp_projects;
CREATE TRIGGER trg_enforce_project_quota
  BEFORE INSERT ON public.mp_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_quota();

CREATE OR REPLACE FUNCTION public.enforce_voice_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_tier text;
  max_calls int;
  new_count int;
BEGIN
  SELECT COALESCE(tier::text, 'free') INTO plan_tier
  FROM public.mp_user_plans WHERE user_id = NEW.user_id;
  plan_tier := COALESCE(plan_tier, 'free');

  max_calls := CASE plan_tier
    WHEN 'free'   THEN 10
    WHEN 'growth' THEN 200
    ELSE -1
  END;

  new_count := COALESCE(NEW.count, 0);

  IF max_calls > 0 AND new_count > max_calls THEN
    RAISE EXCEPTION 'Quota de transcription vocale dépassé pour le plan % (max %/mois).', plan_tier, max_calls
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_voice_quota() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_voice_quota ON public.mp_voice_usage;
CREATE TRIGGER trg_enforce_voice_quota
  BEFORE INSERT OR UPDATE ON public.mp_voice_usage
  FOR EACH ROW EXECUTE FUNCTION public.enforce_voice_quota();

-- =========================================================
-- 3) mp_org_members : plus d'auto-promotion en 'owner'
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mp_org_members
    WHERE org_id = _org_id AND user_id = auth.uid()
      AND status = 'active' AND role = 'owner'
  ) OR EXISTS (
    SELECT 1 FROM public.mp_organizations o
    WHERE o.id = _org_id AND o.owner_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_org_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_owner(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "org_members_manage" ON public.mp_org_members;

CREATE POLICY "org_members_insert"
  ON public.mp_org_members FOR INSERT TO authenticated
  WITH CHECK (
    can_manage_org(org_id)
    AND (role <> 'owner' OR public.is_org_owner(org_id))
  );

CREATE POLICY "org_members_update"
  ON public.mp_org_members FOR UPDATE TO authenticated
  USING (
    can_manage_org(org_id)
    AND (role <> 'owner' OR public.is_org_owner(org_id))
  )
  WITH CHECK (
    can_manage_org(org_id)
    AND (role <> 'owner' OR public.is_org_owner(org_id))
  );

CREATE POLICY "org_members_delete"
  ON public.mp_org_members FOR DELETE TO authenticated
  USING (
    can_manage_org(org_id)
    AND (role <> 'owner' OR public.is_org_owner(org_id))
  );

-- Empêche tout changement de rôle vers/depuis 'owner' par un non-propriétaire
CREATE OR REPLACE FUNCTION public.mp_guard_org_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND (NEW.role = 'owner' OR OLD.role = 'owner')
     AND NOT public.is_org_owner(NEW.org_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seul le propriétaire de l''organisation peut modifier le rôle propriétaire.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.mp_guard_org_member_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_mp_guard_org_member_role ON public.mp_org_members;
CREATE TRIGGER trg_mp_guard_org_member_role
  BEFORE UPDATE ON public.mp_org_members
  FOR EACH ROW EXECUTE FUNCTION public.mp_guard_org_member_role();

-- =========================================================
-- 4) mp_organizations : owner_id verrouillé
-- =========================================================
DROP POLICY IF EXISTS "org_manager_update" ON public.mp_organizations;
CREATE POLICY "org_manager_update"
  ON public.mp_organizations FOR UPDATE TO authenticated
  USING ((owner_id = auth.uid()) OR can_manage_org(id))
  WITH CHECK ((owner_id = auth.uid()) OR can_manage_org(id));

CREATE OR REPLACE FUNCTION public.mp_guard_org_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id
     AND OLD.owner_id <> auth.uid()
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Seul le propriétaire actuel peut transférer la propriété de l''organisation.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.mp_guard_org_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_mp_guard_org_owner ON public.mp_organizations;
CREATE TRIGGER trg_mp_guard_org_owner
  BEFORE UPDATE ON public.mp_organizations
  FOR EACH ROW EXECUTE FUNCTION public.mp_guard_org_owner();