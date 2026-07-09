# Plan SQL à exécuter manuellement — MiProjet+ v1.2

Copier/coller dans l'éditeur SQL Supabase (rôle service_role recommandé pour storage). Idempotent.

---

## 1. Organisation + Équipe (multi-utilisateurs, rôles, permissions)

```sql
-- Enum rôles organisation
DO $$ BEGIN
  CREATE TYPE public.org_role AS ENUM ('owner','admin','manager','member','viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table organisations
CREATE TABLE IF NOT EXISTS public.mp_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  legal_form text,
  sector text,
  country text DEFAULT 'CI',
  city text,
  address text,
  email text,
  phone text,
  website text,
  logo_url text,
  description text,
  registration_number text,
  tax_number text,
  employees_count integer,
  founded_year integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_organizations TO authenticated;
GRANT ALL ON public.mp_organizations TO service_role;
ALTER TABLE public.mp_organizations ENABLE ROW LEVEL SECURITY;

-- Membres organisation
CREATE TABLE IF NOT EXISTS public.mp_org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.mp_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  invited_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_org_members TO authenticated;
GRANT ALL ON public.mp_org_members TO service_role;
ALTER TABLE public.mp_org_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mp_org_members_user ON public.mp_org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_org_members_org ON public.mp_org_members(org_id);

-- Helper: rôle courant dans une org
CREATE OR REPLACE FUNCTION public.current_org_role(_org_id uuid)
RETURNS public.org_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.mp_org_members
  WHERE org_id = _org_id AND user_id = auth.uid() AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mp_org_members
    WHERE org_id = _org_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_org(_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mp_org_members
    WHERE org_id = _org_id AND user_id = auth.uid()
      AND status = 'active' AND role IN ('owner','admin')
  );
$$;

-- Policies organisations
DROP POLICY IF EXISTS "org_member_read" ON public.mp_organizations;
CREATE POLICY "org_member_read" ON public.mp_organizations FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_org_member(id));

DROP POLICY IF EXISTS "org_owner_insert" ON public.mp_organizations;
CREATE POLICY "org_owner_insert" ON public.mp_organizations FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "org_manager_update" ON public.mp_organizations;
CREATE POLICY "org_manager_update" ON public.mp_organizations FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.can_manage_org(id))
  WITH CHECK (owner_id = auth.uid() OR public.can_manage_org(id));

DROP POLICY IF EXISTS "org_owner_delete" ON public.mp_organizations;
CREATE POLICY "org_owner_delete" ON public.mp_organizations FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- Policies membres
DROP POLICY IF EXISTS "org_members_read" ON public.mp_org_members;
CREATE POLICY "org_members_read" ON public.mp_org_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(org_id));

DROP POLICY IF EXISTS "org_members_manage" ON public.mp_org_members;
CREATE POLICY "org_members_manage" ON public.mp_org_members FOR ALL TO authenticated
  USING (public.can_manage_org(org_id))
  WITH CHECK (public.can_manage_org(org_id));

-- Trigger : ajoute owner comme membre 'owner'
CREATE OR REPLACE FUNCTION public.mp_org_add_owner_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.mp_org_members (org_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active')
  ON CONFLICT (org_id, user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mp_org_add_owner ON public.mp_organizations;
CREATE TRIGGER trg_mp_org_add_owner AFTER INSERT ON public.mp_organizations
  FOR EACH ROW EXECUTE FUNCTION public.mp_org_add_owner_member();

CREATE TRIGGER trg_mp_org_updated_at BEFORE UPDATE ON public.mp_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_org_members_updated_at BEFORE UPDATE ON public.mp_org_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 2. Espace documentaire (dossiers + fichiers)

```sql
CREATE TABLE IF NOT EXISTS public.mp_document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.mp_organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  parent_id uuid REFERENCES public.mp_document_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_document_folders TO authenticated;
GRANT ALL ON public.mp_document_folders TO service_role;
ALTER TABLE public.mp_document_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.mp_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.mp_organizations(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  folder_id uuid REFERENCES public.mp_document_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  storage_path text NOT NULL,      -- chemin dans bucket 'documents'
  mime_type text,
  size_bytes bigint,
  category text,                   -- 'legal','financial','commercial','hr','other'
  tags text[] DEFAULT '{}',
  min_role public.org_role NOT NULL DEFAULT 'member',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_documents TO authenticated;
GRANT ALL ON public.mp_documents TO service_role;
ALTER TABLE public.mp_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_mp_docs_org ON public.mp_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_mp_docs_folder ON public.mp_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_mp_docs_search ON public.mp_documents USING gin (to_tsvector('french', coalesce(name,'') || ' ' || coalesce(description,'')));

-- Helper : rôle ≥ min_role dans org
CREATE OR REPLACE FUNCTION public.role_rank(_r public.org_role)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _r
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'manager' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.org_role_at_least(_org uuid, _min public.org_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    public.role_rank(public.current_org_role(_org)) >= public.role_rank(_min),
    false
  );
$$;

-- Policies folders
DROP POLICY IF EXISTS "folders_member_read" ON public.mp_document_folders;
CREATE POLICY "folders_member_read" ON public.mp_document_folders FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.is_org_member(org_id)));

