---
name: Comunicação Automática no Pipeline
description: Templates de e-mail por etapa do pipeline + mini-modal de confirmação ao mover candidato
type: feature
---

Tabela `stage_templates` (1 por stage): assunto, corpo, enviar_automatico. Variáveis suportadas: `{{candidato}}`, `{{vaga}}`, `{{empresa}}`. Trigger `seed_default_stage_template` cria templates padrão automaticamente para cada nova stage. Backfill aplicado para vagas existentes.

Edge function `send-stage-notification` busca dados (candidato/vaga/empresa/template), renderiza e — em modo log-only enquanto não há domínio de e-mail configurado — registra em `activity_events` com `type='email_sent'`.

UI:
- `Pipeline.tsx`: ao soltar card em nova coluna abre Dialog com toggle "Notificar por e-mail" (default = `enviar_automatico` do template). Botões: "Mover sem notificar" / "Confirmar".
- `JobEdit.tsx`: aba "Comunicação" com `StageTemplatesEditor` (assunto, corpo, switch automático, restaurar padrão por etapa).

Para ativar envio real: configurar domínio de e-mail e trocar o bloco log-only da edge function por chamada Resend/Lovable Email.
