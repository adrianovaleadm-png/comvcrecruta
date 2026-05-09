## Objetivo

Isolar dados por empresa (multi-tenant). Cada empresa só vê e gerencia suas próprias vagas, candidatos, aplicações, tags e templates. Hoje todos os dados são globais — qualquer empresa nova herda tudo o que existe.

## Escopo

Adicionar `company_id` (FK para `companies`) nas seguintes tabelas e filtrar por ele em todas as queries:

- `jobs`
- `candidates`
- `applications` (herda via `job_id`, mas adicionar coluna acelera filtros)
- `tags`
- `job_templates`
- `stage_templates` (herda via `stage_id` → `job_id`, sem coluna direta)
- `candidate_files`, `candidate_scores`, `candidate_tags`, `screening_questions`, `screening_answers`, `application_checklist`, `stages`, `activity_events` → herdam por FK transitiva, **sem coluna direta** (ficam isoladas indiretamente).

## Mudanças no banco (migration)

1. `ALTER TABLE jobs ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE`
2. Igual para `candidates`, `tags`, `job_templates`.
3. Backfill: associar todos os registros existentes à empresa mais antiga (ou à única atual).
4. Tornar `company_id` NOT NULL após backfill.
5. Índices em `company_id` em cada tabela.
6. Manter RLS atual (`Allow all access`) por enquanto — o isolamento será feito no client. (Plano futuro: trocar por RLS real com `is_company_member`).

## Mudanças no código

### Contexto / source of truth da empresa atual
- `AuthContext`: já expõe `company`. Em modo dev (sem auth), criar hook `useCurrentCompanyId()` que retorna `company?.id ?? localStorage.dev_company_id`.

### Inserts (sempre incluir company_id)
- `JobCreate.tsx`: inserir `company_id` em `jobs` e em `job_templates` (quando salva como template).
- `PublicApplication.tsx`: ao criar candidato novo, herdar `company_id` da vaga.
- `AddCandidateModal.tsx`, `NewCandidateModal.tsx`: incluir `company_id` no candidato.
- `TalentProfile.tsx`: ao criar `tag` nova, incluir `company_id`.

### Selects (filtrar por company_id)
- `JobsList.tsx`, `Analytics.tsx`, `AssignToJobModal.tsx`, `JobDetail.tsx`, `JobEdit.tsx`, `Pipeline.tsx`: filtrar `jobs` por `company_id`.
- `TalentList.tsx`, `CandidateCompare.tsx`: filtrar `candidates` por `company_id`.
- `TalentProfile.tsx`, `TalentList.tsx`: filtrar `tags` por `company_id`.
- `JobCreate.tsx`: filtrar `job_templates` por `company_id`.
- Edge functions (`get-dashboard-overview`, `get-funnel-metrics`, `parse-resume`, etc.): aceitar/filtrar `company_id` quando relevante.

### Públicos (sem alteração de filtro)
- `Carreiras.tsx` e `PublicApplication.tsx` continuam vendo todas as vagas abertas — público é global, mas pode passar `?empresa={id}` para filtrar página de carreiras.

## Fluxo de teste após implementação

1. Criar nova empresa "Empresa B" em `/app/empresa`.
2. Trocar `dev_company_id` para a nova → Hub de Vagas vazio.
3. Criar vaga, candidato, tag → aparecem só na Empresa B.
4. Voltar para Empresa A → continua vendo só seus dados.

## Não incluso neste plano

- Seletor visual de empresa (switcher) na sidebar — pode entrar em iteração futura.
- RLS real baseada em `auth.uid()` — mantemos `Allow all` enquanto estamos em modo dev.
- Migração de schema das edge functions além de filtros mínimos.