# Plan SQL à exécuter manuellement — MiProjet+ v1.1

Copier/coller dans l'éditeur SQL Supabase. Tout est idempotent (IF NOT EXISTS / ON CONFLICT) — exécutable plusieurs fois sans risque.

---

## 1. Enrichissement `mp_projects` (identité, budget, gouvernance)

```sql
ALTER TABLE public.mp_projects
  ADD COLUMN IF NOT EXISTS budget_initial numeric,
  ADD COLUMN IF NOT EXISTS objectif text,
  ADD COLUMN IF NOT EXISTS maturite text
    CHECK (maturite IS NULL OR maturite IN ('idee','en_developpement','actif','structure')),
  ADD COLUMN IF NOT EXISTS governance jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.mp_projects.budget_initial IS 'Budget initial du projet (XOF)';
COMMENT ON COLUMN public.mp_projects.objectif IS 'Objectif principal libre';
COMMENT ON COLUMN public.mp_projects.maturite IS 'idee | en_developpement | actif | structure';
COMMENT ON COLUMN public.mp_projects.governance IS 'Mode décisionnel, organes, comités, statut juridique des organes…';
```

---

## 2. Équipe du projet — `mp_project_team`

```sql
CREATE TABLE IF NOT EXISTS public.mp_project_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mp_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  role_title text,
  expertise text,
  bio text,
  photo_url text,
  contact_email text,
  contact_phone text,
  is_external boolean NOT NULL DEFAULT false,
  organization text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_project_team TO authenticated;
GRANT ALL ON public.mp_project_team TO service_role;

ALTER TABLE public.mp_project_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_full_access_team" ON public.mp_project_team
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "public_team_visible" ON public.mp_project_team
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mp_projects p
    WHERE p.id = project_id AND p.is_public = true
  ));

CREATE INDEX IF NOT EXISTS idx_mp_project_team_project ON public.mp_project_team(project_id, sort_order);

CREATE TRIGGER trg_mp_project_team_updated_at
  BEFORE UPDATE ON public.mp_project_team
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 3. Catalogue de services payants (Accompagnement) — `mp_service_catalog`

```sql
CREATE TABLE IF NOT EXISTS public.mp_service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  short_description text,
  description text,
  category text NOT NULL,         -- 'diagnostic','formation','redaction','juridique','financier','marketing','autre'
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'XOF',
  duration text,                  -- ex: '2h', '1 semaine'
  level_required text,            -- 'gratuit','premium','elite' (gating optionnel)
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mp_service_catalog TO anon, authenticated;
GRANT ALL ON public.mp_service_catalog TO service_role;

ALTER TABLE public.mp_service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_catalog_public_read" ON public.mp_service_catalog
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "service_catalog_admin_write" ON public.mp_service_catalog
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mp_service_catalog_updated_at
  BEFORE UPDATE ON public.mp_service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de quelques services
INSERT INTO public.mp_service_catalog (code, title, short_description, category, price, duration, sort_order) VALUES
  ('DIAG_AVANCE', 'Diagnostic 360° avancé', 'Analyse approfondie de votre projet par un expert', 'diagnostic', 25000, '3 jours', 1),
  ('PLAN_AFFAIRE', 'Rédaction Business Plan', 'Business plan bancable rédigé par un expert', 'redaction', 150000, '2 semaines', 2),
  ('COACH_MENSUEL', 'Coaching mensuel', '4 sessions de 1h avec un coach dédié', 'formation', 60000, '1 mois', 3),
  ('STRUCT_JURIDIQUE', 'Structuration juridique', 'Accompagnement immatriculation et statuts', 'juridique', 100000, '3 semaines', 4),
  ('PITCH_INVEST', 'Préparation pitch investisseurs', 'Pitch deck + simulation', 'financier', 75000, '1 semaine', 5)
ON CONFLICT (code) DO NOTHING;
```

---

## 4. Demandes de service — `mp_service_requests` (déjà existant ? sinon)

```sql
CREATE TABLE IF NOT EXISTS public.mp_user_service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.mp_projects(id) ON DELETE SET NULL,
  service_id uuid NOT NULL REFERENCES public.mp_service_catalog(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','in_progress','completed','cancelled','rejected')),
  message text,
  admin_notes text,
  amount_quoted numeric,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mp_user_service_requests TO authenticated;
GRANT ALL ON public.mp_user_service_requests TO service_role;

ALTER TABLE public.mp_user_service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_service_requests" ON public.mp_user_service_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "user_create_service_request" ON public.mp_user_service_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "user_cancel_service_request" ON public.mp_user_service_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status IN ('pending'))
  WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

CREATE POLICY "admin_manage_service_requests" ON public.mp_user_service_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mp_user_service_requests_updated_at
  BEFORE UPDATE ON public.mp_user_service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 5. Recommandations & suivi amélioration — `mp_recommendations`

```sql
CREATE TABLE IF NOT EXISTS public.mp_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.mp_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'auto',   -- 'auto' | 'expert' | 'admin'
  category text NOT NULL,                -- 'identite','equipe','finance','marche','gouvernance','juridique','marketing'
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','low','medium','high','critical')),
  title text NOT NULL,
  description text,
  recommended_action text,
  related_service_code text,             -- lien vers mp_service_catalog.code
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','dismissed')),
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_recommendations TO authenticated;
GRANT ALL ON public.mp_recommendations TO service_role;

ALTER TABLE public.mp_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_recommendations" ON public.mp_recommendations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_recommendations" ON public.mp_recommendations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_mp_reco_project ON public.mp_recommendations(project_id, status);

CREATE TRIGGER trg_mp_recommendations_updated_at
  BEFORE UPDATE ON public.mp_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 6. Mise en relation — `mp_introductions`

```sql
CREATE TABLE IF NOT EXISTS public.mp_introductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES public.mp_projects(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('investor','mentor','partner','client','supplier','other')),
  target_name text,
  target_sector text,
  needs text NOT NULL,
  amount_requested numeric,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','reviewing','matched','introduced','closed','rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.mp_introductions TO authenticated;
GRANT ALL ON public.mp_introductions TO service_role;

ALTER TABLE public.mp_introductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_introductions" ON public.mp_introductions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "owner_create_introduction" ON public.mp_introductions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "admin_introductions" ON public.mp_introductions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_mp_introductions_updated_at
  BEFORE UPDATE ON public.mp_introductions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 7. Augmenter limite upload bucket (vidéo FHD ~400 Mo)

```sql
-- Via le dashboard Supabase (Storage > project-media > Edit bucket)
-- OU via SQL service_role (à exécuter dans l'éditeur SQL avec rôle service_role) :
UPDATE storage.buckets
SET file_size_limit = 419430400  -- 400 Mo
WHERE id = 'project-media';
```

---

**Une fois exécuté, dites "ok" et je continue avec :**
- Refonte complète page publique (équipe, gouvernance, sections premium)
- UI Accompagnement (diagnostic auto, score, reco, catalogue, suivi, mise en relation)
- UI Équipe & Gouvernance dans le formulaire projet
- Champs budget initial / objectif / maturité dans le form
