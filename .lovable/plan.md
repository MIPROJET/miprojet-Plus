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

---

## 6. Module Analyse Financière — Vues, colonnes, index (v1.2)

Ces objets ne sont pas obligatoires pour que le module `/finances/analyse`
fonctionne (l'agrégation est faite côté client à partir de `mp_financial_records`),
mais ils accélèrent les rapports côté écosystème (MiPROJET Invest / Admin).

```sql
-- Nouvelles colonnes structurantes sur les opérations financières
ALTER TABLE public.mp_financial_records
  ADD COLUMN IF NOT EXISTS party_name text,
  ADD COLUMN IF NOT EXISTS funding_source text,
  ADD COLUMN IF NOT EXISTS budget_line text,
  ADD COLUMN IF NOT EXISTS is_in_kind boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mp_fin_party    ON public.mp_financial_records(party_name);
CREATE INDEX IF NOT EXISTS idx_mp_fin_source   ON public.mp_financial_records(funding_source);
CREATE INDEX IF NOT EXISTS idx_mp_fin_category ON public.mp_financial_records(category);
CREATE INDEX IF NOT EXISTS idx_mp_fin_project_date ON public.mp_financial_records(project_id, record_date);

-- Backfill : extraire "Source : Nom" depuis les descriptions historiques
UPDATE public.mp_financial_records
   SET party_name = trim(substring(description from 'Source\s*:\s*([^—\n]+)'))
 WHERE party_name IS NULL
   AND description ~* 'Source\s*:';

-- Backfill : source de financement standardisée à partir du record_type
UPDATE public.mp_financial_records SET funding_source = CASE record_type
  WHEN 'apport_associe'  THEN 'Associés'
  WHEN 'investissement'  THEN 'Investisseurs'
  WHEN 'don'             THEN 'Dons/Subventions'
  WHEN 'pret'            THEN 'Prêts/Banque'
  WHEN 'vente'           THEN 'Ventes/Clients'
  WHEN 'encaissement'    THEN 'Encaissements'
  ELSE NULL END
WHERE funding_source IS NULL
  AND record_type IN ('apport_associe','investissement','don','pret','vente','encaissement');

-- Vue agrégée par contributeur (associés, banques, partenaires)
CREATE OR REPLACE VIEW public.v_mp_financial_by_party AS
SELECT
  project_id,
  COALESCE(party_name, funding_source, 'Non identifié') AS contributor,
  count(*) AS operations,
  sum(amount) FILTER (WHERE record_type IN ('vente','encaissement','apport_associe','pret','don','investissement')) AS total_in,
  sum(amount) FILTER (WHERE record_type NOT IN ('vente','encaissement','apport_associe','pret','don','investissement')) AS total_out
FROM public.mp_financial_records
GROUP BY project_id, COALESCE(party_name, funding_source, 'Non identifié');

-- Vue agrégée par catégorie de dépenses
CREATE OR REPLACE VIEW public.v_mp_financial_by_category AS
SELECT
  project_id,
  COALESCE(category, 'Non classé') AS category,
  count(*) AS operations,
  sum(amount) AS total
FROM public.mp_financial_records
WHERE record_type NOT IN ('vente','encaissement','apport_associe','pret','don','investissement')
GROUP BY project_id, COALESCE(category, 'Non classé');

-- Vue agrégée par mois (pour dashboards écosystème)
CREATE OR REPLACE VIEW public.v_mp_financial_by_month AS
SELECT
  project_id,
  date_trunc('month', record_date)::date AS period,
  sum(amount) FILTER (WHERE record_type IN ('vente','encaissement','apport_associe','pret','don','investissement')) AS total_in,
  sum(amount) FILTER (WHERE record_type NOT IN ('vente','encaissement','apport_associe','pret','don','investissement')) AS total_out,
  count(*) AS operations
FROM public.mp_financial_records
GROUP BY project_id, date_trunc('month', record_date);

GRANT SELECT ON public.v_mp_financial_by_party TO authenticated, service_role;
GRANT SELECT ON public.v_mp_financial_by_category TO authenticated, service_role;
GRANT SELECT ON public.v_mp_financial_by_month TO authenticated, service_role;

-- Fonction : pourcentages d'apport par contributeur (utilisable par MiPROJET Invest)
CREATE OR REPLACE FUNCTION public.mp_contributor_shares(_project_id uuid)
RETURNS TABLE(contributor text, total_in numeric, share_percent numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT contributor, COALESCE(total_in,0) AS total_in
    FROM public.v_mp_financial_by_party
    WHERE project_id = _project_id
  ), tot AS (SELECT NULLIF(sum(total_in),0) AS s FROM base)
  SELECT b.contributor, b.total_in,
         ROUND((b.total_in / (SELECT s FROM tot)) * 100, 2)
  FROM base b
  WHERE b.total_in > 0
  ORDER BY b.total_in DESC;
$$;

-- Signal écosystème
INSERT INTO public.platform_sync_signals
  (signal_type, severity, source_table, source_id, actor_user_id, payload)
VALUES (
  'miprojet_plus.v1_2_financial_analytics', 'notice', 'mp_financial_records',
  gen_random_uuid(), NULL,
  jsonb_build_object(
    'views', jsonb_build_array('v_mp_financial_by_party','v_mp_financial_by_category','v_mp_financial_by_month'),
    'functions', jsonb_build_array('mp_contributor_shares')
  )
);
```

---

## §7 — Automatisation Scoring & Maturité + Sync Écosystème

Objectif : mettre à jour automatiquement `mp_project_score` et le niveau
de maturité dès qu'une donnée source change (profil projet, équipe,
gouvernance, finances, documents, évaluation), exposer les mêmes agrégats
en lecture à l'écosystème MiPROJET Invest, et rendre l'édition
disponible depuis l'espace admin ET l'espace équipe (membres du projet).

