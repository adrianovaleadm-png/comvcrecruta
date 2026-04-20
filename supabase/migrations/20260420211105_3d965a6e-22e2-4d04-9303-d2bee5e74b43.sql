-- 1. Tabela stage_templates
CREATE TABLE public.stage_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL,
  corpo TEXT NOT NULL,
  enviar_automatico BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stage_id)
);

CREATE INDEX idx_stage_templates_stage_id ON public.stage_templates(stage_id);

ALTER TABLE public.stage_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to stage_templates"
ON public.stage_templates FOR ALL
USING (true) WITH CHECK (true);

CREATE TRIGGER update_stage_templates_updated_at
BEFORE UPDATE ON public.stage_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Função para gerar template padrão por nome de etapa
CREATE OR REPLACE FUNCTION public.default_template_for_stage(_stage_name TEXT)
RETURNS TABLE (assunto TEXT, corpo TEXT)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  CASE _stage_name
    WHEN 'Recebida' THEN
      RETURN QUERY SELECT
        'Recebemos sua candidatura para {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nRecebemos sua candidatura para a vaga {{vaga}} na {{empresa}}. Em breve nossa equipe entrará em contato com os próximos passos.\n\nObrigado pelo interesse!\n\nEquipe {{empresa}}'::TEXT;
    WHEN 'Triagem' THEN
      RETURN QUERY SELECT
        'Sua candidatura avançou — {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nBoas notícias! Seu perfil avançou para a etapa de triagem na vaga {{vaga}}. Vamos analisar seu material com mais detalhes e voltamos em breve.\n\nEquipe {{empresa}}'::TEXT;
    WHEN 'Entrevista' THEN
      RETURN QUERY SELECT
        'Convite para entrevista — {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nGostaríamos de convidá-lo(a) para uma entrevista referente à vaga {{vaga}}. Entraremos em contato pelos seus dados cadastrados para alinhar data e horário.\n\nEquipe {{empresa}}'::TEXT;
    WHEN 'Case' THEN
      RETURN QUERY SELECT
        'Próxima etapa: case prático — {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nVocê foi selecionado(a) para a etapa de case prático da vaga {{vaga}}. Em breve enviaremos as instruções e o prazo de entrega.\n\nEquipe {{empresa}}'::TEXT;
    WHEN 'Oferta' THEN
      RETURN QUERY SELECT
        'Temos uma proposta para você — {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nTemos o prazer de avançar com uma proposta para a vaga {{vaga}}. Nossa equipe entrará em contato para apresentar os detalhes da oferta.\n\nEquipe {{empresa}}'::TEXT;
    WHEN 'Contratada' THEN
      RETURN QUERY SELECT
        'Bem-vindo(a) à {{empresa}}!'::TEXT,
        E'Olá {{candidato}},\n\nÉ com grande satisfação que confirmamos sua contratação para a vaga {{vaga}}. Seja muito bem-vindo(a) à {{empresa}}! Em breve enviaremos as informações de onboarding.\n\nEquipe {{empresa}}'::TEXT;
    WHEN 'Reprovada' THEN
      RETURN QUERY SELECT
        'Sobre sua candidatura para {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nAgradecemos muito seu interesse na vaga {{vaga}} e o tempo dedicado ao nosso processo seletivo. Após análise cuidadosa, optamos por seguir com outros candidatos neste momento.\n\nSeu perfil ficará em nosso banco de talentos para futuras oportunidades.\n\nEquipe {{empresa}}'::TEXT;
    ELSE
      RETURN QUERY SELECT
        'Atualização sobre sua candidatura — {{vaga}}'::TEXT,
        E'Olá {{candidato}},\n\nSua candidatura para a vaga {{vaga}} foi atualizada. Continuaremos em contato com os próximos passos.\n\nEquipe {{empresa}}'::TEXT;
  END CASE;
END;
$$;

-- 3. Trigger: ao criar uma stage, criar o template padrão
CREATE OR REPLACE FUNCTION public.seed_default_stage_template()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _tpl RECORD;
BEGIN
  SELECT * INTO _tpl FROM public.default_template_for_stage(NEW.name);
  INSERT INTO public.stage_templates (stage_id, assunto, corpo, enviar_automatico)
  VALUES (NEW.id, _tpl.assunto, _tpl.corpo, true);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_stage_template
AFTER INSERT ON public.stages
FOR EACH ROW EXECUTE FUNCTION public.seed_default_stage_template();

-- 4. Backfill para stages já existentes
INSERT INTO public.stage_templates (stage_id, assunto, corpo, enviar_automatico)
SELECT s.id, t.assunto, t.corpo, true
FROM public.stages s
CROSS JOIN LATERAL public.default_template_for_stage(s.name) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.stage_templates st WHERE st.stage_id = s.id
);