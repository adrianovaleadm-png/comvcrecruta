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

    const prompt = `Você é um especialista em recrutamento e seleção. Gere 3 propostas de Case prático para a etapa final de avaliação técnica de um candidato. Cada proposta deve estar em um nível de dificuldade diferente (básico, intermediário, avançado), apropriadas para a vaga abaixo.

## Vaga
- Título: ${job.title}
- Senioridade: ${jobAny.seniority || "não informada"}
- Tipo: ${jobAny.type || "não informado"}
- Modalidade: ${jobAny.work_model || "não informada"}
- Departamento: ${jobAny.department || "não informado"}
- Habilidades requeridas: ${jobAny.required_skills?.join(", ") || "não informadas"}
- Descrição: ${(job.description || "").substring(0, 800)}

## Definição dos níveis
- **Básico** (~30-45 min): foco em atitude/atenção a detalhe, sem ferramentas complexas, baixa expertise técnica exigida. Adequado para candidato sem experiência prévia.
- **Intermediário** (~1h-1h30): exige raciocínio estruturado + uma habilidade técnica específica da vaga. Adequado para candidato com 6m-1ano de experiência ou júnior entrante.
- **Avançado** (~2h-3h): integra múltiplas habilidades, exige autonomia, pode envolver uso de ferramenta. Adequado para júnior experiente ou mid-level.

## Estrutura do case (campo "description")
Cada case deve ter o texto COMPLETO que será enviado ao candidato, no formato:

\`\`\`
DESAFIO: [título do case]

Cenário
[contexto realista, 2-4 linhas situando o candidato no problema]

O que você deve entregar
1. [primeiro item esperado, claro]
2. [segundo item]
3. [terceiro item — pode ser síntese, e-mail, recomendação]

Como entregar
- [formato esperado: documento, planilha, etc.]
- Prazo: [recrutador define ao enviar]
- Enviar como resposta a esta mensagem

O que estamos avaliando
- [dimensão 1]
- [dimensão 2]
- [dimensão 3]
- [dimensão 4 opcional]

Tempo esperado
Cerca de [X] de dedicação. Não é prova de velocidade — é avaliação de qualidade e raciocínio.
\`\`\`

## Instruções

- Cases REALISTAS, ligados à rotina da função (não acadêmicos).
- Linguagem em pt-BR, tom profissional mas humano.
- Adapte ao contexto da vaga (área, ferramentas mencionadas, senioridade).
- Os 3 níveis devem ser PROGRESSIVOS — o avançado se baseia/extende habilidades do básico.

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
              "Você é um especialista em recrutamento. Gere cases praticos realistas em pt-BR. Retorne apenas JSON válido sem markdown.",
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
