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
   cp .env.example .env
   # edite .env com os valores do seu projeto Supabase
   ```

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

## Scripts

- `bun run dev` — servidor de desenvolvimento (hot reload)
- `bun run build` — build de produção
- `bun run lint` — eslint
- `bun run test` — vitest
