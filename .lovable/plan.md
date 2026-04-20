

## Plano: Comunicação automática ao mover candidato no pipeline

### Comportamento desejado
Quando o recrutador move um candidato de uma etapa para outra, o sistema deve:
1. Registrar o movimento (já funciona)
2. **Disparar e-mail ao candidato** com mensagem apropriada à nova etapa
3. **Permitir personalizar o template** por etapa, por vaga
4. **Permitir desligar** o envio caso o recrutador queira mover sem notificar

### Estrutura

```text
Mover candidato → nova etapa
        │
        ├─► Trigger SQL atual: log em activity_events  ✅ (já existe)
        │
        └─► Frontend: após UPDATE bem-sucedido
                 │
                 ├─► Buscar template da etapa (stage_templates)
                 ├─► Confirmar envio? (toggle "Notificar candidato")
                 └─► Edge Function send-stage-notification
                          │
                          ├─► Renderiza template com {{nome}}, {{vaga}}, {{empresa}}
                          └─► Envia e-mail via Resend
```

### 1. Banco de dados — nova tabela `stage_templates`
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uuid | PK |
| `stage_id` | uuid | FK para `stages` |
| `assunto` | text | Assunto do e-mail |
| `corpo` | text | Corpo (suporta `{{candidato}}`, `{{vaga}}`, `{{empresa}}`) |
| `enviar_automatico` | boolean | Default true |

**Templates padrão** (criados automaticamente junto com as 7 etapas):
- *Recebida* → "Recebemos sua candidatura"
- *Triagem* → "Você passou para a triagem"
- *Entrevista* → "Convite para entrevista"
- *Case* → "Próxima etapa: case prático"
- *Oferta* → "Temos uma proposta para você"
- *Contratada* → "Bem-vindo(a) à equipe"
- *Reprovada* → "Feedback sobre sua candidatura"

### 2. Edge Function `send-stage-notification`
Recebe `application_id` + `new_stage_id`, busca dados do candidato/vaga/empresa/template, renderiza placeholders, envia via Resend.

### 3. UI no Pipeline (`Pipeline.tsx`)
Ao soltar o card numa nova coluna:
- Mostrar mini-modal: *"Notificar candidato sobre mudança para 'Entrevista'?"*
  - ☑ Enviar e-mail (default ligado se template tem `enviar_automatico=true`)
  - Botão "Confirmar" → faz UPDATE e dispara função
  - Botão "Mover sem notificar" → só UPDATE
- Toast com resultado: "Candidato movido. E-mail enviado ✓"

### 4. Editor de templates (nova aba em `JobEdit.tsx`)
Aba **"Comunicação"** lista as 7 etapas, cada uma com:
- Toggle "Notificar automaticamente"
- Campo Assunto + Corpo (textarea com chips de variáveis)
- Botão "Restaurar padrão"

### 5. Pré-requisito
- Domínio de e-mail verificado (Resend) — ferramenta `setup_email_infra`
- Sem domínio: cair em modo *log-only* (registra que enviaria, sem mandar)

### Arquivos afetados
| Arquivo | Ação |
|---|---|
| Migration SQL | Criar `stage_templates` + seed dos 7 templates por vaga existente + trigger para popular em vagas novas |
| `supabase/functions/send-stage-notification/index.ts` | Criar |
| `src/pages/app/Pipeline.tsx` | Mini-modal de confirmação ao mover + chamada da função |
| `src/pages/app/JobEdit.tsx` | Adicionar aba "Comunicação" |
| `src/components/jobs/StageTemplatesEditor.tsx` | Criar componente de edição |

### Resultado
Cada movimento no pipeline dispara comunicação automática e auditável ao candidato, com templates personalizáveis por vaga e opção de envio manual.

