## Diagnóstico: dados salvos, mas página recarrega empresa errada

### Causa raiz
Em `CompanyProfile.tsx` (linhas 73-82), quando não há `ctxCompany` (modo dev sem auth), o fallback faz:

```ts
const { data } = await supabase.from("companies").select("id").limit(1).maybeSingle();
```

**Sem `ORDER BY`**, o Postgres retorna **qualquer** linha — pode variar entre reloads. Hoje há **4 empresas** no banco:

| nome_fantasia | cnpj | created_at |
|---|---|---|
| empresa teste | 11222333000110 | 2026-05-06 |
| teste4 | 11222333000144 | 2026-04-21 |
| Com voce, Scala | 36.438.676/0001-09 | 2026-04-21 |
| com você, Scala | 36438676000109 | 2026-04-20 |

Você edita uma (ex: `teste4`), clica Salvar — **o UPDATE acontece corretamente**. Mas ao recarregar a página, o fallback pode trazer outra empresa, dando a impressão de que "não salvou".

Além disso, quando você cria uma nova empresa via tela "Criar empresa", `companyId` é setado em memória — mas no próximo F5 o fallback escolhe outra.

### Frente única: tornar o carregamento determinístico

**Arquivo:** `src/pages/app/CompanyProfile.tsx`

**Mudança 1 — fallback ordenado + persistência local da escolha:**

```ts
useEffect(() => {
  (async () => {
    let id = ctxCompany?.id;
    if (!id) {
      // Dev: tenta usar a última empresa selecionada nesta sessão
      const stored = localStorage.getItem("dev_company_id");
      if (stored) {
        const { data } = await supabase.from("companies").select("id").eq("id", stored).maybeSingle();
        if (data) id = data.id;
      }
      // Fallback: empresa mais recente (determinístico)
      if (!id) {
        const { data } = await supabase
          .from("companies")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        id = data?.id;
      }
    }
    if (!id) { setLoading(false); return; }
    setCompanyId(id);
    localStorage.setItem("dev_company_id", id);
    // ...resto igual
  })();
}, [ctxCompany?.id]);
```

**Mudança 2 — após `handleCreateCompany`, persistir id:**

```ts
setCompanyId(data.id);
localStorage.setItem("dev_company_id", data.id);
```

### O que isso resolve
- Reload sempre traz a mesma empresa (a mais recente, ou a explicitamente criada/escolhida).
- Edições em qualquer aba (Geral/Cultura/Benefícios/Redes) ficam visíveis após F5.
- Não toca em RLS, auth, schema ou outras frentes.

### O que NÃO faz (fora de escopo)
- Não limpa as empresas duplicadas no banco (ex: "Com voce, Scala" vs "com você, Scala") — posso fazer numa frente separada se quiser.
- Não muda o comportamento em produção com auth real (`ctxCompany` continua sendo a fonte primária).
- Não altera `Onboarding.tsx`.

### Arquivos afetados
| Arquivo | Ação |
|---|---|
| `src/pages/app/CompanyProfile.tsx` | Ordenar fallback + persistir `dev_company_id` em localStorage |

Aguardo aprovação para implementar.