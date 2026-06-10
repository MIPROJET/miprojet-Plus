
-- 1) mp_project_team: hide contact_email / contact_phone from anonymous users (column-level)
REVOKE SELECT ON public.mp_project_team FROM anon;
GRANT SELECT (id, project_id, user_id, full_name, role_title, expertise, bio, photo_url, is_external, organization, sort_order, created_at, updated_at)
  ON public.mp_project_team TO anon;

-- 2) mp_voice_usage: forbid DELETE / row resets
DROP POLICY IF EXISTS voice_usage_owner_modify ON public.mp_voice_usage;
CREATE POLICY voice_usage_owner_insert ON public.mp_voice_usage
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY voice_usage_owner_update ON public.mp_voice_usage
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
REVOKE DELETE ON public.mp_voice_usage FROM authenticated;

-- 3) mp_recommendations: owner can read + update done-state only; admin-only INSERT/DELETE
DROP POLICY IF EXISTS owner_recommendations ON public.mp_recommendations;
CREATE POLICY owner_recommendations_select ON public.mp_recommendations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY owner_recommendations_update ON public.mp_recommendations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4) Server-side enforcement of free-plan ticket quota
CREATE OR REPLACE FUNCTION public.enforce_ticket_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_tier text;
  monthly_count int;
BEGIN
  SELECT COALESCE(tier::text, 'free') INTO plan_tier
  FROM public.mp_user_plans WHERE user_id = NEW.user_id;

  IF COALESCE(plan_tier, 'free') = 'free' THEN
    SELECT COUNT(*) INTO monthly_count
    FROM public.mp_support_tickets
    WHERE user_id = NEW.user_id
      AND date_trunc('month', created_at) = date_trunc('month', now());
    IF monthly_count >= 1 THEN
      RAISE EXCEPTION 'Monthly ticket quota exceeded for free plan';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_ticket_quota() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_ticket_quota ON public.mp_support_tickets;
CREATE TRIGGER trg_enforce_ticket_quota
  BEFORE INSERT ON public.mp_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_quota();
