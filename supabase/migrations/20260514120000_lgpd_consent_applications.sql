-- LGPD: registrar consentimento ao tratamento de dados pessoais
-- por candidatura. Cada nova application a partir desta migracao
-- exige consent. Applications antigas ficam com NULL (compativel).

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS consent_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

COMMENT ON COLUMN public.applications.consent_accepted_at IS
  'Timestamp em que o candidato marcou o checkbox de consentimento LGPD.';
COMMENT ON COLUMN public.applications.consent_version IS
  'Versao da Politica de Privacidade aceita (ex: v1-2026-05-14).';