DROP POLICY IF EXISTS "folders_member_write" ON public.mp_document_folders;
CREATE POLICY "folders_member_write" ON public.mp_document_folders FOR ALL TO authenticated
  USING (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'manager')))
  WITH CHECK (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'manager')));

-- Policies docs
DROP POLICY IF EXISTS "docs_member_read" ON public.mp_documents;
CREATE POLICY "docs_member_read" ON public.mp_documents FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR (org_id IS NOT NULL AND public.is_org_member(org_id)
        AND public.role_rank(public.current_org_role(org_id)) >= public.role_rank(min_role))
  );

DROP POLICY IF EXISTS "docs_member_write" ON public.mp_documents;
CREATE POLICY "docs_member_write" ON public.mp_documents FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND (org_id IS NULL OR public.org_role_at_least(org_id,'member'))
  );

DROP POLICY IF EXISTS "docs_owner_update" ON public.mp_documents;
CREATE POLICY "docs_owner_update" ON public.mp_documents FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'manager')))
  WITH CHECK (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'manager')));

DROP POLICY IF EXISTS "docs_owner_delete" ON public.mp_documents;
CREATE POLICY "docs_owner_delete" ON public.mp_documents FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'admin')));

CREATE TRIGGER trg_mp_document_folders_updated_at BEFORE UPDATE ON public.mp_document_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_mp_documents_updated_at BEFORE UPDATE ON public.mp_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## 3. Module d'évaluation & maturité (6 axes)

