
-- 1) Justificatifs : colonne sur mp_financial_records
ALTER TABLE public.mp_financial_records
  ADD COLUMN IF NOT EXISTS receipt_path text;

-- 2) Compteur transcriptions vocales (mensuel)
CREATE TABLE IF NOT EXISTS public.mp_voice_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  year_month text NOT NULL, -- format YYYY-MM
  count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_voice_usage TO authenticated;
GRANT ALL ON public.mp_voice_usage TO service_role;

ALTER TABLE public.mp_voice_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_usage_owner_select" ON public.mp_voice_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "voice_usage_owner_modify" ON public.mp_voice_usage
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_mp_voice_usage_updated
  BEFORE UPDATE ON public.mp_voice_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Toggle publication auto sur mp_projects
ALTER TABLE public.mp_projects
  ADD COLUMN IF NOT EXISTS publish_when_eligible boolean NOT NULL DEFAULT false;

-- 4) Storage RLS pour bucket 'documents', dossier mp/<user_id>/...
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='mp_receipts_owner_select') THEN
    CREATE POLICY "mp_receipts_owner_select" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'mp' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='mp_receipts_owner_insert') THEN
    CREATE POLICY "mp_receipts_owner_insert" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'mp' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='mp_receipts_owner_update') THEN
    CREATE POLICY "mp_receipts_owner_update" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'mp' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='mp_receipts_owner_delete') THEN
    CREATE POLICY "mp_receipts_owner_delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'mp' AND (storage.foldername(name))[2] = auth.uid()::text);
  END IF;
END $$;

-- 5) Trigger publication auto vers public.projects quand 'Finançable' et toggle ON
CREATE OR REPLACE FUNCTION public.mp_auto_publish_eligible_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project public.mp_projects%ROWTYPE;
  v_existing_id uuid;
BEGIN
  IF NEW.level IS DISTINCT FROM 'Finançable' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_project FROM public.mp_projects WHERE id = NEW.project_id LIMIT 1;
  IF NOT FOUND OR COALESCE(v_project.publish_when_eligible, false) = false THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_id
  FROM public.projects
  WHERE owner_id = v_project.user_id
    AND metadata->>'mp_project_id' = v_project.id::text
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.projects (owner_id, title, sector, amount_requested, status, source, metadata)
    VALUES (
      v_project.user_id,
      COALESCE(v_project.title, 'Projet MiProjet+'),
      v_project.sector,
      v_project.amount_needed,
      'published',
      'miprojet',
      jsonb_build_object('mp_project_id', v_project.id, 'mp_score', NEW.score)
    );
  ELSE
    UPDATE public.projects
    SET title = COALESCE(v_project.title, title),
        sector = COALESCE(v_project.sector, sector),
        amount_requested = COALESCE(v_project.amount_needed, amount_requested),
        status = 'published',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('mp_project_id', v_project.id, 'mp_score', NEW.score),
        updated_at = now()
    WHERE id = v_existing_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mp_auto_publish ON public.mp_scoring_results;
CREATE TRIGGER trg_mp_auto_publish
  AFTER INSERT OR UPDATE ON public.mp_scoring_results
  FOR EACH ROW EXECUTE FUNCTION public.mp_auto_publish_eligible_project();
