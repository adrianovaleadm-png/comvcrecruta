-- 1. Add playbook columns to stages
ALTER TABLE public.stages
  ADD COLUMN IF NOT EXISTS objetivo TEXT,
  ADD COLUMN IF NOT EXISTS acoes TEXT,
  ADD COLUMN IF NOT EXISTS criterios_avanco TEXT,
  ADD COLUMN IF NOT EXISTS sla_dias INTEGER,
  ADD COLUMN IF NOT EXISTS responsavel_padrao TEXT;

-- 2. Default playbook function
CREATE OR REPLACE FUNCTION public.default_playbook_for_stage(_stage_name TEXT)
RETURNS TABLE(objetivo TEXT, acoes TEXT, criterios_avanco TEXT, sla_dias INTEGER, responsavel_padrao TEXT)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
BEGIN
  CASE _stage_name
    WHEN 'Recebida' THEN
      RETURN QUERY SELECT
        'Confirmar recebimento e organizar a fila de candidaturas'::TEXT,
        E'Conferir CV anexado\nValidar requisitos mínimos\nEnviar e-mail de confirmação\nEtiquetar candidato'::TEXT,
        'Atende aos requisitos básicos da vaga (formação, experiência mínima)'::TEXT,
        2,
        'Recrutador'::TEXT;
    WHEN 'Triagem' THEN
      RETURN QUERY SELECT
        'Filtrar perfis aderentes ao job description'::TEXT,
        E'Ler CV em detalhe\nAnalisar fit_score (IA)\nRevisar respostas do questionário\nDecidir avanço ou descarte'::TEXT,
        'Fit score acima do mínimo + respostas eliminatórias OK'::TEXT,
        3,
        'Recrutador'::TEXT;
    WHEN 'Entrevista' THEN
      RETURN QUERY SELECT
        'Conhecer o candidato em profundidade'::TEXT,
        E'Agendar call/presencial\nConduzir entrevista comportamental\nRegistrar notas e impressões\nAlinhar com gestor'::TEXT,
        'Aderência cultural confirmada e expectativas alinhadas'::TEXT,
        5,
        'Recrutador + Gestor'::TEXT;
    WHEN 'Case' THEN
      RETURN QUERY SELECT
        'Avaliar competência técnica em situação real'::TEXT,
        E'Enviar enunciado do case\nDefinir prazo de entrega\nAvaliar entrega com rubrica\nDar feedback ao candidato'::TEXT,
        'Entrega dentro do prazo com qualidade técnica esperada'::TEXT,
        7,
        'Gestor técnico'::TEXT;
    WHEN 'Oferta' THEN
      RETURN QUERY SELECT
        'Fechar a contratação com proposta formal'::TEXT,
        E'Alinhar pacote (salário, benefícios, data início)\nEnviar proposta formal por e-mail\nNegociar contrapropostas\nColetar aceite por escrito'::TEXT,
        'Proposta aceita e data de início definida'::TEXT,
        5,
        'Recrutador + RH'::TEXT;
    WHEN 'Contratada' THEN
      RETURN QUERY SELECT
        'Garantir onboarding bem-sucedido'::TEXT,
        E'Enviar e-mail de boas-vindas\nAcionar DP para documentação\nMarcar primeiro dia e kit de boas-vindas\nApresentar buddy/mentor'::TEXT,
        'Documentação completa e primeiro dia confirmado'::TEXT,
        10,
        'RH/DP'::TEXT;
    WHEN 'Reprovada' THEN
      RETURN QUERY SELECT
        'Encerrar com respeito e manter relacionamento'::TEXT,
        E'Enviar feedback construtivo\nManter perfil no banco de talentos\nEtiquetar para futuras oportunidades'::TEXT,
        'Feedback enviado e candidato adicionado ao banco'::TEXT,
        2,
        'Recrutador'::TEXT;
    ELSE
      RETURN QUERY SELECT
        'Etapa do processo seletivo'::TEXT,
        ''::TEXT, ''::TEXT, NULL::INTEGER, 'Recrutador'::TEXT;
  END CASE;
END;
$$;

-- 3. Update seed_default_stages trigger to populate playbook
CREATE OR REPLACE FUNCTION public.seed_default_stages()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  _names TEXT[] := ARRAY['Recebida','Triagem','Entrevista','Case','Oferta','Contratada','Reprovada'];
  _name TEXT;
  _idx INT := 0;
  _pb RECORD;
BEGIN
  FOREACH _name IN ARRAY _names LOOP
    _idx := _idx + 1;
    SELECT * INTO _pb FROM public.default_playbook_for_stage(_name);
    INSERT INTO public.stages (job_id, name, order_index, objetivo, acoes, criterios_avanco, sla_dias, responsavel_padrao)
    VALUES (NEW.id, _name, _idx, _pb.objetivo, _pb.acoes, _pb.criterios_avanco, _pb.sla_dias, _pb.responsavel_padrao);
  END LOOP;
  RETURN NEW;
END;
$$;

-- 4. Backfill existing stages
DO $$
DECLARE
  _s RECORD;
  _pb RECORD;
BEGIN
  FOR _s IN SELECT id, name FROM public.stages WHERE objetivo IS NULL LOOP
    SELECT * INTO _pb FROM public.default_playbook_for_stage(_s.name);
    UPDATE public.stages
    SET objetivo = _pb.objetivo,
        acoes = _pb.acoes,
        criterios_avanco = _pb.criterios_avanco,
        sla_dias = _pb.sla_dias,
        responsavel_padrao = _pb.responsavel_padrao
    WHERE id = _s.id;
  END LOOP;
END $$;

-- 5. Application checklist table
CREATE TABLE IF NOT EXISTS public.application_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_application_checklist_app_stage
  ON public.application_checklist(application_id, stage_id);

ALTER TABLE public.application_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to application_checklist"
ON public.application_checklist FOR ALL
USING (true) WITH CHECK (true);