```sql
CREATE TABLE IF NOT EXISTS public.mp_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.mp_organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.mp_projects(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  -- 6 axes /100
  gouvernance integer NOT NULL DEFAULT 0 CHECK (gouvernance BETWEEN 0 AND 100),
  finance integer NOT NULL DEFAULT 0 CHECK (finance BETWEEN 0 AND 100),
  organisation integer NOT NULL DEFAULT 0 CHECK (organisation BETWEEN 0 AND 100),
  marche integer NOT NULL DEFAULT 0 CHECK (marche BETWEEN 0 AND 100),
  equipe integer NOT NULL DEFAULT 0 CHECK (equipe BETWEEN 0 AND 100),
  potentiel_croissance integer NOT NULL DEFAULT 0 CHECK (potentiel_croissance BETWEEN 0 AND 100),
  score_global integer GENERATED ALWAYS AS (
    (gouvernance + finance + organisation + marche + equipe + potentiel_croissance) / 6
  ) STORED,
  niveau text GENERATED ALWAYS AS (
    CASE
      WHEN (gouvernance + finance + organisation + marche + equipe + potentiel_croissance) / 6 >= 80 THEN 'Finançable'
      WHEN (gouvernance + finance + organisation + marche + equipe + potentiel_croissance) / 6 >= 60 THEN 'Structuré'
      WHEN (gouvernance + finance + organisation + marche + equipe + potentiel_croissance) / 6 >= 40 THEN 'En construction'
      ELSE 'Émergent'
    END
  ) STORED,
  published_to_invest boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_evaluations TO authenticated;
GRANT ALL ON public.mp_evaluations TO service_role;
ALTER TABLE public.mp_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eval_member_read" ON public.mp_evaluations;
CREATE POLICY "eval_member_read" ON public.mp_evaluations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (org_id IS NOT NULL AND public.is_org_member(org_id)));

DROP POLICY IF EXISTS "eval_member_write" ON public.mp_evaluations;
CREATE POLICY "eval_member_write" ON public.mp_evaluations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'manager')))
  WITH CHECK (user_id = auth.uid() OR (org_id IS NOT NULL AND public.org_role_at_least(org_id,'manager')));

CREATE TRIGGER trg_mp_evaluations_updated_at BEFORE UPDATE ON public.mp_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Publication auto vers MiPROJET Invest quand Finançable
CREATE OR REPLACE FUNCTION public.mp_evaluation_publish_to_invest()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pid uuid;
BEGIN
  IF NEW.niveau = 'Finançable' AND (OLD.niveau IS NULL OR OLD.niveau <> 'Finançable') THEN
    UPDATE public.mp_evaluations SET published_to_invest = true, published_at = now() WHERE id = NEW.id;
    IF NEW.project_id IS NOT NULL THEN
      UPDATE public.projects
        SET is_public = true, status = 'published', mp_score = NEW.score_global,
            metadata = COALESCE(metadata,'{}'::jsonb) || jsonb_build_object('mp_evaluation_id', NEW.id, 'mp_niveau', NEW.niveau)
        WHERE metadata->>'mp_project_id' = NEW.project_id::text;
    END IF;
    INSERT INTO public.notifications (user_id, title, message, type, link, metadata)
    VALUES (NEW.user_id, 'Projet Finançable !', 'Votre projet est publié automatiquement sur MiPROJET Invest.',
            'evaluation', '/evaluation', jsonb_build_object('evaluation_id', NEW.id));
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_mp_eval_publish ON public.mp_evaluations;
CREATE TRIGGER trg_mp_eval_publish AFTER INSERT OR UPDATE ON public.mp_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.mp_evaluation_publish_to_invest();
```

---

## 4. Correction des liens de notifications (redirige vers routes existantes MiPROJET+)

```sql
-- Normalisation des liens legacy issus de l'écosystème
UPDATE public.notifications SET link = '/dashboard'      WHERE link = '/miprojet-plus/app';
UPDATE public.notifications SET link = '/dashboard'      WHERE link = '/dashboard/invoices';
UPDATE public.notifications SET link = '/evaluation'     WHERE link LIKE '/project-evaluation/%';
UPDATE public.notifications SET link = '/accompagnement' WHERE link = '/coaching' OR link = '/reco';
UPDATE public.notifications SET link = '/dashboard'      WHERE link IS NULL AND type IN ('access_request','project_update','certification');

-- Guard : fonction utilitaire pour valider un lien connu (à utiliser dans les triggers écosystème)
CREATE OR REPLACE FUNCTION public.mp_valid_notification_link(_link text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
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

-- Trigger : nettoie automatiquement les nouveaux liens à l'insertion
CREATE OR REPLACE FUNCTION public.mp_normalize_notification_link()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.link := public.mp_valid_notification_link(NEW.link);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notifications_normalize_link ON public.notifications;
CREATE TRIGGER trg_notifications_normalize_link
  BEFORE INSERT OR UPDATE OF link ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.mp_normalize_notification_link();
```

---

## 5. Signal écosystème (informe MiPROJET Invest / équipe centrale)

```sql
INSERT INTO public.platform_sync_signals
  (signal_type, severity, source_table, source_id, actor_user_id, payload)
VALUES (
  'miprojet_plus.v1_2_orgs_docs_eval', 'notice', 'mp_organizations',
  gen_random_uuid(), NULL,
  jsonb_build_object(
    'modules', jsonb_build_array('mp_organizations','mp_org_members','mp_documents','mp_document_folders','mp_evaluations'),
    'routes',  jsonb_build_array('/organisation','/documents','/evaluation'),
    'notif_link_normalization', true
  )
);
```