À exécuter manuellement dans Supabase SQL editor.

```sql
-- 7.1 Fonction canonique de recomputation
create or replace function public.mp_recompute_score(_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_juridique int := 0;
  v_financier int := 0;
  v_technique int := 0;
  v_marche    int := 0;
  v_equipe    int := 0;
  v_impact    int := 0;
  v_global    int;
  v_niveau    text;
  v_has_docs  boolean;
  v_has_team  int;
  v_has_gov   int;
  v_has_ops   int;
  v_balance   numeric;
  v_incomes   numeric;
  v_maturity  text;
begin
  -- Juridique (docs légaux)
  select count(*) > 0 into v_has_docs
    from public.mp_documents where project_id = _project_id and category in ('juridique','legal','statuts');
  v_juridique := case when v_has_docs then 15 else 5 end;

  -- Financier (opérations et solde)
  select coalesce(sum(case when type='income' then amount else 0 end),0),
         coalesce(sum(case when type='income' then amount else -amount end),0),
         count(*)
    into v_incomes, v_balance, v_has_ops
    from public.mp_financial_operations where project_id = _project_id;
  v_financier := least(25, (case when v_has_ops>0 then 10 else 0 end)
                            + (case when v_incomes>0 then 10 else 0 end)
                            + (case when v_balance>=0 then 5 else 0 end));

  -- Technique (documents techniques + description)
  v_technique := 10 + (select case when char_length(coalesce(description,''))>200 then 10 else 0 end
                        from public.mp_projects where id=_project_id);

  -- Marché (pitch, marché renseignés)
  select case when coalesce(char_length(market),0)>100 then 15 else 5 end
    into v_marche from public.mp_projects where id=_project_id;

  -- Équipe & gouvernance
  select count(*) into v_has_team from public.mp_project_team where project_id=_project_id;
  select count(*) into v_has_gov  from public.mp_project_governance where project_id=_project_id;
  v_equipe := least(10, v_has_team*2 + v_has_gov);

  -- Impact (évaluation maturité renseignée)
  v_impact := coalesce((select round(avg(score)::int/2)
                          from public.mp_maturity_evaluation where project_id=_project_id), 5);

  v_global := least(100, v_juridique + v_financier + v_technique + v_marche + v_equipe + v_impact);

  v_niveau := case
    when v_global >= 80 then 'Finançable'
    when v_global >= 60 then 'Prometteur'
    when v_global >= 40 then 'En consolidation'
    else 'Émergent'
  end;

  v_maturity := case
    when v_global >= 80 then 'Mature'
    when v_global >= 60 then 'Structuré'
    when v_global >= 40 then 'En structuration'
    else 'Idée'
  end;

  insert into public.mp_project_score
    (project_id, score_juridique, score_financier, score_technique,
     score_marche, score_equipe, score_impact, score_global, niveau, maturite, updated_at)
  values (_project_id, v_juridique, v_financier, v_technique,
          v_marche, v_equipe, v_impact, v_global, v_niveau, v_maturity, now())
  on conflict (project_id) do update set
    score_juridique = excluded.score_juridique,
    score_financier = excluded.score_financier,
    score_technique = excluded.score_technique,
    score_marche    = excluded.score_marche,
    score_equipe    = excluded.score_equipe,
    score_impact    = excluded.score_impact,
    score_global    = excluded.score_global,
    niveau          = excluded.niveau,
    maturite        = excluded.maturite,
    updated_at      = now();
end;
$$;

-- Ajout de la colonne maturité si manquante
alter table public.mp_project_score
  add column if not exists maturite text;

-- 7.2 Trigger générique pour recalculer à chaque changement source
create or replace function public.mp_trigger_recompute()
returns trigger language plpgsql security definer set search_path=public as $$
declare _pid uuid;
begin
  _pid := coalesce(new.project_id, old.project_id);
  if _pid is not null then perform public.mp_recompute_score(_pid); end if;
  return coalesce(new, old);
end;$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'mp_projects','mp_financial_operations','mp_project_team',
    'mp_project_governance','mp_documents','mp_maturity_evaluation'
  ]) loop
    execute format('drop trigger if exists trg_recompute_%1$s on public.%1$s;', t);
    execute format($f$
      create trigger trg_recompute_%1$s
      after insert or update or delete on public.%1$s
      for each row execute function public.mp_trigger_recompute();
    $f$, t);
  end loop;
end$$;

-- 7.3 Vue partagée pour l'écosystème MiPROJET Invest (lecture)
create or replace view public.v_mp_ecosystem_scoring as
select p.id as project_id, p.name, p.owner_id, p.visibility,
       s.score_global, s.niveau, s.maturite,
       s.score_juridique, s.score_financier, s.score_technique,
       s.score_marche, s.score_equipe, s.score_impact,
       s.updated_at
from public.mp_projects p
left join public.mp_project_score s on s.project_id = p.id
where coalesce(p.visibility,'private') in ('public','ecosystem');

grant select on public.v_mp_ecosystem_scoring to anon, authenticated;

-- 7.4 RLS : édition admin + membres équipe du projet
alter table public.mp_project_score enable row level security;

drop policy if exists "score_read_owner_team_admin" on public.mp_project_score;
create policy "score_read_owner_team_admin" on public.mp_project_score
for select to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists(select 1 from public.mp_projects p
             where p.id=project_id and p.owner_id=auth.uid())
  or exists(select 1 from public.mp_project_team t
             where t.project_id=mp_project_score.project_id
               and t.user_id=auth.uid())
);

drop policy if exists "score_write_admin_or_team" on public.mp_project_score;
create policy "score_write_admin_or_team" on public.mp_project_score
for update to authenticated using (
  public.has_role(auth.uid(),'admin')
  or exists(select 1 from public.mp_project_team t
             where t.project_id=mp_project_score.project_id
               and t.user_id=auth.uid()
               and t.role in ('owner','manager','editor'))
) with check (
  public.has_role(auth.uid(),'admin')
  or exists(select 1 from public.mp_project_team t
             where t.project_id=mp_project_score.project_id
               and t.user_id=auth.uid()
               and t.role in ('owner','manager','editor'))
);

-- 7.5 Backfill initial
do $$ declare r record;
begin
  for r in select id from public.mp_projects loop
    perform public.mp_recompute_score(r.id);
  end loop;
end$$;

-- 7.6 Marqueur
insert into public.mp_platform_meta(key,value)
values ('scoring_automation_v1', jsonb_build_object(
  'triggers','installed','view','v_mp_ecosystem_scoring','ts',now()
))
on conflict (key) do update set value=excluded.value;
```

Une fois exécuté : chaque insert/update/delete sur les tables sources
recalcule le score et la maturité, l'écosystème lit
`v_mp_ecosystem_scoring`, et l'admin comme les membres équipe
(owner/manager/editor) peuvent éditer via l'UI existante.
