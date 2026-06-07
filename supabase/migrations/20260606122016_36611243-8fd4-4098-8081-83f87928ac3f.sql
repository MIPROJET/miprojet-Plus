
-- 1) Hide opportunity contact columns from non-admin reads via column-level grants
--    The get_opportunity_contacts() SECURITY DEFINER function remains the gateway.
REVOKE SELECT ON public.opportunities FROM anon, authenticated;

GRANT SELECT (
  id, title, description, content, category, opportunity_type,
  location, deadline, image_url, eligibility,
  amount_min, amount_max, currency,
  is_premium, is_active, is_featured, status, published_at,
  created_at, updated_at, short_slug, author_id, author_name,
  email_segment, views_count, send_by_email, email_sent_at
) ON public.opportunities TO anon, authenticated;

-- Admin role keeps full access via has_role(); grant explicit full SELECT to service_role
GRANT SELECT ON public.opportunities TO service_role;

-- Allow admins through column-level too (needed because we revoked above)
-- has_role policy still applies, but admins still need column privileges.
GRANT SELECT (contact_email, contact_phone, external_link) ON public.opportunities TO service_role;

-- 2) news-media bucket: explicit public read to match its public nature
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='news_media_public_read') THEN
    CREATE POLICY "news_media_public_read" ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'news-media');
  END IF;
END $$;

-- 3) tender_interests: allow submitters to view/delete their own submissions via session email
CREATE POLICY "tender_interests_submitter_select"
  ON public.tender_interests
  FOR SELECT TO authenticated
  USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

CREATE POLICY "tender_interests_submitter_delete"
  ON public.tender_interests
  FOR DELETE TO authenticated
  USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));
