import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResp = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const { job_id } = await req.json();
    if (!job_id) return jsonResp({ error: "job_id é obrigatório" }, 400);

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, serviceKey);

    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, seniority, work_model, required_skills, type, department")
      .eq("id", job_id)
      .single();
    if (!job) return jsonResp({ error: "Vaga não encontrada" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResp({ error: "LOVABLE_API_KEY não configurada" }, 500);

    const jobAny = job as any;

    const prompt = `Você é um especialista em recrutamento e seleção. Gere 3 propostas de **Case Comportamental** para a etapa final de avaliação de um candidato. Cada proposta em um nível de dificuldade diferente (básico, intermediário, avançado), apropriadas para a vaga abaixo.

IMPORTANTE: são cases COMPORTAMENTAIS, NÃO técnicos. Avaliam como a pessoa age, decide, se comunica e se posiciona diante de situações reais do dia a dia. NÃO peça que o candidato faça cálculos, planilhas, código ou exercícios técnicos. Peça que ele DESCREVA como agiria, raciocinaria e se comunicaria.

## Vaga
- Título: ${job.title}
- Senioridade: ${jobAny.seniority || "não informada"}
- Tipo: ${jobAny.type || "não informado"}
- Modalidade: ${jobAny.work_model || "não informada"}
- Departamento: ${jobAny.department || "não informado"}
- Habilidades requeridas: ${jobAny.required_skills?.join(", ") || "não informadas"}
- Descrição: ${(job.description || "").substring(0, 800)}

## Definição dos níveis (cases comportamentais)

- **Básico** (~20-30 min): Situação cotidiana, baixo risco. Decisão simples mas que exige postura adequada. Foco em atendimento, postura profissional e priorização básica. Adequado para candidato sem experiência prévia.

- **Intermediário** (~30-45 min): Dilema com conflito interpessoal ou ético leve. Exige julgamento e comunicação difícil. Foco em comunicação assertiva, mediação, ética básica e responsabilidade. Adequado para candidato com 6m-1ano de experiência ou júnior entrante.

- **Avançado** (~45-60 min): Conflito complexo com múltiplos stakeholders ou ambiguidade moral. Exige julgamento + comunicação com hierarquia + visão sistêmica. Foco em trade-offs, defesa de posição respeitosa, gestão de pressão. Adequado para júnior experiente ou mid-level.

## Estrutura do case (campo "description")

Cada case deve ter o texto COMPLETO que será enviado ao candidato, no formato:

\`\`\`
SITUAÇÃO: [título curto do cenário]

Contexto
[2-4 linhas situando o cenário e o papel do candidato neste cenário]

A situação
[Descrição detalhada da situação/dilema, escrita em segunda pessoa direta ao candidato. 5-10 linhas com contexto suficiente para uma resposta refletida.]

O que você deve responder
1. Como você lidaria com essa situação? Descreva o passo a passo.
2. Qual o raciocínio por trás de cada decisão?
3. Que cuidados/precauções tomaria? Com quem você consultaria, se for o caso?

Como entregar
- Resposta escrita (Word, Google Docs ou no próprio corpo do e-mail/mensagem)
- Prazo: [recrutador define ao enviar]
- Tamanho sugerido: 1-2 páginas

O que estamos avaliando
- Postura profissional
- Clareza de comunicação
- Tomada de decisão sob ambiguidade
- [dimensão específica do nível: ética / mediação / etc.]

Tempo esperado
Cerca de [X] de reflexão e escrita. Não é prova de velocidade — é avaliação de raciocínio, postura e capacidade de articulação.
\`\`\`

## Instruções

- Cases REALISTAS e contextualizados na área/função da vaga (NÃO genéricos).
- Para DP/RH: situações típicas envolvendo colaboradores, gestores, conflitos no trabalho, ética profissional, comunicação difícil.
- Para Vendas: situações com clientes, metas, conflito interno.
- Para Tech: situações com equipe técnica, prazo apertado, débito técnico, código alheio.
- Linguagem em pt-BR, tom profissional mas humano. Trate o candidato em segunda pessoa direta.
- NÃO peça exercícios técnicos (planilhas, cálculos, código). Peça reflexão escrita.
- Os 3 níveis devem ser PROGRESSIVOS — o avançado tem mais nuances/stakeholders/ambiguidade.

Retorne APENAS um JSON válido (sem markdown), no formato:

{
  "cases": [
    {
      "level": "basico",
      "title": "Título curto (max 8 palavras)",
      "description": "Texto completo do case usando a estrutura acima",
      "evaluates": ["dimensão 1", "dimensão 2", "dimensão 3"],
      "estimated_time": "30-45 minutos"
    },
    {
      "level": "intermediario",
      "title": "...",
      "description": "...",
      "evaluates": [...],
      "estimated_time": "1h-1h30"
    },
    {
      "level": "avancado",
      "title": "...",
      "description": "...",
      "evaluates": [...],
      "estimated_time": "2h-3h"
    }
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
          {
            role: "system",
            content:
              "Você é um especialista em recrutamento e seleção. Gere cases COMPORTAMENTAIS (situações que avaliam postura, decisão, comunicação) — nunca técnicos. Retorne apenas JSON válido sem markdown.",
          },
          { role: "user", content: prompt },
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

    return jsonResp({ cases: parsed.cases });
  } catch (e) {
    console.error("generate-case-suggestions error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
