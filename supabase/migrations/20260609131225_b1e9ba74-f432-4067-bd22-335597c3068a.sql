
-- 1) Prevent tier escalation via mp_user_plans self-insert
DROP POLICY IF EXISTS mp_user_plans_upsert_own ON public.mp_user_plans;
CREATE POLICY mp_user_plans_insert_own_free ON public.mp_user_plans
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND tier::text = 'free');

-- 2) Prevent user_subscriptions self-insert (server-only)
DROP POLICY IF EXISTS "Users can insert pending subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can cancel own subscription" ON public.user_subscriptions;
-- Allow only cancel via status -> 'cancelled', keep no other user mutations
CREATE POLICY "Users can cancel own subscription"
  ON public.user_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- 3) tender_interests: drop JWT-email-based policies; admin-only read/delete
DROP POLICY IF EXISTS tender_interests_submitter_select ON public.tender_interests;
DROP POLICY IF EXISTS tender_interests_submitter_delete ON public.tender_interests;

-- 4) Harden has_role(): SECURITY DEFINER so RLS on user_roles cannot break checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;
