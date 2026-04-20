

## Plano: Drawer do Candidato + Página de Carreiras + Timeline de Comunicação

Vou implementar as 3 frentes em sequência, numa única entrega.

---

### Frente 1 — Drawer de detalhe do candidato (Pipeline)

**Comportamento:** clicar num card do pipeline abre um painel lateral (Sheet) com tudo sobre o candidato.

**Conteúdo do drawer (4 abas):**
- **Resumo** — avatar, nome, contato (email/telefone/cidade/LinkedIn), CV (link do `candidate_files`), resumo, tags
- **Score** — `FitScoreBadge` + breakdown por critério (de `candidate_scores.criteria_scores`) + `ai_summary`
- **Triagem** — perguntas de `screening_questions` com respostas de `screening_answers`
- **Processo** — `CandidateActionsPanel` (já pronto) com checklist da etapa + histórico de movimentações filtrado de `activity_events` (entity_type='application', entity_id=app.id)

**Ações no rodapé:**
- Mover etapa (select com as stages da vaga) → reusa fluxo de notificação já existente
- Marcar como Contratado / Reprovado (atalhos)
- Abrir perfil completo (link para `/app/talentos/:id`)

**Arquivos:**
- Criar `src/components/pipeline/CandidateDrawer.tsx`
- Editar `src/pages/app/Pipeline.tsx` — onClick no card abre o drawer (estado `selectedAppId`)

---

### Frente 2 — Página pública de Carreiras

**Rota:** `/carreiras/:companySlug?` (sem slug = lista de empresas se houver mais de uma; com slug = página da empresa)

Como o app hoje opera com 1 empresa em modo dev, simplificamos: **`/carreiras`** mostra a primeira (e única) empresa cadastrada.

**Estrutura da página:**
1. **Hero** — logo, nome fantasia, propósito, missão (de `companies`)
2. **Sobre** — descrição, valores, ambiente de trabalho, modelo de trabalho
3. **Benefícios** — chips de `companies.beneficios`
4. **Vagas abertas** — grid de cards puxando de `jobs` onde `status='open'`
   - Filtros: departamento, modelo de trabalho, senioridade
   - Card mostra: título, departamento, localização, modelo, faixa salarial
   - Botão "Candidatar-se" → `/aplicar/:jobId` (reusa `PublicApplication.tsx` existente)
5. **Footer** — redes sociais (LinkedIn, Instagram, website)

**Arquivos:**
- Criar `src/pages/Carreiras.tsx`
- Editar `src/App.tsx` — rota pública `/carreiras`
- Opcional: card no Painel com link "Ver minha página de Carreiras"

---

### Frente 3 — Timeline de comunicação no perfil do candidato

**Onde:** `src/pages/app/TalentProfile.tsx` — nova aba "Comunicação"

**Conteúdo:**
- Lista cronológica reversa de eventos `activity_events` onde:
  - `entity_type='application'` AND `entity_id IN (apps do candidato)`
  - `type IN ('email_sent','email_logged','stage_changed','status_changed')`
- Cada item mostra: ícone (✉️ / 🔄), data/hora, etapa, assunto do e-mail (do `metadata`), badge "enviado" ou "log-only"
- Filtro por vaga (se candidato está em mais de uma)

**Pequeno ajuste na edge function** `send-stage-notification`:
- Garantir que sempre grave em `activity_events` com:
  - `type='email_sent'` (com domínio configurado) ou `'email_logged'` (modo log-only)
  - `metadata`: `{ stage_name, assunto, to_email, mode }`

**Arquivos:**
- Editar `src/pages/app/TalentProfile.tsx` — adicionar aba "Comunicação"
- Editar `supabase/functions/send-stage-notification/index.ts` — padronizar log

---

### Resumo de arquivos

| Arquivo | Ação |
|---|---|
| `src/components/pipeline/CandidateDrawer.tsx` | Criar |
| `src/pages/app/Pipeline.tsx` | Plugar drawer no clique do card |
| `src/pages/Carreiras.tsx` | Criar |
| `src/App.tsx` | Adicionar rota `/carreiras` |
| `src/pages/app/TalentProfile.tsx` | Aba "Comunicação" com timeline |
| `supabase/functions/send-stage-notification/index.ts` | Padronizar registro em activity_events |

### Resultado
- Recrutador trabalha o pipeline sem sair da tela (drawer)
- Empresa ganha vitrine pública com sua cultura + vagas abertas
- Toda comunicação enviada fica auditável no perfil do candidato

