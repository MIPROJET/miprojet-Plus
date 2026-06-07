
-- Plans
DO $$ BEGIN
  CREATE TYPE public.mp_plan_tier AS ENUM ('free','growth','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.mp_user_plans (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.mp_plan_tier NOT NULL DEFAULT 'free',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mp_user_plans TO authenticated;
GRANT ALL ON public.mp_user_plans TO service_role;
ALTER TABLE public.mp_user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_user_plans_select_own" ON public.mp_user_plans
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mp_user_plans_upsert_own" ON public.mp_user_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mp_user_plans_update_admin" ON public.mp_user_plans
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Support tickets (accompagnement humain)
CREATE TABLE IF NOT EXISTS public.mp_support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'normal',
  plan_at_creation public.mp_plan_tier NOT NULL DEFAULT 'free',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mp_support_tickets_user_idx ON public.mp_support_tickets(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.mp_support_tickets TO authenticated;
GRANT ALL ON public.mp_support_tickets TO service_role;
ALTER TABLE public.mp_support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_tickets_select_own" ON public.mp_support_tickets
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mp_tickets_insert_own" ON public.mp_support_tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mp_tickets_update_own_or_admin" ON public.mp_support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_mp_user_plans_updated ON public.mp_user_plans;
CREATE TRIGGER trg_mp_user_plans_updated BEFORE UPDATE ON public.mp_user_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mp_support_tickets_updated ON public.mp_support_tickets;
CREATE TRIGGER trg_mp_support_tickets_updated BEFORE UPDATE ON public.mp_support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Onboarding flag on profiles (idempotent add)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mp_onboarded_at timestamptz;
