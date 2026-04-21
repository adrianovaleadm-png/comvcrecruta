

## Plano: Redirect pós-login (Frente A)

### Objetivo
Fazer com que, após login bem-sucedido, o usuário seja redirecionado automaticamente para sua área (/app para empresa/recrutador, /candidato para candidato). Também evitar que usuários já logados fiquem na tela de seleção de perfil.

### Alterações

**1. src/pages/Login.tsx**

Adicionar `useAuth` import, `useEffect` que escuta `user`, `profile` e `loading`:

```typescript
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Login() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();  // novo
  
  // Redirect quando autenticado
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.user_type === "candidato") {
        navigate("/candidato", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [loading, user, profile, navigate]);

  // ... resto do componente inalterado
}
```

**2. src/pages/Index.tsx**

Adicionar `useAuth` e `useEffect` para redirect de usuários já logados:

```typescript
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function Index() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();  // novo
  
  // Se já estiver logado, não fica na tela de escolha
  useEffect(() => {
    if (!loading && user && profile) {
      if (profile.user_type === "candidato") {
        navigate("/candidato", { replace: true });
      } else {
        navigate("/app", { replace: true });
      }
    }
  }, [loading, user, profile, navigate]);

  // ... resto do componente inalterado
}
```

### Guardrails respeitados
- Apenas adiciona imports, hooks e useEffect — não altera JSX, formulários ou handlers
- Lógica de login (handleLogin) inalterada
- Rotas públicas e App.tsx inalterados
- Usuário órfão contato@scalagestao.com.br não é modificado (fica para próxima etapa)

### Arquivos afetados
| Arquivo | Ação |
|---|---|
| `src/pages/Login.tsx` | Adicionar useAuth + useEffect redirect |
| `src/pages/Index.tsx` | Adicionar useAuth + useEffect redirect |

