

## Plano: Sistema de Scoring Candidato × Vaga (Fit Score)

### Conceito
Criar um sistema de **pontuação de aderência (fit score)** que avalia automaticamente o quanto cada candidato é adequado para uma vaga específica, usando IA para analisar o perfil do candidato contra os requisitos da vaga.

### Arquitetura

```text
┌─────────────┐     ┌──────────────────────┐     ┌──────────┐
│  Frontend   │────▶│ Edge Function         │────▶│ Lovable  │
│  (trigger)  │     │ score-candidate-job   │     │ AI (LLM) │
│             │◀────│                       │◀────│          │
└─────────────┘     └──────────────────────┘     └──────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ candidate_   │
                    │ scores (DB)  │
                    └──────────────┘
```

### 1. Banco de Dados — Nova tabela `candidate_scores`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid PK | |
| candidate_id | uuid FK candidates | |
| job_id | uuid FK jobs | |
| overall_score | integer (0-100) | Pontuação geral |
| criteria_scores | jsonb | Detalhamento por critério |
| ai_summary | text | Resumo da IA sobre o fit |
| created_at | timestamp | |

- Constraint UNIQUE em (candidate_id, job_id) para evitar duplicatas.
- RLS permissiva (modo dev).

**`criteria_scores` exemplo:**
```json
{
  "experiencia": { "score": 85, "nota": "5+ anos em backend" },
  "habilidades_tecnicas": { "score": 70, "nota": "Conhece 4 de 6 tecnologias" },
  "localizacao": { "score": 100, "nota": "Mesma cidade" },
  "senioridade": { "score": 90, "nota": "Compatível com o nível" },
  "soft_skills": { "score": 75, "nota": "Boa comunicação no resumo" }
}
```

### 2. Edge Function `score-candidate-job`

- Recebe `{ candidate_id, job_id }`.
- Busca dados do candidato (nome, resumo, tags, cidade) e da vaga (título, descrição, localização, tipo).
- Monta prompt em PT-BR pedindo ao LLM para avaliar o fit em 5 critérios com score 0-100 cada + score geral + resumo.
- Retorna JSON estruturado e salva/atualiza em `candidate_scores`.
- Usa modelo Gemini via Lovable AI gateway.

### 3. UI — Onde o score aparece

**A) Card no Pipeline (Kanban):**
- Cada card de candidato exibe um badge colorido com o score (ex: 85%).
- Verde ≥ 70, Amarelo 40-69, Vermelho < 40.
- Se não avaliado, mostra botão "Avaliar fit".

**B) Perfil do Candidato (`/talentos/:id`):**
- Na seção "Candidaturas", ao lado de cada vaga, mostrar o score com breakdown dos critérios.
- Botão "Calcular fit" para gerar/regerar a análise.

**C) Detalhe da Vaga (`/vagas/:id`):**
- Nova seção "Ranking de Candidatos" — lista ordenada por score decrescente.
- Mostra nome, score geral, resumo da IA.

### 4. Fluxos

- **Avaliação manual:** Usuário clica "Avaliar fit" → chama edge function → exibe resultado.
- **Avaliação automática:** Ao criar uma candidatura (application), disparar avaliação automaticamente em background.
- **Re-avaliação:** Permitir recalcular se a descrição da vaga mudar.

### 5. Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| Nova migration | Tabela `candidate_scores` |
| `supabase/functions/score-candidate-job/index.ts` | Nova edge function com prompt de scoring |
| `src/pages/app/Pipeline.tsx` | Badge de score no card, botão avaliar |
| `src/pages/app/TalentProfile.tsx` | Score por candidatura, botão calcular |
| `src/pages/app/JobDetail.tsx` | Seção ranking de candidatos |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

### Resultado
Cada candidato em uma vaga terá um **fit score de 0-100** com análise detalhada por critérios, visível no pipeline, no perfil e no ranking da vaga — permitindo decisões de contratação baseadas em dados.

