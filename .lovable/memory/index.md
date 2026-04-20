# Memory: index.md
Updated: now

# Project Memory

## Core
- **App**: Recrutamento Inteligente (ATS). Roles: Candidate, Company, Recruiter.
- **Stack**: React/Next.js, Supabase (Lovable Cloud).
- **Design Constraint**: ONLY Tailwind CSS. NO external UI libraries allowed.
- **Priority**: Save credits by building essential bases and using placeholders for advanced modules.

## Memories
- [Authentication & Registration](mem://funcionalidades/autenticacao-cadastro) — 2-step company registration, validations, and async auth flow rules
- [Company Onboarding](mem://funcionalidades/onboarding-empresa) — Mandatory steps (logo, info) before dashboard access
- [Company Profile & Culture](mem://funcionalidades/perfil-empresa-cultura) — /app/empresa with 4 tabs (General, Culture, Benefits, Social) + public exposure
- [RLS & Access Patterns](mem://seguranca/padroes-acesso-rls) — Security definer functions, infinite recursion prevention, profile/company RLS
- [Sidebar Structure](mem://ui/estrutura-sidebar) — Main navigation sections for the company shell
- [Simplified Dev Access](mem://arquitetura/acesso-simplificado-dev) — Dev mode bypasses auth, uses 'anon' RLS for core entities
- [Jobs Hub](mem://funcionalidades/hub-de-vagas) — Job CRUD, hiring types, and automated 7-step pipeline
- [AI Job Generation](mem://ia/geracao-descricoes-vagas) — Supabase Edge Function + Gemini prompt structure (PT-BR)
- [Executive Dashboard](mem://funcionalidades/dashboard-executivo) — Metrics, funnel, and feeds via get-dashboard-overview edge function
- [Activity Monitoring](mem://arquitetura/monitoramento-atividades) — SQL triggers logging to activity_events for history
- [Applications Management](mem://funcionalidades/gestao-candidaturas) — Candidate statuses (active/hired/rejected) and stage linking
- [ATS Improvements](mem://funcionalidades/melhorias-ats-completas) — Auto-score, job edit, resume parsing, activity feed, candidate compare, templates, public application
- [Pipeline Communication](mem://funcionalidades/comunicacao-pipeline) — Stage email templates + dialog on move + edge function (log-only without Resend)
- [Stage Playbook](mem://funcionalidades/playbook-etapas) — Per-stage objective/actions/SLA, checklist per application, Processo tab in JobEdit
- [Pipeline Communication](mem://funcionalidades/comunicacao-pipeline) — stage_templates table, send-stage-notification edge function, confirm modal on move, "Comunicação" tab in JobEdit
