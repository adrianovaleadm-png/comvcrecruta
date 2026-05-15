ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

COMMENT ON COLUMN public.applications.consent_accepted_at IS
  'Timestamp em que o candidato marcou o checkbox de consentimento LGPD.';
COMMENT ON COLUMN public.applications.consent_version IS
  'Versao da Politica de Privacidade aceita.';

UPDATE storage.buckets SET public = false WHERE id = 'candidate-files';

DROP POLICY IF EXISTS "Public read candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete candidate files" ON storage.objects;

CREATE POLICY "Authenticated users can read candidate files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'candidate-files');

CREATE POLICY "Authenticated users can upload candidate files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'candidate-files');

CREATE POLICY "Authenticated users can update candidate files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'candidate-files');

CREATE POLICY "Authenticated users can delete candidate files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'candidate-files');

UPDATE public.candidate_files
SET url = regexp_replace(url, '^https?://[^/]+/storage/v1/object/(public|sign)/candidate-files/', '')
WHERE url ~ '^https?://[^/]+/storage/v1/object/(public|sign)/candidate-files/';