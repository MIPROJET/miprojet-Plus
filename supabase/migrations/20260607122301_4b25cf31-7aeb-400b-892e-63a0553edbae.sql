-- Public read for project-media bucket
CREATE POLICY "project_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-media');

-- Owner-only writes (path must start with auth.uid())
CREATE POLICY "project_media_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "project_media_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "project_media_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);