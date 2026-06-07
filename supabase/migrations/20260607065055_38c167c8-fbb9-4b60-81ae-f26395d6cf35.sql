
-- Ajoute short_id (lien public court), content_hash (SHA-256), signed_payload (snapshot)
ALTER TABLE public.mp_certifications
  ADD COLUMN IF NOT EXISTS short_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS signed_payload jsonb;

CREATE INDEX IF NOT EXISTS idx_mp_certifications_short_id ON public.mp_certifications(short_id);

-- Lecture publique LIMITÉE aux certificats émis (status='issued') via short_id
-- Données affichées sur la page publique de vérification.
DROP POLICY IF EXISTS "Public can verify issued certificates" ON public.mp_certifications;
CREATE POLICY "Public can verify issued certificates"
  ON public.mp_certifications
  FOR SELECT
  TO anon, authenticated
  USING (status = 'issued' AND short_id IS NOT NULL);

GRANT SELECT ON public.mp_certifications TO anon;
