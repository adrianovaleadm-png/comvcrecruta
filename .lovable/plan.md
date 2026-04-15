

## Plano: Sistema de Triagem + Pesos Customizáveis no Fit Score

### Conceito
Duas adições fundamentais ao sistema de scoring:
1. **Perguntas de triagem por vaga** — candidatos respondem perguntas específicas que alimentam o Fit Score.
2. **Pesos customizáveis** — o recrutador define a importância relativa de cada critério (experiência, habilidades técnicas, localização, senioridade, soft skills, triagem).

### Arquitetura

```text
Recrutador cria vaga
  ├── Define perguntas de triagem
  └── Define pesos dos critérios (ex: técnico=40%, triagem=25%, ...)
        │
Candidato se candidata
  └── Responde perguntas de triagem
        │
Fit Score (Edge Function)
  ├── Busca respostas de triagem
  ├── Busca pesos da vaga
  └── Calcula score ponderado (score × peso de cada critério)
```

### 1. Banco de Dados — 2 novas tabelas + 1 coluna

**`screening_questions`**

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| job_id | uuid FK jobs |
| question | text |
| type | text ('text', 'choice', 'yes_no') |
| options | jsonb (para 'choice') |
| required | boolean default true |
| order_index | integer |

**`screening_answers`**

| Coluna | Tipo |
|--------|------|
| id | uuid PK |
| application_id | uuid FK applications |
| question_id | uuid FK screening_questions |
| answer | text |
| created_at | timestamp |

UNIQUE em (application_id, question_id).

**Nova coluna em `jobs`:**
- `score_weights` (jsonb, default null) — armazena os pesos por critério.

Exemplo:
```json
{
  "experiencia": 20,
  "habilidades_tecnicas": 25,
  "localizacao": 10,
  "senioridade": 15,
  "soft_skills": 10,
  "triagem": 20
}
```
Se null, usa pesos iguais (padrão).

### 2. UI — Configuração na criação/edição da vaga (`JobCreate.tsx`)

**Seção "Perguntas de Triagem":**
- Adicionar perguntas com tipo (Texto livre / Múltipla escolha / Sim-Não).
- Reordenar por setas. Marcar como obrigatória ou não.
- Perguntas sugeridas por padrão (pretensão salarial, disponibilidade, experiência relevante).

**Seção "Pesos do Fit Score":**
- 6 sliders (um por critério) com valores de 0 a 100.
- Exibir porcentagem normalizada em tempo real (os pesos são proporcionais — se todos valem 20, cada um = ~17%).
- Preset rápido: "Técnico" (prioriza habilidades), "Cultural" (prioriza soft skills e triagem), "Padrão" (igual).

### 3. UI — Respostas no modal de candidatura (`AddCandidateModal.tsx`)

- Após selecionar/criar candidato, se a vaga tem perguntas de triagem → exibir passo 2 com formulário.
- Campos renderizados por tipo (textarea, radio, select).
- Validar obrigatórios antes de criar candidatura.
- Salvar em `screening_answers`.

### 4. Edge Function — `score-candidate-job` atualizada

- Buscar `screening_answers` + `screening_questions` da candidatura.
- Buscar `score_weights` da vaga.
- Incluir respostas no prompt como seção "## Respostas de Triagem".
- Adicionar 6º critério: `triagem` (qualidade das respostas).
- Calcular `overall_score` ponderado: `Σ(score_i × peso_i) / Σ(pesos)`.
- Se não há pesos definidos, média simples (comportamento atual).

### 5. UI — Indicadores visuais

- **Pipeline (card):** ícone indicando se triagem foi respondida.
- **Perfil do candidato:** exibir perguntas e respostas na seção de candidaturas.
- **Detalhe da vaga:** mostrar pesos configurados e perguntas definidas.

### 6. Alterações por arquivo

| Arquivo | Mudança |
|---------|---------|
| Nova migration | Tabelas `screening_questions`, `screening_answers` + coluna `score_weights` em jobs |
| `src/pages/app/JobCreate.tsx` | Seções de perguntas de triagem e pesos do Fit Score |
| `src/components/pipeline/AddCandidateModal.tsx` | Passo 2 com formulário de triagem |
| `supabase/functions/score-candidate-job/index.ts` | Respostas no prompt + score ponderado |
| `src/pages/app/Pipeline.tsx` | Indicador de triagem no card |
| `src/pages/app/TalentProfile.tsx` | Exibir respostas de triagem por candidatura |
| `src/pages/app/JobDetail.tsx` | Exibir pesos e perguntas configuradas |

### Resultado
O recrutador configura perguntas de triagem e pesos por critério ao criar a vaga. O candidato responde ao se candidatar. O Fit Score usa tudo — respostas, perfil, tags e pesos — para gerar uma pontuação ponderada e precisa, dando controle total ao recrutador sobre o que importa mais para cada vaga.

