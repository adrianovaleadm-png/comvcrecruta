

## Plano: Implementação Completa de Melhorias do ATS

Dado o volume, vou dividir em **4 fases** priorizando impacto no Fit Score e usabilidade.

---

### Fase 1 — Impacto Direto no Fit Score (esta implementação)

**1.1 Fit Score Automático ao Candidatar**
- Após salvar respostas de triagem em `AddCandidateModal`, disparar `score-candidate-job` em background (fire-and-forget).
- Toast informando "Calculando Fit Score..." e invalidar queries ao completar.

**1.2 Edição de Vagas (JobEdit)**
- Nova rota `/app/vagas/:id/editar` com componente `JobEdit.tsx`.
- Carregar dados da vaga existente, incluindo perguntas de triagem e pesos.
- Reutilizar `ScreeningQuestionsBuilder` e `ScoreWeightsConfig`.
- Botão "Editar" no `JobDetail.tsx`.
- Ao salvar: update na tabela `jobs`, delete+reinsert em `screening_questions`.

**1.3 Parsing de Currículo com IA**
- Nova edge function `parse-resume` que recebe URL do arquivo (do bucket `candidate-files`).
- Extrai texto do PDF e usa IA para retornar nome, email, cidade, skills, resumo.
- Botão "Extrair com IA" no `TalentProfile.tsx` e no `NewCandidateModal.tsx` ao fazer upload de CV.
- Preenche campos automaticamente.

---

### Fase 2 — Visibilidade e Comparação

**2.1 Histórico de Atividades (UI)**
- Componente `ActivityFeed.tsx` que lista `activity_events`.
- Exibir no Dashboard (`Painel.tsx`) e no `TalentProfile.tsx` (filtrado por candidato).
- Timeline visual com ícones por tipo de evento.

**2.2 Comparação de Candidatos**
- No Pipeline, checkbox para selecionar 2-3 candidatos.
- Modal/página de comparação lado a lado: scores por critério, respostas de triagem, perfil.
- Tabela comparativa com barras de progresso.

---

### Fase 3 — Produtividade

**3.1 Templates de Vagas**
- Nova tabela `job_templates` (title, description, screening_questions, score_weights, required_skills, seniority, work_model).
- Botão "Salvar como Template" no `JobCreate/JobEdit`.
- Botão "Usar Template" no `JobCreate` que preenche todos os campos.

**3.2 Página Pública de Candidatura**
- Rota pública `/vaga/:id/candidatar` sem necessidade de login.
- Exibe título, descrição, requisitos da vaga.
- Formulário: dados do candidato + respostas de triagem.
- Cria candidato + application + screening_answers.

---

### Fase 4 — Analytics

**4.1 Métricas de Funil**
- Nova edge function `get-funnel-metrics` que calcula tempo médio por etapa e conversão entre stages.
- Página `Analytics.tsx` com gráfico de funil e tabelas de métricas.
- Filtros por vaga e período.

---

### Detalhes Técnicos

| Item | Tipo | Arquivos |
|------|------|----------|
| Fit Score automático | Frontend | `AddCandidateModal.tsx` |
| JobEdit | Migration + Frontend | Nova rota, `JobEdit.tsx` |
| Parse Resume | Edge Function + Frontend | `parse-resume/index.ts`, `TalentProfile.tsx` |
| Activity Feed | Frontend | Novo `ActivityFeed.tsx`, `Painel.tsx`, `TalentProfile.tsx` |
| Comparação | Frontend | `Pipeline.tsx`, novo `CandidateCompare.tsx` |
| Templates | Migration + Frontend | Nova tabela, `JobCreate.tsx` |
| Página Pública | Frontend | Nova rota pública, novo componente |
| Métricas | Edge Function + Frontend | `get-funnel-metrics/index.ts`, `Analytics.tsx` |

### Novas tabelas
- `job_templates` — para salvar configurações reutilizáveis de vagas.

### Estratégia de execução
Implemento todas as 4 fases sequencialmente, começando pela Fase 1 que tem impacto direto no core do sistema (Fit Score).

