# Roteiro de Demonstração — com você, Recruta.

> Apresentação do sistema de Recrutamento e Seleção da COM VOCE SCALA
> Duração estimada: 15–20 minutos
> Versão: 1.0 — 2026-05-16

---

## ⏱️ Visão geral

| Bloco | Conteúdo | Tempo |
|---|---|---|
| 0 | Abertura (o problema) | 2 min |
| 1 | Painel principal | 2 min |
| 2 | 🎯 Criar vaga com IA | 3 min |
| 3 | Página pública de carreiras | 2 min |
| 4 | 🎯 Pipeline do candidato + Score IA | 4 min |
| 5 | 🎯 Agendamento + WhatsApp | 3 min |
| 6 | 🎯 Cases IA personalizados | 3 min |
| 7 | Analytics do funil | 2 min |
| 8 | Export PDF | 1 min |
| 9 | ROI + Roadmap | 2 min |
| | **Total** | **~22 min** |

🎯 = momentos de impacto (WOW). Os outros são contexto.

---

## ✅ Checklist pré-demo (fazer 15-20 min antes)

### A. Empresa cadastrada completa
- [ ] `/app/empresa` — todos os campos preenchidos
- [ ] Logo subido
- [ ] Missão, Visão, Valores (3-5), Propósito
- [ ] Benefícios (5-7 bullets), Diferenciais (3-5)
- [ ] Endereço, LinkedIn, Instagram

### B. Pipeline com vida
- [ ] Vaga Estagiário DP com pelo menos 5 candidatos distribuídos:
  - 1-2 em Triagem
  - 1-2 em Entrevista
  - 1 em Case (Yan Augusto)
  - 1 em Oferta (mover algum pra simular)

### C. Teste cego
- [ ] Rodar o roteiro inteiro sozinho 1x
- [ ] Anotar qualquer erro/lentidão
- [ ] Garantir popups permitidos no navegador (export PDF abre em nova aba)

### D. Ambiente
- [ ] Sair de qualquer aba do Lovable AI
- [ ] Logar como empresa no `comvcrecruta.lovable.app`
- [ ] Manter o GMail/WhatsApp Web abertos em background (pra demo do envio)

---

## 🚫 NÃO clicar (placeholders)

| Rota | Por quê |
|---|---|
| `/app/mensagens` | Não implementado |
| `/app/vagas-internas` | Não implementado |
| `/app/indicacoes` | Não implementado |
| `/app/equipe` | Não implementado |
| `/app/requisicoes` | Não implementado |
| `/app/templates` | Não implementado |
| `/app/carreiras` (admin) | Não implementado (a versão pública `/carreiras` funciona) |

Se perguntarem: *"Está no roadmap pra Q3. Estamos validando uso interno antes de expandir."*

---

# 🎬 Roteiro detalhado

## Bloco 0 — Abertura (2 min)

> *"Vou apresentar pra vocês o **com você, Recruta.** — sistema próprio de Recrutamento e Seleção que desenvolvemos para a COM VOCE SCALA, com foco em IA aplicada ao processo seletivo.*
>
> *O problema que estamos resolvendo: hoje recrutamento é feito de forma artesanal. Planilha de candidatos, currículos no Drive, conversas dispersas no WhatsApp, e-mails soltos. Cada vaga consome 10-15 horas de recrutador, perdemos talentos bons por falta de organização, e não temos métrica para saber se estamos melhorando.*
>
> *O sistema que vou mostrar resolve isso em 8 dimensões. Vou guiar vocês por uma vaga real que já está rodando — **Estagiário de Departamento Pessoal** — com candidatos reais. Vamos começar."*

---

## Bloco 1 — Painel principal (2 min)

**Ação:** abre `comvcrecruta.lovable.app/app` (Painel).

> *"Esta é a tela inicial. Olhe os KPIs:*
> - *Vagas abertas: [N]*
> - *Candidatos ativos: [N]*
> - *Conversão da etapa Recebida → Entrevista: [N]%*
> - *Tempo médio em cada etapa*
>
> *Isso eu nunca tive antes. Antes eu precisava abrir 3 planilhas pra montar."*

**Mostra:** funil visual com as etapas, atividades recentes.

---

## Bloco 2 — 🎯 Criar vaga com IA (3 min) — **WOW 1**

**Ação:** vai em `/app/vagas/nova` (ou clica "+ Nova Vaga").

