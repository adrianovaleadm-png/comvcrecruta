## Plano

### 1. Limpar empresas de teste do banco
DELETE em cascata de tudo relacionado a empresas (já que `companies` não tem FKs, mas dados ficam órfãos):
- `DELETE FROM companies` (todas as 4+ linhas)
- `DELETE FROM company_members` (vínculos órfãos)
- Limpar `localStorage.dev_company_id` no código (será sobrescrito quando criar nova).

Não toco em: `profiles`, `jobs`, `applications`, `candidates` (não têm FK para company hoje, então não quebram).

### 2. Tratar erro de CNPJ duplicado em `CompanyProfile.tsx`
Em `handleCreateCompany` e `handleSave`:
```ts
if (error.code === '23505' && error.message.includes('cnpj')) {
  toast.error("Já existe uma empresa cadastrada com este CNPJ.");
  return;
}
```

### 3. Após limpar, o fluxo natural será:
- Você abre `/app/empresa` → não há empresa → tela "Criar empresa" aparece → cria "Com voce, Scala" do zero com CNPJ correto → edita perfil completo → salva.

### Ordem de execução
1. Migration/insert tool: `DELETE FROM company_members; DELETE FROM companies;`
2. Editar `src/pages/app/CompanyProfile.tsx`: adicionar tratamento do erro 23505 nos dois handlers + limpar `dev_company_id` do localStorage se a empresa não existir mais.

Sem mudanças de schema, RLS ou auth.