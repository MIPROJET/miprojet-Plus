-- 0. Support de 3 justificatifs par opération
ALTER TABLE public.mp_financial_records
  ADD COLUMN IF NOT EXISTS receipt_paths text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.mp_financial_records
   SET receipt_paths = ARRAY[receipt_path]
 WHERE receipt_path IS NOT NULL AND cardinality(receipt_paths) = 0;

DO $$
DECLARE
  pid uuid := 'b7024000-fc34-4706-8901-2ce092283dbc';
  uid uuid;
  ferdinand uuid;
  cesar uuid;
  inocent uuid;
  src_id uuid;
  deficit numeric := 0;
BEGIN
  SELECT user_id INTO uid FROM public.mp_project_stakeholders WHERE project_id = pid LIMIT 1;

  -- 1. Supprimer les doublons d'acteurs, garder les noms officiels
  UPDATE public.mp_financial_records f
     SET stakeholder_id = NULL
   WHERE f.project_id = pid
     AND f.stakeholder_id IN (
       SELECT id FROM public.mp_project_stakeholders
        WHERE project_id = pid AND name IN ('Inocent KOFFI','KOUAKOU Kouamé Jacques')
     );
  DELETE FROM public.mp_project_stakeholders
   WHERE project_id = pid AND name IN ('Inocent KOFFI','KOUAKOU Kouamé Jacques');

  UPDATE public.mp_project_stakeholders
     SET name = 'YEBOUE AMANI CÉSAR', stakeholder_type = 'associe'
   WHERE project_id = pid AND name = 'YEBOUET AMANI CÉSAR';

  UPDATE public.mp_project_stakeholders
     SET stakeholder_type = 'associe'
   WHERE project_id = pid AND name = 'KOUAME KOUADIO JULIEN';

  INSERT INTO public.mp_project_stakeholders (project_id, user_id, name, stakeholder_type)
  SELECT pid, uid, 'KOFFI KOUAME FERDINAND', 'associe'
   WHERE NOT EXISTS (
     SELECT 1 FROM public.mp_project_stakeholders
      WHERE project_id = pid AND name = 'KOFFI KOUAME FERDINAND');

  -- Rôles : uniquement « Fondateur » pour KOFFI INOCENT
  UPDATE public.mp_project_stakeholders
     SET role = CASE WHEN name = 'KOFFI INOCENT' THEN 'Fondateur' ELSE NULL END
   WHERE project_id = pid;

  SELECT id INTO ferdinand FROM public.mp_project_stakeholders WHERE project_id = pid AND name = 'KOFFI KOUAME FERDINAND';
  SELECT id INTO cesar     FROM public.mp_project_stakeholders WHERE project_id = pid AND name = 'YEBOUE AMANI CÉSAR';
  SELECT id INTO inocent   FROM public.mp_project_stakeholders WHERE project_id = pid AND name = 'KOFFI INOCENT';

  -- 2. Rattacher les variantes de noms aux acteurs officiels (aucun montant modifié)
  UPDATE public.mp_financial_records
     SET party_name = 'YEBOUE AMANI CÉSAR', stakeholder_id = cesar
   WHERE project_id = pid
     AND (description ILIKE '%CÉSAR%' OR description ILIKE '%CESAR%' OR description ILIKE '%César%');

  UPDATE public.mp_financial_records
     SET party_name = 'KOFFI KOUAME FERDINAND', stakeholder_id = ferdinand
   WHERE project_id = pid AND description ILIKE '%FERDINAN%';

  UPDATE public.mp_financial_records f
     SET stakeholder_id = s.id
    FROM public.mp_project_stakeholders s
   WHERE f.project_id = pid AND s.project_id = pid
     AND f.party_name = s.name AND f.stakeholder_id IS DISTINCT FROM s.id;

  -- 3. Nommer les tiers restants (prêteurs, client) : plus de « non attribué »
  UPDATE public.mp_financial_records SET party_name = 'JEP/CMA Bonon'
   WHERE project_id = pid AND party_name IS NULL AND description ILIKE '%JEP/CMA%';
  UPDATE public.mp_financial_records SET party_name = 'M. Donald'
   WHERE project_id = pid AND party_name IS NULL AND description ILIKE '%Donald%';
  UPDATE public.mp_financial_records SET party_name = 'Mme JACQUES KOUAME'
   WHERE project_id = pid AND party_name IS NULL AND description ILIKE '%Mme JACQUES%';
  UPDATE public.mp_financial_records SET party_name = 'Client AgriPlan'
   WHERE project_id = pid AND party_name IS NULL AND record_type IN ('vente','encaissement');
  UPDATE public.mp_financial_records SET party_name = 'Régularisation interne'
   WHERE project_id = pid AND party_name IS NULL AND record_type = 'remboursement';

  -- 4. Régularisation vers les montants officiels confirmés
  CREATE TEMP TABLE _targets(name text, target numeric) ON COMMIT DROP;
  INSERT INTO _targets VALUES
    ('KOUAKOU KOUAME JACQUES', 4148000),
    ('YAO KONAN LAZARE',       1105000),
    ('YAO KOUAME SAMUEL',       795000),
    ('YEBOUE AMANI CÉSAR',      335000),
    ('KOUAME KOUADIO JULIEN',   318000),
    ('KOFFI KOUAME FERDINAND',  175000),
    ('KONSA KOFFI RAYMOND',     135000),
    ('KOUAKOU KOUAME JULES',    125000),
    ('KOFFI KONAN ERNEST',       85000);

  CREATE TEMP TABLE _gaps AS
  SELECT t.name,
         t.target - COALESCE((
           SELECT SUM(f.amount) FROM public.mp_financial_records f
            WHERE f.project_id = pid AND f.party_name = t.name
              AND f.record_type IN ('apport_associe','don','investissement','pret')
         ), 0) AS gap
    FROM _targets t;

  SELECT COALESCE(SUM(gap), 0) INTO deficit FROM _gaps WHERE gap > 0;

  SELECT id INTO src_id FROM public.mp_financial_records
   WHERE project_id = pid AND party_name = 'KOFFI INOCENT'
   ORDER BY amount DESC LIMIT 1;

  IF deficit > 0 AND src_id IS NOT NULL THEN
    INSERT INTO public.mp_financial_records
      (user_id, project_id, record_type, category, description, amount, currency, record_date, stakeholder_id, party_name)
    SELECT src.user_id, pid, 'apport_associe', src.category,
           'Régularisation apport — consolidation des associés',
           g.gap, src.currency, src.record_date, s.id, g.name
      FROM _gaps g
      JOIN public.mp_project_stakeholders s ON s.project_id = pid AND s.name = g.name
      CROSS JOIN (SELECT user_id, category, currency, record_date FROM public.mp_financial_records WHERE id = src_id) src
     WHERE g.gap > 0;

    UPDATE public.mp_financial_records
       SET amount = amount - deficit
     WHERE id = src_id;
  END IF;

  DROP TABLE IF EXISTS _gaps;
END $$;