Preenche manualmente apenas:
- Título: `Analista de Departamento Pessoal Pleno` (ou outra que faça sentido)
- Localização: `Belém, PA`
- Tipo: `CLT`
- Senioridade: `Pleno`
- Modalidade: `Híbrido`
- Skills: digita 3-4 (`eSocial`, `Excel Avançado`, `Folha de Pagamento`)

**Ação:** clica em **"Gerar descrição com IA"** ✨

> *"Olha o que acontece. Em **5 segundos**, a IA gera uma descrição completa, estruturada: resumo, responsabilidades, requisitos, diferenciais, benefícios, chamada final.*
>
> *Antes eu gastava 30-45 minutos por vaga só nessa parte. Multiplica por 10 vagas/mês — economizo entre 5 e 7 horas só aqui."*

**Ação:** rola até "Perguntas de Triagem" → clica em **"Gerar com IA"**.

> *"Mesma coisa pra triagem. A IA olha o que coloquei na vaga e gera 4-6 perguntas específicas pra eu filtrar candidatos na entrada. Mistura tipos: sim/não, texto, múltipla escolha.*
>
> *Outra economia operacional."*

**Ação:** mostra a configuração de **Score Weights** (pesos da avaliação).

> *"E aqui eu defino o que importa MAIS pra essa vaga. Pra Analista Pleno, peso 30% em habilidades técnicas. Pra um Estagiário, eu pesaria mais em soft skills. Cada vaga tem sua receita."*

**Pode salvar a vaga ou descartar — o ponto foi mostrar a IA.**

---

## Bloco 3 — Página pública de carreiras (2 min)

**Ação:** abre `comvcrecruta.lovable.app/carreiras` em nova aba (sem login).

> *"Isso é o que o candidato vê quando entra no nosso site de carreiras. Não é um formulário cinza — é uma carta de apresentação da empresa."*

**Mostra:**
- Logo da COM VOCE SCALA
- Lista de vagas abertas
- Missão, valores, ambiente de trabalho

Clica numa vaga → mostra a página de detalhes + formulário de candidatura.

> *"Repare no checkbox no fim — **Política de Privacidade**. Estamos **compliant com LGPD** desde o primeiro dia: consentimento explícito, dados protegidos, direitos do candidato documentados."*

---

## Bloco 4 — 🎯 Pipeline + Score IA (4 min) — **CORAÇÃO DO DEMO**

**Ação:** volta no app, vai em `/app/vagas` → clica na vaga **Estagiário de DP** → **"Pipeline"**.

> *"Aqui é o coração do sistema. Pipeline Kanban — funciona como um Trello, mas pra candidatos. Cada coluna é uma etapa do processo."*

**Mostra:** as colunas com candidatos espalhados, score visível no card.

**Ação:** clica no card da **Raissa Nayra** (95%).

> *"Vou abrir a Raissa. Ela está com **95% de fit** segundo a IA."*

**Mostra abas do drawer:**

**Aba Resumo:**
> *"Dados completos: contato, cidade, LinkedIn. Tudo num lugar só."*

**Aba Score:**
> *"Score geral 95%, com **análise IA em texto** explicando POR QUÊ. Veja:*
> *'Candidata apresenta fit excelente, pois já atua como estagiária de RH há 1 ano...'*
>
> *E abaixo, **6 critérios** com pontuação individual:*
> - *Triagem: 100*
> - *Experiência: 95*
> - *Localização: 100*
> - *Senioridade: 100*
> - *Soft Skills: 90*
> - *Habilidades Técnicas: 85*
>
> *Cada um com nota explicativa. Antes a triagem era subjetiva, baseada no feeling do recrutador. Agora tenho **referência objetiva pra justificar minha decisão**."*

**Aba Triagem:**
> *"Aqui vejo as respostas que ela deu no formulário público. Posso comparar com o que a IA pontuou."*

**Aba IA:**
> *"E aqui — talvez minha feature favorita. Pra cada candidato, em cada etapa, a IA sugere **perguntas customizadas** pra entrevista."*

**Ação:** clica em **"Sugerir perguntas para Entrevista"** ✨

> *"Em 5 segundos, 5-8 perguntas baseadas no PERFIL DELA. Olha:*
> *'Você mencionou Excel Avançado — pode dar um exemplo de macro VBA que já criou?'*
>
> *Isso é uma pergunta que SÓ faz sentido pra essa candidata. Eu chego na entrevista PREPARADO, com pergunta pertinente. Antes eu ia no improviso."*

**Aba Processo:**
> *"E aqui acompanho a etapa: o objetivo dela, próximas ações, critérios de avanço, SLA em dias. Tudo documentado."*

---

