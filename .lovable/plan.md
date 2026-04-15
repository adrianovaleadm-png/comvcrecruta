

## Plano: Campos Adicionais na Criação de Vaga

### Novos campos na tabela `jobs`

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `seniority` | text | junior, pleno, senior, specialist, lead |
| `work_model` | text | presencial, hibrido, remoto |
| `department` | text | Engenharia, Marketing, etc. |
| `salary_min` | integer (nullable) | 5000 |
| `salary_max` | integer (nullable) | 12000 |
| `headcount` | integer default 1 | 1 |
| `deadline` | date (nullable) | 2026-05-30 |
| `required_skills` | text[] (nullable) | {React, TypeScript, Node} |

### Alterações

1. **Migration** — Adicionar 8 colunas à tabela `jobs`.

2. **`JobCreate.tsx`** — Adicionar campos ao formulário:
   - Select para Senioridade (Júnior/Pleno/Sênior/Especialista/Liderança)
   - Select para Modalidade (Presencial/Híbrido/Remoto)
   - Input para Departamento
   - Dois inputs numéricos lado a lado para faixa salarial (R$ mín / R$ máx)
   - Input numérico para quantidade de vagas
   - Date picker para prazo
   - Input de tags para habilidades requeridas (adicionar com Enter)

3. **`JobFormValues` interface** — Expandir com os novos campos.

4. **Edge Function `score-candidate-job`** — Incluir senioridade, modalidade e habilidades requeridas no prompt da IA para scoring mais preciso.

5. **Edge Function `generate-job-description`** — Passar senioridade e modalidade como contexto para gerar descrições mais completas.

6. **`JobDetail.tsx`** — Exibir os novos campos na visualização da vaga.

### Organização visual do formulário

```text
Título *                          
Descrição [Gerar com IA]         
─── Detalhes ───
Localização    | Tipo (CLT/PJ)   
Senioridade    | Modalidade      
Departamento   | Qtd. vagas      
Faixa salarial (R$ min — R$ max) 
Data limite                       
─── Habilidades Requeridas ───
[React] [TypeScript] [+ Adicionar]
─── Perguntas de Triagem ───
(builder existente)
─── Pesos do Fit Score ───
(config existente)
```

### Resultado
Formulário completo com todos os dados relevantes para o recrutador, alimentando diretamente o Fit Score e a geração de descrição com IA.

