
O usuário pergunta duas coisas:
1. Como resolver o problema atual (não consegue cadastrar empresa em `/app/empresa`)
2. O que ainda falta para concluir o app

Olhando o estado: RLS de `companies` ainda exige `auth.uid()`, mas o resto do app está em modo dev sem login (todas as outras tabelas têm `Allow all access`). Por isso o INSERT/SELECT em `companies` falha silenciosamente.

Vou propor a correção pontual + um roadmap enxuto do que falta para entregar o produto, respeitando a preferência do usuário (economizar créditos, placeholders para o avançado).

## Plano: Destravar Cultura + Roadmap de Conclusão

### Parte 1 — Correção imediata (destravar `/app/empresa`)

**Problema:** RLS de `companies` exige `auth.uid()`, mas o app roda em modo dev sem login. INSERT/SELECT falham → tela "Nenhuma empresa configurada".

**Correção:**
1. Migration: substituir as 3 policies de `companies` por `Allow all access` (alinhado com `jobs`, `candidates`, etc.)
2. `CompanyProfile.tsx`: adicionar fluxo "Criar empresa" quando nenhuma existir (formulário curto: nome fantasia, razão social, CNPJ) → após criar, abre as 4 abas normalmente
3. Validação clara nos campos obrigatórios antes do UPDATE

### Parte 2 — Roadmap para concluir o app

Com base no que já existe vs. placeholders:

| Status | Módulo |
|---|---|
| Pronto | Vagas (CRUD, IA, pipeline, templates) |
| Pronto | Candidatos (lista, perfil, parsing CV, comparar) |
| Pronto | Fit Score (auto, pesos, triagem) |
| Pronto | Candidatura pública + link copiável |
| Pronto | Dashboard + Analytics |
| Pronto | Empresa/Cultura (após correção acima) |
| Falta | **Autenticação real** (hoje em modo dev) |
| Placeholder | Mensagens, Equipe, Requisições, Indicações, Vagas Internas, Templates de comunicação, Página de Carreiras pública |

**Sugestão de priorização (3 sprints curtos):**

**Sprint A — Essencial para go-live**
- Reativar autenticação (login/signup já existem, só religar guards)
- Restaurar RLS proper em `jobs`/`candidates`/`companies` por empresa
- Página pública de Carreiras (`/carreiras/:companyId`) listando vagas abertas

**Sprint B — Operação do recrutador**
- Mensagens (chat simples recrutador ↔ candidato)
- Equipe (convidar membros, papéis admin/recruiter)
- Templates de comunicação (e-mails de status)

**Sprint C — Diferenciais**
- Indicações (link de referral por colaborador)
- Vagas Internas (filtro por audiência)
- Requisições (fluxo de aprovação antes de abrir vaga)

### Próximo passo concreto

Implemento agora **só a Parte 1** (correção do cadastro de empresa). Depois você escolhe por qual sprint seguir.

### Arquivos da Parte 1
| Arquivo | Ação |
|---|---|
| Migration SQL | DROP 3 policies de `companies` + CREATE `Allow all access` |
| `src/pages/app/CompanyProfile.tsx` | Fluxo de criação inicial + validação de campos obrigatórios |
