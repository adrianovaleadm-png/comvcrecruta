

## Plano: Proteger rotas /app com ProtectedRoute

### (a) Como o AuthContext funciona hoje

`src/contexts/AuthContext.tsx` expõe via `useAuth()`:
- `loading: boolean` — true até a sessão inicial ser resolvida (set como `false` tanto no `onAuthStateChange` quanto após `getSession()`).
- `user: User | null` — usuário do Supabase (null = deslogado).
- `session`, `profile`, `company`, `companyMember`, `signOut`, `refreshProfile`.

Detecção do estado:
- **Carregando**: `loading === true`
- **Deslogado**: `loading === false && !user`
- **Logado**: `loading === false && !!user`

### (b) Onde o tipo do usuário está armazenado

O tipo está em **`profile.user_type`** (tabela `profiles`, coluna `user_type`), carregado em `fetchProfile()` após login. O código atual já testa `if (data?.user_type === "empresa")` para decidir se busca `company_members`/`companies`, confirmando que `"empresa"` é um valor válido. O código também trata `"candidato"` como o outro tipo esperado (conforme seu objetivo).

**Observação importante:** o `profile` é carregado **assincronamente após** o `user` ficar disponível (`setTimeout(() => fetchProfile(...), 0)`). Existe uma janela curta em que `user !== null` mas `profile === null`. O `ProtectedRoute` precisa tratar isso como "ainda carregando" para não redirecionar empresa para `/candidato` por engano.

### (c) Estrutura proposta do `ProtectedRoute`

`src/components/auth/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute() {
  const { loading, user, profile } = useAuth();

  // 1. Sessão ainda carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 2. Não logado → /login
  if (!user) return <Navigate to="/login" replace />;

  // 3. Logado mas perfil ainda não carregou → loading
  //    (evita redirecionar empresa para /candidato por engano)
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 4. Candidato não pode acessar /app
  if (profile.user_type === "candidato") {
    return <Navigate to="/candidato" replace />;
  }

  // 5. Empresa / recrutador → libera
  return <Outlet />;
}
```

### (d) Mudança exata em `src/App.tsx`

Adicionar import:
```ts
import ProtectedRoute from "@/components/auth/ProtectedRoute";
```

Substituir o bloco da linha 43:
```tsx
<Route path="/app" element={<AppLayout />}>
```

Por uma rota de proteção que envolve o `AppLayout`, mantendo todas as filhas intactas:
```tsx
<Route path="/app" element={<ProtectedRoute />}>
  <Route element={<AppLayout />}>
    <Route index element={<Painel />} />
    <Route path="vagas" element={<JobsList />} />
    {/* ...todas as rotas filhas atuais, sem mudança... */}
    <Route path="carreiras" element={<PlaceholderPage title="Página de Carreiras" description="Configure sua página pública de carreiras." />} />
  </Route>
</Route>
```

O `ProtectedRoute` renderiza `<Outlet />` quando autorizado → o `<Outlet />` é o `AppLayout` → o `AppLayout` renderiza seu próprio `<Outlet />` com a página filha. Aninhamento padrão do React Router, sem alterar nada dentro das páginas.

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/auth/ProtectedRoute.tsx` | Criar |
| `src/App.tsx` | Adicionar import + envolver `/app` com `ProtectedRoute` |

### Guardrails respeitados

- AuthContext **não modificado** — apenas consumido.
- Nenhuma página dentro de `/app` alterada.
- Rotas públicas (`/`, `/signup`, `/login`, `/carreiras`, `/verify-email`, `/onboarding`, `/candidato`, `/vaga/:id/candidatar`) **inalteradas**.
- Fluxo de Login/Signup **inalterado** (Login já redireciona via mudança de auth state — quando o usuário logar, o `ProtectedRoute` libera o acesso na próxima renderização).

### Nota sobre o modo dev

A memória do projeto registra "modo dev" com RLS aberto. Esta proteção é **client-side de UX** — quando você reativar autenticação real e RLS por empresa, este `ProtectedRoute` continua válido e não precisa de ajuste.

