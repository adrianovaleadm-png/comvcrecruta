

## Plano: Signup de Candidato + Adoção Automática (revisado)

### Confirmação sobre auto-login
**Caso (b) confirmado**: o projeto está com **auto-confirm ATIVO**. Evidência: nos logs da auditoria anterior, `contato@scalagestao.com.br` recebeu `invalid_credentials` ao tentar login (não `email_not_confirmed`), provando que o email foi confirmado sem clique no link. Além disso, o `supabase.auth.signUp` retorna **session já preenchida** quando confirmação está desativada — o usuário já fica logado no momento do signup.

Conclusão: mandar o candidato para `/verify-email` é **errado** hoje — ele já está logado e a tela só causa confusão. Vai pedir pra "verificar email" enquanto o `useEffect` de redirect já poderia mandá-lo direto pra `/candidato`.

### Ajuste no plano: redirect pós-signup diferenciado

| Tipo | Comportamento atual | Comportamento novo |
|---|---|---|
| Empresa / Recrutador | `navigate("/verify-email")` | **Manter** `navigate("/verify-email")` (fluxo já validado, mantém guardrail) |
| Candidato | `navigate("/verify-email")` | `navigate("/candidato", { replace: true })` direto, ou nem navegar — deixar o `useEffect` do `Login`/`Index` resolver assim que `profile` carregar |

Vou usar `navigate("/candidato", { replace: true })` explícito após a adoção, para evitar flicker e ter controle determinístico.

### (a) Abordagem: **A — coluna `profile_id` em `candidates`** (sem mudança)

### (b) Mudanças exatas em `src/pages/Signup.tsx`

Em `handleSubmit`, **após** `profiles.insert`:

```typescript
if (userType === "candidato") {
  // Adoção: ligar candidates órfãos com mesmo email a este profile
  const emailLower = email.trim().toLowerCase();
  const { error: adoptError } = await supabase
    .from("candidates")
    .update({ profile_id: userId })
    .eq("email", emailLower)
    .is("profile_id", null);
  if (adoptError) console.warn("Adoção falhou:", adoptError);

  navigate("/candidato", { replace: true });
  return;
}

// empresa/recrutador: fluxo atual inalterado
if (isEmpresa) { /* ...code atual... */ }

navigate("/verify-email");
```

JSX: campos de empresa já são guardados por `isEmpresa`, então o form de candidato fica naturalmente simplificado (nome, email, senha, confirmar senha). Sem mudança de markup necessária.

### (c) Migration SQL (sem mudança)

```sql
ALTER TABLE public.candidates
  ADD COLUMN profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_profile_id
  ON public.candidates(profile_id);

CREATE INDEX IF NOT EXISTS idx_candidates_email
  ON public.candidates(lower(email));
```

### (d) RLS — sem mudança
A policy aberta atual em `candidates` permite o UPDATE da adoção. Restrição de segurança fica no client (`eq("email", emailLower)` + `is("profile_id", null)`). Policy hardened fica anotada para o futuro.

### (e) Ordem dos passos para candidato
1. `supabase.auth.signUp` (retorna session já válida — usuário logado)
2. `profiles.insert({ user_type: 'candidato', ... })`
3. `UPDATE candidates SET profile_id = userId WHERE lower(email) = ? AND profile_id IS NULL`
4. `navigate("/candidato", { replace: true })`

### Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/migrations/<nova>.sql` | ADD COLUMN `profile_id` + 2 índices |
| `src/pages/Signup.tsx` | Bloco de adoção + redirect direto para `/candidato` quando candidato |

### Guardrails respeitados
- Empresa/recrutador: fluxo de 2 passos e destino `/verify-email` **inalterados**.
- `PublicApplication.tsx`, `AuthContext`, `Login.tsx`, `/app/*`: **inalterados**.
- RLS: **não desativada**, **não alterada**.
- Adoção restrita ao próprio email + apenas registros sem `profile_id`.
- Sem DELETE/UPDATE em massa fora da adoção.
- Usuário órfão `contato@scalagestao.com.br`: **não tocado**.

### Observação para sua decisão futura
Quando você quiser ativar verificação real de email (produção), reabilitamos confirm no Cloud → Users → Auth Settings e o `/verify-email` volta a fazer sentido para empresa/recrutador também. O fluxo do candidato pode então ser ajustado para também passar por `/verify-email`. Por ora, mantenho candidato indo direto pro app porque é o comportamento real do sistema hoje.

