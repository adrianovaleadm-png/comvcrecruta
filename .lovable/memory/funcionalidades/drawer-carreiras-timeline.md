---
name: Drawer + Carreiras + Timeline
description: Drawer no pipeline para detalhe do candidato, página pública /carreiras com vagas abertas, timeline de comunicação no perfil do talento
type: feature
---

## Drawer do Candidato (Pipeline)
- Componente: `src/components/pipeline/CandidateDrawer.tsx` (Sheet à direita)
- Abre ao clicar no card do pipeline (estado `selectedAppId` em `Pipeline.tsx`)
- 4 abas: Resumo (contato/CV/tags) · Score (overall + critérios + AI) · Triagem (perguntas+respostas) · Processo (CandidateActionsPanel + histórico de activity_events)
- Footer: Select de etapa + Mover (com notificação), Contratar/Reprovar, link p/ perfil completo

## Página de Carreiras (`/carreiras`)
- `src/pages/Carreiras.tsx` — pública (sem auth)
- Hero (logo, propósito), Sobre (missão/visão/valores/ambiente), Benefícios, Vagas abertas (filtros: busca, departamento, modelo)
- Card de vaga linka para `/vaga/:id/candidatar` (PublicApplication existente)
- Footer com LinkedIn/Instagram/Website
- Single-tenant: usa primeira empresa em `companies`

## Timeline de Comunicação (TalentProfile)
- Nova seção em `src/pages/app/TalentProfile.tsx`
- Lê `activity_events` onde entity_type='application' AND entity_id IN (apps do candidato)
- Tipos exibidos: email_sent, email_logged, email_skipped, stage_changed, status_changed
- Ícones: ✉️ para e-mails, ↔️ para movimentações; badges: enviado/log-only/não enviado

## Edge function `send-stage-notification`
- Padronizou tipos de evento: `email_logged` (modo log-only), `email_sent` (futuro com domínio), `email_skipped` (sem email/sem template)
- Sempre grava metadata: { stage_name, assunto, to_email, body, mode }
