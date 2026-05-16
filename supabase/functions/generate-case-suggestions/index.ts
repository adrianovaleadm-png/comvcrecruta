import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResp = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type CaseType = "comportamental" | "tecnico" | "cultural";

function buildJobContextBlock(job: any): string {
  return [
    "## Vaga",
    `- Título: ${job.title}`,
    `- Senioridade: ${job.seniority || "não informada"}`,
    `- Tipo: ${job.type || "não informado"}`,
    `- Modalidade: ${job.work_model || "não informada"}`,
    `- Departamento: ${job.department || "não informado"}`,
    `- Habilidades requeridas: ${job.required_skills?.join(", ") || "não informadas"}`,
    `- Descrição: ${(job.description || "").substring(0, 800)}`,
  ].join("\n");
}

function buildCompanyContextBlock(company: any): string {
  if (!company) return "";
  const parts: string[] = ["## Cultura da Empresa", `- Nome: ${company.nome_fantasia || "(não informado)"}`];
  if (company.descricao) parts.push(`- Descrição: ${company.descricao}`);
  if (company.proposito) parts.push(`- Propósito: ${company.proposito}`);
  if (company.missao) parts.push(`- Missão: ${company.missao}`);
  if (company.visao) parts.push(`- Visão: ${company.visao}`);
  if (company.valores) parts.push(`- Valores: ${company.valores}`);
  if (company.ambiente_trabalho) parts.push(`- Ambiente de trabalho: ${company.ambiente_trabalho}`);
  if (Array.isArray(company.diferenciais) && company.diferenciais.length > 0) {
    parts.push(`- Diferenciais: ${company.diferenciais.join(", ")}`);
  }
  return parts.join("\n");
}

function buildPromptComportamental(job: any): string {
  return `Você é um especialista em recrutamento e seleção. Gere 3 propostas de **Case Comportamental** para a etapa final de avaliação de um candidato. Cada proposta em um nível diferente (básico, intermediário, avançado).

IMPORTANTE: são cases COMPORTAMENTAIS, NÃO técnicos. Avaliam como a pessoa age, decide, se comunica e se posiciona diante de situações reais do dia a dia. Peça que o candidato DESCREVA como agiria, raciocinaria e se comunicaria — não que execute exercícios técnicos.

${buildJobContextBlock(job)}

## Níveis
- **Básico** (~20-30 min): Situação cotidiana, baixo risco, postura adequada. Sem experiência prévia.
- **Intermediário** (~30-45 min): Dilema interpessoal/ético leve, exige comunicação difícil. 6m-1ano de experiência.
- **Avançado** (~45-60 min): Conflito complexo, múltiplos stakeholders, ambiguidade moral. Júnior experiente.

## Estrutura do case (campo "description")
\`\`\`
SITUAÇÃO: [título curto]

Contexto
[2-4 linhas situando o cenário e o papel do candidato]

A situação
[5-10 linhas: descrição detalhada da situação/dilema, em segunda pessoa]

O que você deve responder
1. Como você lidaria com essa situação? Passo a passo.
2. Qual o raciocínio por trás de cada decisão?
3. Que cuidados/precauções tomaria? Com quem consultaria?

Como entregar
- Resposta escrita (Word, Google Docs ou corpo de e-mail)
- Prazo: [recrutador define]
- Tamanho: 1-2 páginas

O que estamos avaliando
- Postura profissional
- Clareza de comunicação
- Tomada de decisão sob ambiguidade
- [específico do nível]

Tempo esperado
~[X] de reflexão e escrita.
\`\`\`

Cases REALISTAS, contextualizados na área da vaga. Linguagem pt-BR, segunda pessoa.`;
}

function buildPromptTecnico(job: any): string {
  return `Você é um especialista em recrutamento e seleção. Gere 3 propostas de **Case Técnico** para a etapa final de avaliação técnica de um candidato. Cada proposta em um nível diferente (básico, intermediário, avançado).

IMPORTANTE: são cases TÉCNICOS — exercícios executáveis que avaliam conhecimento prático, raciocínio analítico e capacidade de produzir entregáveis (planilhas, análises, código, redação técnica) específicos da função.

${buildJobContextBlock(job)}

## Níveis
- **Básico** (~30-45 min): Tarefa simples com ferramenta básica (Excel, redação). Sem expertise complexa. Sem experiência prévia.
- **Intermediário** (~1h-1h30): Análise + ação técnica que exige raciocínio estruturado + 1 habilidade específica da vaga. 6m-1ano de experiência.
- **Avançado** (~2h-3h): Integra múltiplas habilidades, exige autonomia, pode envolver ferramenta. Júnior experiente.

## Estrutura do case (campo "description")
\`\`\`
DESAFIO: [título do case]

Cenário
[2-4 linhas situando o problema técnico realista da função]

O que você deve entregar
1. [primeiro deliverable concreto]
2. [segundo deliverable]
3. [terceiro deliverable — pode ser síntese/recomendação]

Como entregar
- [formato: documento, planilha, código, etc.]
- Prazo: [recrutador define]
- Enviar como resposta a esta mensagem

O que estamos avaliando
- [dimensão técnica 1]
- [dimensão técnica 2]
- [dimensão técnica 3]
- [dimensão 4 opcional]

Tempo esperado
~[X] de dedicação. Não é prova de velocidade — é avaliação de qualidade e raciocínio.
\`\`\`

Cases REALISTAS, ligados à rotina da função (não acadêmicos). Para DP/RH: conferência de ponto, análise eSocial, cálculo de rescisão, etc. Adapte ao contexto da vaga. Linguagem pt-BR.`;
}

