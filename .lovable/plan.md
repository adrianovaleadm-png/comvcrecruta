

## Plano: Playbook de Etapas — guia de ações do recrutador por fase

### Objetivo
Hoje o pipeline tem 7 etapas (Recebida → Triagem → Entrevista → Case → Oferta → Contratada → Reprovada), mas não há orientação sobre **o que o recrutador deve fazer em cada uma**. Vamos criar um "playbook" editável por etapa, com checklist de ações, SLA e critérios de avanço.

### O que será adicionado a cada etapa

Cada etapa do pipeline ganha:

| Campo | Descrição |
|---|---|
| `objetivo` | Frase curta: o que se busca nesta fase |
| `acoes` | Checklist de tarefas do recrutador (texto, uma por linha) |
| `criterios_avanco` | O que o candidato precisa atender para avançar |
| `sla_dias` | Prazo máximo na etapa (alerta visual depois disso) |
| `responsavel_padrao` | Recrutador / Gestor / RH (sugestão) |

### Playbook padrão (criado automaticamente)

| Etapa | Objetivo | Ações principais |
|---|---|---|
| **Recebida** | Confirmar recebimento e organizar fila | Conferir CV, validar requisitos mínimos, agradecer candidatura |
| **Triagem** | Filtrar perfis aderentes | Ler CV, checar fit_score, responder questionário, decidir avanço |
| **Entrevista** | Conhecer o candidato | Agendar call, conduzir entrevista comportamental, registrar notas |
| **Case** | Avaliar competência técnica | Enviar enunciado, definir prazo, avaliar entrega, dar feedback |
| **Oferta** | Fechar contratação | Alinhar pacote, enviar proposta formal, negociar, coletar aceite |
| **Contratada** | Iniciar onboarding | Enviar boas-vindas, acionar RH/DP, marcar primeiro dia |
| **Reprovada** | Encerrar com respeito | Enviar feedback construtivo, manter no banco de talentos |

### Onde aparece na UI

**1. Pipeline (`Pipeline.tsx`)**
- Cabeçalho de cada coluna ganha ícone de info (ⓘ) → popover com objetivo + ações da etapa
- Card do candidato mostra badge amarelo se passou do SLA da etapa

**2. Detalhe do candidato (drawer/modal)**
- Painel lateral "Próximas ações" com checklist da etapa atual (marcar concluído por candidato)
- Indicador de tempo na etapa vs SLA

**3. Edição da vaga (`JobEdit.tsx`)**
- Nova aba **"Processo"** ao lado de "Comunicação"
- Lista as 7 etapas, cada uma editável: objetivo, ações, critérios, SLA, responsável
- Botão "Restaurar padrão"

### Banco de dados

**Alterar tabela `stages`** — adicionar 5 colunas:
- `objetivo` text
- `acoes` text  (linhas separadas por `\n`)
- `criterios_avanco` text
- `sla_dias` int (default null = sem prazo)
- `responsavel_padrao` text

**Nova tabela `application_checklist`** — para marcar tarefas concluídas por candidato:
- `id`, `application_id`, `stage_id`, `acao` (texto), `concluido` (bool), `concluido_em`

**Trigger** — ao criar nova vaga (que já cria as 7 stages), preencher os campos do playbook padrão.
**Backfill** — popular as stages existentes com o playbook padrão.

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| Migration SQL | Add colunas em `stages`, criar `application_checklist`, atualizar trigger `seed_default_stages`, backfill |
| `src/pages/app/Pipeline.tsx` | Popover de info na coluna + badge SLA no card |
| `src/components/jobs/StageProcessEditor.tsx` | Criar — editor do playbook (nova aba) |
| `src/pages/app/JobEdit.tsx` | Adicionar aba "Processo" |
| `src/components/pipeline/CandidateActionsPanel.tsx` | Criar — checklist por candidato (usado no drawer/modal de detalhe) |

### Resultado
Cada vaga passa a ter um playbook claro de "o que fazer em cada etapa", com checklist acionável por candidato e alertas de SLA — transformando o pipeline de um quadro visual em um guia operacional do recrutador.

