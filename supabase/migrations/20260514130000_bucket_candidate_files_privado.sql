-- LGPD: tornar o bucket candidate-files privado.
-- Antes: bucket publico, qualquer pessoa com a URL le/baixa/apaga CV.
-- Agora: apenas usuarios autenticados acessam, via signed URLs com expiracao.

-- 1) Bucket vira privado.
UPDATE storage.buckets SET public = false WHERE id = 'candidate-files';

-- 2) Derrubar policies abertas (qualquer um podia ler/inserir/apagar).
DROP POLICY IF EXISTS "Public read candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload candidate files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete candidate files" ON storage.objects;

-- 3) Novas policies: apenas autenticados.
--    Front-end gera signed URLs (validade ~1h) para exibir/baixar.
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

-- 4) Normalizar candidate_files.url: armazenar apenas o PATH,
--    nao a URL completa. O front-end agora gera signed URL on-demand.
--    Antes:  https://<projeto>.supabase.co/storage/v1/object/public/candidate-files/<path>
--    Depois: <path>
UPDATE public.candidate_files
SET url = regexp_replace(url, '^https?://[^/]+/storage/v1/object/(public|sign)/candidate-files/', '')
WHERE url ~ '^https?://[^/]+/storage/v1/object/(public|sign)/candidate-files/';
