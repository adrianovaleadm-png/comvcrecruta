
## Plano: Remover obrigatoriedade de login para desenvolvimento

### Objetivo
Permitir acesso direto a todas as páginas do sistema sem autenticação, para focar na construção das funcionalidades.

### Alterações

**1. `src/App.tsx` — Simplificar rotas**
- Remover os wrappers `ProtectedRoute`, `EmpresaRoute` e `AuthRedirect` de todas as rotas
- Todas as páginas ficam acessíveis diretamente sem login
- Rota `/` redireciona direto para `/app` (dashboard da empresa)
- Manter as rotas de auth (`/signup`, `/login`, `/verify-email`, `/onboarding`) disponíveis mas não obrigatórias

**2. `src/components/AppSidebar.tsx` — Tornar sidebar independente de auth**
- Remover dependência do `useAuth()` para exibição (manter apenas para logout se o usuário estiver logado)
- Mostrar sidebar completa sem verificar sessão

**3. `src/contexts/AuthContext.tsx` — Manter mas tornar opcional**
- Não remover o contexto (será necessário depois), apenas garantir que componentes não quebrem quando não há usuário logado

### Resultado
Acesso direto a `/app` e todas as sub-rotas sem necessidade de criar conta ou fazer login.
