---
name: Playbook de Etapas do Pipeline
description: Cada stage tem objetivo, ações, critérios de avanço, SLA e responsável. Checklist por candidato em application_checklist. Editor na aba Processo de JobEdit.
type: feature
---

## Estrutura

- Tabela `stages` ganhou: `objetivo`, `acoes` (texto, 1 ação por linha), `criterios_avanco`, `sla_dias`, `responsavel_padrao`.
- Tabela `application_checklist` (id, application_id, stage_id, acao, concluido, concluido_em) — ações marcadas por candidato.
- Função `default_playbook_for_stage(_stage_name)` retorna o playbook padrão (Recebida, Triagem, Entrevista, Case, Oferta, Contratada, Reprovada).
- Trigger `seed_default_stages` já cria stages novas com playbook preenchido. Backfill aplicado em stages existentes.

## UI

- **Pipeline.tsx**: cabeçalho da coluna tem ícone `Info` → popover com objetivo, ações, critérios, responsável e SLA. Card mostra badge `warning` (`{dias}d`) quando passou do SLA da etapa (calculado a partir de `application.created_at`).
- **JobEdit.tsx**: nova aba `Processo` (3 abas: Dados, Processo, Comunicação) → `StageProcessEditor` permite editar campos de cada etapa + botão "Restaurar padrão" (chama RPC `default_playbook_for_stage`).
- **CandidateActionsPanel.tsx**: componente pronto para drawer/modal de detalhe do candidato — mostra etapa atual, objetivo, checklist (auto-seed da primeira vez a partir de `stages.acoes`), critérios de avanço, responsável e SLA vs dias na etapa. Ainda não plugado a uma tela (próximo passo é abrir um drawer ao clicar no card do pipeline).

## Notas

- SLA é calculado por `created_at` da application — refinamento futuro: usar timestamp da última transição de stage (campo dedicado ou ler de `activity_events`).