function buildPromptCultural(job: any, company: any): string {
  const companyBlock = buildCompanyContextBlock(company);
  return `Você é um especialista em recrutamento e seleção, especializado em fit cultural. Gere 3 propostas de **Case Cultural** para a etapa final de avaliação de um candidato. Cada proposta em um nível diferente (básico, intermediário, avançado).

IMPORTANTE: são cases CULTURAIS — situações ou perguntas que avaliam o alinhamento do candidato com a missão, visão, valores e propósito ESPECÍFICOS desta empresa. NÃO genéricos. Usam o conteúdo cultural real da empresa abaixo.

${buildJobContextBlock(job)}

${companyBlock || "## Cultura da Empresa\n- (Empresa ainda não preencheu missão/valores. Trabalhe com inferência da descrição da vaga.)"}

## Níveis
- **Básico** (~20-30 min): Autoavaliação simples — qual valor da empresa mais ressoa com você, e por quê. Foco em capacidade de reflexão e exemplos pessoais.
- **Intermediário** (~30-45 min): Situação hipotética em que dois valores da empresa entram em tensão leve. Qual escolheria? Como justifica? Foco em julgamento e priorização.
- **Avançado** (~45-60 min): Cenário complexo onde múltiplos valores estão em conflito ou em risco. O candidato precisa tomar decisão, justificar e propor como manter a cultura intacta sob pressão. Foco em liderança cultural.

## Estrutura do case (campo "description")
\`\`\`
REFLEXÃO CULTURAL: [título curto]

Contexto
[2-4 linhas conectando o cenário a um valor/missão/propósito específico da empresa]

A situação ou pergunta
[Para básico: pergunta reflexiva direta. Para intermediário/avançado: situação detalhada que evoca tensão entre valores. Use os valores REAIS da empresa nominalmente.]

O que você deve responder
1. [primeira reflexão pedida — exemplo pessoal, decisão hipotética, etc.]
2. [segunda reflexão — raciocínio, justificativa]
3. [terceira — opcional, mais profunda]

Como entregar
- Resposta escrita (Word, Google Docs ou corpo de mensagem)
- Prazo: [recrutador define]
- Tamanho: 1-2 páginas

O que estamos avaliando
- Compreensão e identificação com os valores da empresa
- Capacidade de reflexão e autoavaliação
- [específico do nível: priorização / liderança cultural]

Tempo esperado
~[X] de reflexão e escrita.
\`\`\`

Cases REFERENCIAM EXPLICITAMENTE os valores/missão/propósito da empresa (use os nomes/textos exatos). Para empresa sem cultura preenchida, infira da descrição da vaga e seja honesto. Linguagem pt-BR, tom profissional e humano.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth guard
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "Não autorizado" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !user || user.aud !== "authenticated") {
      return jsonResp({ error: "Não autorizado" }, 401);
    }

    const body = await req.json();
    const { job_id, case_type } = body as { job_id?: string; case_type?: CaseType };

    if (!job_id) return jsonResp({ error: "job_id é obrigatório" }, 400);
    const typeSafe: CaseType =
      case_type === "tecnico" || case_type === "cultural" ? case_type : "comportamental";

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, serviceKey);

    // Busca vaga + empresa (junta via FK)
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "title, description, seniority, work_model, required_skills, type, department, " +
        "company_id, companies(nome_fantasia, descricao, missao, visao, valores, proposito, ambiente_trabalho, diferenciais)"
      )
      .eq("id", job_id)
      .single();
    if (!job) return jsonResp({ error: "Vaga não encontrada" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResp({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const jobAny = job as any;
    const company = jobAny.companies ?? null;

    let userPrompt: string;
    let systemPrompt: string;

    if (typeSafe === "tecnico") {
      userPrompt = buildPromptTecnico(jobAny);
      systemPrompt =
        "Você é um especialista em recrutamento. Gere cases TÉCNICOS (exercícios executáveis com entregáveis concretos) em pt-BR. Retorne apenas JSON válido sem markdown.";
    } else if (typeSafe === "cultural") {
      userPrompt = buildPromptCultural(jobAny, company);
      systemPrompt =
        "Você é um especialista em recrutamento e fit cultural. Gere cases CULTURAIS que avaliam alinhamento com missão/valores/propósito específicos da empresa em pt-BR. Retorne apenas JSON válido sem markdown.";
    } else {
      userPrompt = buildPromptComportamental(jobAny);
      systemPrompt =
        "Você é um especialista em recrutamento e seleção. Gere cases COMPORTAMENTAIS (situações que avaliam postura, decisão, comunicação) em pt-BR. Retorne apenas JSON válido sem markdown.";
    }

    const jsonShape = `

Retorne APENAS JSON válido (sem markdown), no formato:

{
  "cases": [
    { "level": "basico", "title": "...", "description": "...", "evaluates": ["..."], "estimated_time": "..." },
    { "level": "intermediario", "title": "...", "description": "...", "evaluates": ["..."], "estimated_time": "..." },
    { "level": "avancado", "title": "...", "description": "...", "evaluates": ["..."], "estimated_time": "..." }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + jsonShape },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return jsonResp({ error: "Limite de requisições excedido. Tente novamente em instantes." }, 429);
      if (status === 402) return jsonResp({ error: "Créditos de IA esgotados." }, 402);
      const errText = await response.text();
      console.error("AI error:", status, errText);
      return jsonResp({ error: "Erro ao gerar cases." }, 500);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? "{}";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: { cases: any[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return jsonResp({ error: "Resposta da IA em formato inválido." }, 500);
    }

    if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
      return jsonResp({ error: "IA não retornou cases." }, 500);
    }

    return jsonResp({ cases: parsed.cases, case_type: typeSafe });
  } catch (e) {
    console.error("generate-case-suggestions error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