## Bloco 5 — 🎯 Agendamento + WhatsApp (3 min) — **WOW 2**

**Continuação na Raissa, aba Processo.**

**Ação:** clica no checkbox/botão **"Agendar"** da ação "Agendar call/presencial".

> *"Modal abre. Olha o que ele me oferece:"*

**Mostra:**
- Modalidade: presencial / online (botões)
- Data e hora
- **Endereço da empresa pré-preenchido** (puxado de `/app/empresa`)
- Nome do entrevistador pré-preenchido (meu nome)
- Duração

**Preenche** data + hora + duração.

> *"Conforme eu preencho, lá embaixo aparece a mensagem PRONTA pra WhatsApp — profissional, formatada, sem emoji, com o endereço completo, dados da empresa, prazo de duração."*

**Ação:** clica em **"Abrir no WhatsApp"** (botão verde).

> *"Olha o que acontece — abre a conversa do WhatsApp DIRETO com a Raissa, mensagem já no campo de envio. Eu só revisar e dar enter.*
>
> *Antes esse fluxo era: Google Calendar → Zoom → copiar link → WhatsApp → escrever mensagem do zero → enviar. Cinco abas, três ferramentas, 5 minutos por candidato.*
>
> *Agora: **30 segundos**. E fica registrado no histórico do candidato."*

**Ação:** clica em **"Confirmar agendamento"** (fica registrado no histórico).

---

## Bloco 6 — 🎯 Cases IA personalizados (3 min) — **WOW 3**

**Ação:** fecha o drawer da Raissa. Volta no Pipeline e abre o **Yan Augusto** (etapa Case).

Vai na aba **Processo**.

> *"Quando o candidato chega na etapa de Case, eu preciso pensar: que desafio prático aplicar? Antes eu reusava o mesmo case pra todos. Agora..."*

**Mostra a seção "📋 Case desta etapa".**

> *"Eu escolho **o TIPO de case** que faz sentido pra esse candidato e essa vaga:*
> - **🧠 Comportamental:** *avalia postura, decisão, comunicação*
> - **🔧 Técnico:** *exercício prático com entregáveis*
> - **❤️ Cultural:** *alinhamento com missão e valores DA NOSSA EMPRESA*"

**Ação:** seleciona **Cultural** → clica em **"Gerar cases cultural com IA"**.

> *"Repare: a IA NÃO usa um template genérico. Ela puxa os valores que cadastramos em /app/empresa. Os cases que vão aparecer vão mencionar pelo nome a missão, valores e propósito da COM VOCE SCALA.*
>
> *Em 8 segundos vão aparecer **3 cards** — básico, intermediário, avançado. Eu escolho o nível adequado pro perfil dele."*

**Mostra os 3 cards quando aparecerem.** Clica em **"Ver texto completo"** num deles.

> *"Veja aqui — está mencionando o valor 'X' da nossa empresa pelo nome. É um case que SÓ existe pra COM VOCE SCALA. Não é genérico, não é internet."*

**Ação:** seleciona um → define prazo → clica em **"Enviar via WhatsApp"** (mostra que abriria a conversa).

---

## Bloco 7 — Analytics (2 min)

**Ação:** vai em `/app/analytics`.

> *"Métricas que nunca tivemos. Olha:*
> - *Funil de conversão por etapa: quantos passam de Triagem pra Entrevista, etc.*
> - *Taxa de contratação no mês*
> - *Tempo médio em cada etapa — eu consigo identificar GARGALOS*
> - *Total de candidatos ativos*
>
> *Posso filtrar por vaga. Posso comparar vagas. **Tomada de decisão baseada em dado, não em achismo**."*

---

## Bloco 8 — Export PDF (1 min)

**Ação:** volta no Pipeline da vaga → clica em **"📥 Exportar relatório"**.

**Aba nova abre com o relatório completo.**

> *"Pra mandar pra vocês, pra um gestor que quer revisar candidatos, ou pra arquivar o processo finalizado. Um PDF profissional com a descrição da vaga, todos os candidatos ordenados por score, análise IA, score detalhado e respostas de triagem. Compliance e auditoria."*

**Clica em "Imprimir / Salvar PDF"** — só pra mostrar que funciona.

---

## Bloco 9 — ROI + Roadmap (2 min)

> *"Pra fechar — o que esse sistema entrega em números:"*

### Comparativo

