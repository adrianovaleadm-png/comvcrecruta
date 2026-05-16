-- Feature: cases sugeridos por IA na etapa Case do pipeline.
-- Dois lugares de armazenamento (modelo hibrido):
--   1) stages.case_brief: case padrao da vaga para aquela etapa.
--      Reaproveitavel entre candidatos. Recrutador pode "promover"
--      um case selecionado para virar o padrao da vaga.
--   2) applications.selected_case + selected_case_level + case_selected_at:
--      o case efetivamente enviado a cada candidato. Por candidato,
--      permite dar case diferente conforme o perfil.

ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS case_brief text;

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS selected_case text,
  ADD COLUMN IF NOT EXISTS selected_case_level text,
  ADD COLUMN IF NOT EXISTS case_selected_at timestamptz;

COMMENT ON COLUMN public.stages.case_brief IS
  'Case padrao para esta etapa da vaga. Default reutilizado entre candidatos.';
COMMENT ON COLUMN public.applications.selected_case IS
  'Conteudo do case efetivamente enviado a este candidato (texto completo).';
COMMENT ON COLUMN public.applications.selected_case_level IS
  'Nivel do case selecionado: basico | intermediario | avancado.';
COMMENT ON COLUMN public.applications.case_selected_at IS
  'Timestamp em que o case foi selecionado/atribuido a este candidato.';
