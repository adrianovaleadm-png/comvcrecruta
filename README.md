# comvcrecruta

SaaS de recrutamento e seleção construído no [Lovable](https://lovable.dev).

## Stack

- **Front-end:** React 18 + Vite + TypeScript + Tailwind + shadcn/ui
- **Back-end:** Supabase (PostgreSQL + Edge Functions Deno)
- **IA:** Lovable AI Gateway (Gemini)
- **Auth:** Supabase Auth
- **Roteamento:** react-router-dom v6
- **Estado servidor:** @tanstack/react-query
- **Forms:** react-hook-form + zod

## Rodar localmente

1. Pré-requisitos: [Bun](https://bun.sh) instalado.

   ```powershell
   winget install Oven-sh.Bun
   ```

2. Clone e configure:

   ```bash
   git clone https://github.com/adrianovaleadm-png/comvcrecruta.git
   cd comvcrecruta
   ```

   O arquivo `.env` já vem versionado com as chaves Supabase do projeto (são chaves
   públicas/anon — públicas por design no Vite). Se quiser apontar para outro projeto
   Supabase de teste, copie para `.env.local` e edite (esse sim fica fora do Git).

3. Instale e rode:

   ```bash
   bun install
   bun run dev
   ```

4. Acesse http://localhost:5173

## Estrutura

```
src/
  pages/             # Rotas (login, signup, app/*)
  components/        # Componentes React (ui/ = shadcn)
  contexts/          # AuthContext
  hooks/             # Hooks compartilhados
  integrations/
    supabase/        # Cliente e tipos auto-gerados
supabase/
  migrations/        # Migrações SQL versionadas
  functions/         # Edge functions Deno (IA, e-mails, dashboards)
  config.toml
```

## Lovable ↔ GitHub

Este projeto está sincronizado com Lovable. Edições no Lovable viram commits no GitHub automaticamente; edições neste repositório aparecem no Lovable em segundos.

### Variáveis de ambiente e segredos

- **`.env`** (versionado): contém apenas chaves públicas (`VITE_SUPABASE_PUBLISHABLE_KEY` é a anon key, que vai pro bundle do front-end de qualquer jeito). O Lovable lê deste arquivo para fazer o build do preview.
- **`.env.local`** (ignorado): use para overrides locais (ex: apontar dev para outro projeto Supabase).
- **Segredos reais** (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.) **nunca** entram no repo. Eles ficam nas **Edge Function Secrets** da Supabase, configurados pelo painel ou pela CLI:
  ```bash
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
  ```
  As edge functions os lêem via `Deno.env.get(...)`.

## Scripts

- `bun run dev` — servidor de desenvolvimento (hot reload)
- `bun run build` — build de produção
- `bun run lint` — eslint
- `bun run test` — vitest