| Atividade | Antes | Agora | Economia |
|---|---|---|---|
| Descrever uma vaga | 30-45 min | 5 min | ~30 min/vaga |
| Triagem por candidato | 2-3 min | Score automático | ~80% |
| Agendar entrevista | 5 min | 30 segundos | ~90% |
| Gerar perguntas de entrevista | 15-30 min (improviso) | 5 segundos (customizado) | ~99% |
| Criar case | 1-2h (Google) | 8 segundos (IA + nossa cultura) | ~99% |
| Relatório pra gestão | 30 min (montar planilha) | 5 segundos (PDF pronto) | ~99% |

**Estimativa mensal:** *"Com 10 vagas/mês, economizamos entre 30 e 50 horas de recrutador. Equivalente comercial seria assinatura tipo **Gupy (R$ 500-2000/usuário/mês)**. Esse é um sistema próprio, sem licenciamento."*

### Roadmap

> *"Próximos 90 dias:*
> 1. *E-mail automatizado pro candidato (substituir WhatsApp manual)*
> 2. *Área do candidato — ele acompanha próprio status*
> 3. *Integração com Google Calendar*
> 4. *IA avaliar respostas dos cases (já planejado)*
>
> *Próximos 180 dias:*
> - *Integração com job boards (LinkedIn, Indeed)*
> - *Programa de indicações com tracking*
> - *Scorecards estruturados de entrevista*
> - *App mobile para entrevistadores"*

### Encerramento

> *"O que estamos construindo é um ATS próprio com IA aplicada, sem custo de licença. Já operacional para vagas reais. Compliance LGPD. Pronto pra expandir pra outras áreas conforme validarmos uso interno.*
>
> *Abro pra perguntas."*

---

## 💼 Q&A: perguntas prováveis dos diretores

| Pergunta | Resposta sugerida |
|---|---|
| *"Quanto custou desenvolver?"* | *"Desenvolvimento próprio com IA — infra Lovable + Supabase. Custo bem inferior a uma assinatura ATS comercial."* |
| *"É seguro?"* | *"LGPD compliant: consentimento explícito no formulário, CVs em armazenamento privado com acesso autenticado, política de privacidade publicada, auditoria de movimentações no histórico."* |
| *"O candidato vê o quê?"* | *"Hoje: site público com a nossa cara, formulário profissional, política de privacidade. Próxima fase: área do candidato onde ele acompanha o status."* |
| *"Cabe outras vagas além de DP?"* | *"Sim, a IA adapta automaticamente ao tipo de vaga — testamos com vagas técnicas, vendas, etc. Cases e perguntas são contextualizadas."* |
| *"E se a IA errar?"* | *"A IA não DECIDE. Ela sugere — score, perguntas, cases — e eu confirmo. Cada output é um apoio, não veredicto. Tenho a palavra final."* |
| *"Por que não um ATS de mercado tipo Gupy?"* | *"Custo: Gupy/Sólides custam R$ 500-2000 por usuário/mês. Customização: o nosso sistema tem cases que mencionam NOSSA missão e valores. Controle: dados sob nossa infra, sem dependência."* |
| *"Quem pode usar?"* | *"Hoje qualquer um da área de R&S com login. Próximo passo é permissões por papel (recrutador / gestor / aprovador). Roadmap Q3."* |
| *"Quanto tempo demorou pra fazer?"* | *"Iteração contínua nas últimas semanas com apoio de IA pra desenvolvimento. 15 funcionalidades entregues, sistema em uso real."* |
| *"E se quiser parar?"* | *"Dados são nossos. Banco de candidatos exportável (já tem botão de Export PDF). Sem lock-in."* |

---

## 🆘 Plano de contingência

### Se algo travar durante o demo

- **Página branca ou loading infinito:** `Ctrl+Shift+R` pra hard refresh.
- **Botão de IA dá erro:** tem 2 vezes; mude pra outro candidato/vaga; se persistir, pule.
- **WhatsApp não abre:** mostre só a mensagem copiada na tela.
- **Algum dado vazio na empresa:** pule essa parte e siga.

### Se faltar tempo
**Bloco essencial (10 min):**
1. Painel (1 min)
2. Pipeline + Score Raissa (4 min)
3. Agendamento WhatsApp (2 min)
4. Cases IA (2 min)
5. ROI (1 min)

Os outros blocos podem ficar de fora se o tempo apertar.

---

## 📞 Contatos rápidos

- Repositório: https://github.com/adrianovaleadm-png/comvcrecruta
- App em produção: https://comvcrecruta.lovable.app
- Painel de desenvolvimento: https://lovable.dev/projects/f95676c9-c0cc-4445-b6de-7d9be2ad82b3

---

*Boa apresentação! 💼*
